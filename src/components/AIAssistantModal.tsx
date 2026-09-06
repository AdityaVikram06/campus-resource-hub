'use client';

import React, { useState } from 'react';
import { DocumentItem, SearchResultMatch, AISearchResponse } from '@/types';
import { useDocuments } from '@/context/DocumentContext';
import {
  Sparkles,
  X,
  Search,
  BookOpen,
  ArrowRight,
  AlertTriangle,
  Loader2,
  FileText,
  User,
  ExternalLink,
} from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (doc: DocumentItem, pageNumber: number) => void;
}

const QUICK_PROMPTS = [
  'I want Experiment 5 of OS',
  'Find DBMS midsem paper solutions',
  'Subnetting and CIDR Assignment 2',
  'Complete notes on AVL and Red-Black trees',
];

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
}) => {
  const { documents, pages } = useDocuments();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [matches, setMatches] = useState<SearchResultMatch[]>([]);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [mode, setMode] = useState<'anthropic' | 'gemini' | 'keyword_fallback' | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (searchQueryText?: string) => {
    const q = searchQueryText || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    setRateLimitWarning(null);

    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          documents,
          pages,
        }),
      });

      if (res.status === 429) {
        const errorData = await res.json();
        setRateLimitWarning(
          errorData.error || 'Rate limit reached: Please wait a moment before sending more AI queries.'
        );
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error('AI Search request failed');
      }

      const data: AISearchResponse = await res.json();
      setAnswer(data.answer);
      setMatches(data.matches || []);
      setMode(data.mode);
    } catch (err) {
      console.error('AI search error:', err);
      setAnswer(
        'Could not reach AI assistant service. Please check your connection or retry in a few moments.'
      );
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPage = (match: SearchResultMatch) => {
    const targetDoc = documents.find((d) => d.id === match.document_id);
    if (targetDoc) {
      onSelectDocument(targetDoc, match.page_number);
      onClose();
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'Notes':
        return 'bg-[#FFE588] text-[#1C1D1F] border-[#FFE588]';
      case 'Assignment':
        return 'bg-[#F79D65] text-[#FFFFFF] border-[#F79D65]';
      case 'Midsem Paper':
        return 'bg-[#F79D65] text-[#FFFFFF] border-[#F79D65]';
      case 'Experiment':
        return 'bg-[#5EF2D5] text-[#1C1D1F] border-[#5EF2D5]';
      case 'End-Sem Exam Paper':
        return 'bg-[#F35252] text-[#FFFFFF] border-[#F35252]';
      default:
        return 'bg-[#FAFAF8] text-[#1C1D1F] border-[#E8E8E3]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1D1F]/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] rounded-3xl shadow-2xl border border-[#E8E8E3] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E3] bg-[#FFFFFF]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#60B5FF] text-[#FFFFFF] flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-[#FFFFFF] animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1C1D1F] flex items-center gap-2">
                Campus AI Assistant
                {mode === 'gemini' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3]">
                    Gemini 3.6 Flash
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#64666E] font-semibold">
                Natural-language document retrieval with exact page references
              </p>
            </div>
          </div>
          <button
            id="ai-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-[#64666E] hover:text-[#1C1D1F] hover:bg-[#FAFAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Query Input Section */}
        <div className="p-6 border-b border-[#E8E8E3] bg-[#FAFAF8]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative"
          >
            <input
              id="ai-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. I want Experiment 5 of OS"
              className="w-full pl-11 pr-28 py-3 rounded-2xl border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#60B5FF] transition-all placeholder:text-[#64666E] shadow-xs"
            />
            <Search className="w-5 h-5 text-[#64666E] absolute left-3.5 top-3.5" />
            
            <button
              id="ai-search-submit-btn"
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 px-4 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>Ask AI</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Prompts */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#64666E] mr-1">Try:</span>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setQuery(prompt);
                  handleSearch(prompt);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#FFFFFF] text-[#1C1D1F] font-semibold border border-[#E8E8E3] hover:bg-[#FAFAF8] hover:border-[#60B5FF] transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Rate Limit Alert */}
          {rateLimitWarning && (
            <div className="mt-3 p-3 rounded-xl bg-[#F79D65]/10 border border-[#F79D65]/30 flex items-start gap-2 text-xs text-[#F79D65] font-bold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#F79D65]" />
              <span>{rateLimitWarning}</span>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FFFFFF]">
          {loading ? (
            <div className="py-12 text-center flex flex-col items-center gap-3 text-[#60B5FF]">
              <div className="w-12 h-12 rounded-2xl bg-[#FAFAF8] flex items-center justify-center text-[#60B5FF] border border-[#E8E8E3]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-sm font-bold text-[#1C1D1F]">
                Scanning extracted pages & analyzing academic sources...
              </p>
              <p className="text-xs text-[#64666E] font-medium">
                Cross-referencing uploaders, course topics, and page snippets
              </p>
            </div>
          ) : answer ? (
            <div className="space-y-4">
              
              {/* AI Synthesized Answer Card */}
              <div className="p-4 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E3]">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#60B5FF]">
                  <Sparkles className="w-4 h-4 text-[#60B5FF]" />
                  <span>Campus AI Synthesis</span>
                </div>
                <p className="text-xs sm:text-sm text-[#1C1D1F] font-medium leading-relaxed whitespace-pre-line">
                  {answer}
                </p>
              </div>

              {/* Matched Documents List */}
              {matches.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#64666E] mb-2.5">
                    Matching Upload Options ({matches.length})
                  </h4>
                  
                  <div className="space-y-2.5">
                    {matches.map((match, idx) => (
                      <div
                        key={`${match.document_id}_${match.page_number}_${idx}`}
                        className="p-3.5 rounded-2xl border border-[#E8E8E3] hover:border-[#60B5FF] bg-[#FFFFFF] transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-[#1C1D1F]">
                              {match.document_title}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTypeBadgeStyle(match.type)}`}>
                              {match.type}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3]">
                              Page {match.page_number}
                            </span>
                          </div>

                          {/* Uploader Distinction */}
                          <div className="flex items-center gap-2 text-xs text-[#64666E]">
                            <span className="flex items-center gap-1 font-bold text-[#1C1D1F]">
                              <User className="w-3.5 h-3.5 text-[#64666E]" />
                              Contributed by: <strong className="text-[#1C1D1F] ml-0.5">{match.uploader_name}</strong>
                            </span>
                            <span>•</span>
                            <span className="font-medium">{match.semester}</span>
                          </div>

                          {/* Snippet Excerpt */}
                          <p className="text-xs text-[#1C1D1F] bg-[#FAFAF8] p-2 rounded-xl italic font-mono text-[11px] line-clamp-2 border border-[#E8E8E3]">
                            {match.snippet}
                          </p>
                        </div>

                        {/* Open Document Action Button with Page Callout */}
                        <div className="flex flex-col sm:items-end gap-1.5 flex-shrink-0">
                          <span className="text-[11px] font-semibold text-[#64666E]">
                            Match found on <strong className="text-[#1C1D1F]">page {match.page_number}</strong>
                          </span>
                          <button
                            id={`ai-open-match-${idx}-btn`}
                            onClick={() => handleOpenPage(match)}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#60B5FF] text-[#FFFFFF] hover:bg-[#4ea5ef] transition-all cursor-pointer shadow-xs"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Open Document</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-[#64666E]">
              <FileText className="w-10 h-10 mx-auto mb-2 text-[#64666E]" />
              <p className="text-xs font-semibold text-[#64666E]">
                Ask anything like &quot;I want Experiment 5 of OS&quot; or &quot;Show me solved questions for DBMS midsem&quot;.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
