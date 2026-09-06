import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { AISearchResponse, SearchResultMatch } from '@/types';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'campus_client_ip';
    const rateLimit = checkRateLimit(ip, 10, 60 * 1000); // 10 requests per minute

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please wait ${rateLimit.resetSeconds} seconds before trying another query to preserve AI quota.`,
          resetSeconds: rateLimit.resetSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetSeconds),
          },
        }
      );
    }

    const body = await req.json();
    const { query } = body;
    let { documents = [], pages = [] } = body;

    // Fallback to server canonical documents if not provided in client request body
    if (!documents || documents.length === 0) {
      const { INITIAL_DOCUMENTS, INITIAL_DOCUMENT_PAGES } = await import('@/lib/mockData');
      documents = INITIAL_DOCUMENTS;
      pages = INITIAL_DOCUMENT_PAGES;
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const cleanQuery = query.trim();
    const queryLower = cleanQuery.toLowerCase();
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Filter candidate documents & pages
    const matches: SearchResultMatch[] = [];

    // Keyword & topic scoring
    for (const doc of documents) {
      const docPages = pages.filter((p: { document_id: string }) => p.document_id === doc.id);
      const titleLower = doc.title.toLowerCase();
      const subjectLower = (doc.subject || '').toLowerCase();
      const uploaderName = doc.uploader?.full_name || 'Campus Student';

      // Check pages
      for (const page of docPages) {
        const pageTextLower = (page.content || '').toLowerCase();
        let score = 0;

        // Query terms check
        const queryTerms = queryLower.split(/\s+/).filter((t: string) => t.length > 2);
        for (const term of queryTerms) {
          if (titleLower.includes(term)) score += 3;
          if (subjectLower.includes(term)) score += 2;
          if (pageTextLower.includes(term)) score += 2;
          if (uploaderName.toLowerCase().includes(term)) score += 2;
        }

        // Specific pattern bonuses
        if (queryLower.includes('exp') || queryLower.includes('experiment')) {
          if (doc.type === 'Experiment') score += 5;
        }
        if (queryLower.includes('midsem') && doc.type === 'Midsem Paper') score += 5;
        if (queryLower.includes('assign') && doc.type === 'Assignment') score += 5;
        if ((queryLower.includes('exam') || queryLower.includes('endsem')) && (doc.type === 'End-Sem Exam Paper' || doc.type === 'Midsem Paper')) score += 5;

        // Extract excerpt snippet around matching term
        if (score > 0) {
          let snippet = page.content.substring(0, 180) + '...';
          for (const term of queryTerms) {
            const idx = pageTextLower.indexOf(term);
            if (idx !== -1) {
              const start = Math.max(0, idx - 40);
              const end = Math.min(page.content.length, idx + 120);
              snippet = (start > 0 ? '...' : '') + page.content.substring(start, end) + (end < page.content.length ? '...' : '');
              break;
            }
          }

          matches.push({
            document_id: doc.id,
            document_title: doc.title,
            type: doc.type,
            semester: doc.semester,
            subject: doc.subject,
            uploader_name: uploaderName,
            uploader_avatar: doc.uploader?.avatar_url,
            uploader_id: doc.uploader_id,
            page_number: page.page_number,
            snippet,
            relevance_score: score,
            file_path: doc.file_path,
            file_name: doc.file_name,
          });
        }
      }

      // If document matched title/subject but had no explicit page match, add page 1
      if (docPages.length === 0 && (titleLower.includes(queryLower) || queryLower.split(' ').some((w: string) => w.length > 3 && titleLower.includes(w)))) {
        matches.push({
          document_id: doc.id,
          document_title: doc.title,
          type: doc.type,
          semester: doc.semester,
          subject: doc.subject,
          uploader_name: uploaderName,
          uploader_avatar: doc.uploader?.avatar_url,
          uploader_id: doc.uploader_id,
          page_number: 1,
          snippet: `${doc.title} (${doc.type}, ${doc.semester}) uploaded by ${uploaderName}.`,
          file_path: doc.file_path,
          file_name: doc.file_name,
        });
      }
    }

    // Sort matches by relevance
    matches.sort((a, b) => ((b.relevance_score || 0) - (a.relevance_score || 0)));
    const topMatches = matches.slice(0, 6);

    const systemPrompt = `You are the AI Academic Assistant for "Campus Document Hub", an engineering college resource portal for BTech students.
