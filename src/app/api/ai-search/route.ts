import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { AISearchResponse, SearchResultMatch, DocumentItem, DocumentPage } from '@/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check (10 requests per minute per IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'campus_client_ip';
    const rateLimit = checkRateLimit(ip, 10, 60 * 1000);

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

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const cleanQuery = query.trim();
    const queryLower = cleanQuery.toLowerCase();
    const geminiKey = process.env.GEMINI_API_KEY;

    // Server-side check for Gemini API key
    if (!geminiKey || geminiKey.trim().length === 0 || geminiKey.includes('your-gemini-key')) {
      return NextResponse.json(
        { error: 'Gemini AI API key is not configured on the server. Please set GEMINI_API_KEY in .env.local.' },
        { status: 500 }
      );
    }

    // If documents are not provided in the request body, load them directly from Supabase
    if ((!documents || documents.length === 0) && isSupabaseConfigured && supabase) {
      try {
        const { data: dbDocs } = await supabase
          .from('documents')
          .select('*, uploader:profiles(*)');
        const { data: dbPages } = await supabase
          .from('document_pages')
          .select('*');

        documents = (dbDocs || []) as DocumentItem[];
        pages = (dbPages || []) as DocumentPage[];
      } catch (dbErr) {
        console.warn('Could not query Supabase for documents in AI search route:', dbErr);
      }
    }

    // If there are still no documents in the database, return early with a clear message
    if (!documents || documents.length === 0) {
      const emptyPayload: AISearchResponse = {
        answer: `No campus documents have been uploaded to the archive yet. Once students upload lecture notes, assignments, or exam papers, the AI Assistant will index their pages for instant retrieval.`,
        matches: [],
        query: cleanQuery,
        mode: 'gemini',
        rateLimitRemaining: rateLimit.remaining,
      };
      return NextResponse.json(emptyPayload);
    }

    // Filter candidate documents & pages
    const matches: SearchResultMatch[] = [];

    // Keyword & topic scoring
    for (const doc of documents as DocumentItem[]) {
      const docPages = (pages as DocumentPage[]).filter((p) => p.document_id === doc.id);
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

        // Specific category pattern bonuses
        if (queryLower.includes('exp') || queryLower.includes('experiment')) {
          if (doc.type === 'Experiment') score += 5;
        }
        if (queryLower.includes('midsem') && doc.type === 'Midsem Paper') score += 5;
        if (queryLower.includes('assign') && doc.type === 'Assignment') score += 5;
        if (
          (queryLower.includes('exam') || queryLower.includes('endsem')) &&
          (doc.type === 'End-Sem Exam Paper' || doc.type === 'Midsem Paper')
        ) {
          score += 5;
        }

        // Extract excerpt snippet around matching term
        if (score > 0) {
          let snippet = page.content.substring(0, 180) + '...';
          for (const term of queryTerms) {
            const idx = pageTextLower.indexOf(term);
            if (idx !== -1) {
              const start = Math.max(0, idx - 40);
              const end = Math.min(page.content.length, idx + 120);
              snippet =
                (start > 0 ? '...' : '') +
                page.content.substring(start, end) +
                (end < page.content.length ? '...' : '');
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
      if (
        docPages.length === 0 &&
        (titleLower.includes(queryLower) ||
          queryLower.split(' ').some((w: string) => w.length > 3 && titleLower.includes(w)))
      ) {
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
    matches.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    const topMatches = matches.slice(0, 6);

    const systemPrompt = `You are the AI Academic Assistant for "Campus Document Hub", an engineering college resource portal for BTech students.
Your job is to answer the student's request concisely and guide them to the exact document, uploader, and page number matching their query.
If multiple students have uploaded resources on the same topic, clearly mention the options so the student can pick their preferred notes or format.
Return a helpful, crisp 2-4 sentence summary. Always cite the document title, uploader name, and page number.`;

    const userContent = `Student Query: "${cleanQuery}"

Matching Documents Found in Database:
${topMatches
  .map(
    (m, idx) => `[Option ${idx + 1}]
- Title: ${m.document_title}
- Type: ${m.type} (${m.semester})
- Uploader: ${m.uploader_name}
- Page: ${m.page_number}
- Content snippet: "${m.snippet}"`
  )
  .join('\n\n')}

Synthesize a direct, helpful academic answer.`;

    // Google Gemini API call
    try {
      const genAI = new GoogleGenerativeAI(geminiKey.trim());
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.2,
        },
      });

      const result = await model.generateContent(userContent);
      const answerText =
        result.response.text() || 'Here are the matching campus documents found for your search.';

      const responsePayload: AISearchResponse = {
        answer: answerText,
        matches: topMatches,
        query: cleanQuery,
        mode: 'gemini',
        rateLimitRemaining: rateLimit.remaining,
      };

      return NextResponse.json(responsePayload);
    } catch (geminiErr: unknown) {
      // Log the exact error response (status code, body, details) from the Gemini SDK call
      const errObj = geminiErr as Record<string, unknown> | null;
      const respObj = errObj?.response as Record<string, unknown> | undefined;
      const statusCode = errObj?.status || errObj?.statusCode || respObj?.status || 'Unknown Status';
      const errorBody = errObj?.errorDetails || respObj?.data || (geminiErr instanceof Error ? geminiErr.message : String(geminiErr));
      
      console.error('[Gemini API SDK Error]', {
        statusCode,
        errorBody,
        message: geminiErr instanceof Error ? geminiErr.message : String(geminiErr),
        stack: geminiErr instanceof Error ? geminiErr.stack : undefined,
      });

      // Algorithmic Fallback Synthesis if Gemini API request fails
      let synthesizedAnswer = '';
      if (topMatches.length === 0) {
        synthesizedAnswer = `I couldn't find any documents directly matching "${cleanQuery}". Try searching for specific course codes, experiment names, or document categories like "Midsem Paper" or "Notes".`;
      } else {
        const distinctUploaders = Array.from(new Set(topMatches.map((m) => m.uploader_name)));
        const bestMatch = topMatches[0];

        if (distinctUploaders.length > 1) {
          synthesizedAnswer = `I found matching resources from ${distinctUploaders.length} contributors for "${cleanQuery}". You can choose between ${distinctUploaders.join(' and ')}. Click any option below to jump directly to the relevant page in the built-in viewer!`;
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
    }
  } catch (error) {
    console.error('AI search route error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing AI search' },
      { status: 500 }
    );
  }
}