Your job is to answer the student's request concisely and guide them to the exact document, uploader, and page number matching their query.
If multiple students have uploaded resources on the same topic (e.g. Priya Sharma vs Arjun Mehta), clearly point out both options so the student can pick their preferred notes or lab format.
Return a helpful, crisp 2-4 sentence summary. Always cite the document title, uploader name, and page number.`;

    const userContent = `Student Query: "${cleanQuery}"

Matching Documents Found in Database:
${topMatches.map((m, idx) => `[Option ${idx + 1}]
- Title: ${m.document_title}
- Type: ${m.type} (${m.semester})
- Uploader: ${m.uploader_name}
- Page: ${m.page_number}
- Content snippet: "${m.snippet}"
`).join('\n')}

Synthesize a direct, helpful academic answer.`;

    // Priority 1: Google Gemini API (if key provided)
    if (geminiKey && geminiKey.trim().length > 10 && !geminiKey.includes('your-gemini-key')) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }],
              generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.2,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const answerText =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
            'Here are the matching campus documents found for your search.';

          const responsePayload: AISearchResponse = {
            answer: answerText,
            matches: topMatches,
            query: cleanQuery,
            mode: 'gemini',
            rateLimitRemaining: rateLimit.remaining,
          };

          return NextResponse.json(responsePayload);
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, trying Anthropic or fallback:', geminiErr);
      }
    }

    // Priority 2: Anthropic Claude API (if key provided)
    if (anthropicKey && anthropicKey.trim().length > 10 && !anthropicKey.includes('your-anthropic-key')) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey.trim() });

        const message = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 450,
          temperature: 0.2,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        });

        const textBlock = message.content.find((c) => c.type === 'text');
        const answerText = textBlock ? textBlock.text : 'Here are the matching campus documents found for your search.';

        const responsePayload: AISearchResponse = {
          answer: answerText,
          matches: topMatches,
          query: cleanQuery,
          mode: 'anthropic',
          rateLimitRemaining: rateLimit.remaining,
        };

        return NextResponse.json(responsePayload);
      } catch (anthropicErr) {
        console.warn('Anthropic API request failed, falling back to local synthesis:', anthropicErr);
      }
    }

    // Priority 3: Algorithmic Fallback Synthesis
    let synthesizedAnswer = '';
    if (topMatches.length === 0) {
      synthesizedAnswer = `I couldn't find any documents directly matching "${cleanQuery}". Try searching for specific course codes (e.g., "OS", "DBMS", "CN"), experiment numbers, or document categories like "Midsem Paper" or "Notes".`;
    } else {
      const distinctUploaders = Array.from(new Set(topMatches.map((m) => m.uploader_name)));
      const bestMatch = topMatches[0];

      if (distinctUploaders.length > 1) {
        synthesizedAnswer = `I found matching resources from ${distinctUploaders.length} different contributors for "${cleanQuery}". You can choose between ${distinctUploaders.join(' and ')}. Click any option below to jump directly to the relevant page in the built-in viewer!`;
      } else {
        synthesizedAnswer = `Found "${bestMatch.document_title}" uploaded by ${bestMatch.uploader_name}. The most relevant section begins on Page ${bestMatch.page_number}.`;
      }
    }

    const fallbackPayload: AISearchResponse = {
      answer: synthesizedAnswer,
      matches: topMatches,
      query: cleanQuery,
      mode: 'keyword_fallback',
      rateLimitRemaining: rateLimit.remaining,
    };

    return NextResponse.json(fallbackPayload);
  } catch (error) {
    console.error('AI search route error:', error);
    return NextResponse.json({ error: 'Internal server error processing AI search' }, { status: 500 });
  }
}
