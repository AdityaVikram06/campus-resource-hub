'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DocumentItem } from '@/types';
import { useDocuments } from '@/context/DocumentContext';
import { useToast } from '@/context/ToastContext';
import {
  X,
  Download,
  Share2,
  ExternalLink,
  FileText,
  User,
  AlertCircle,
  Loader2,
  Bookmark,
  RefreshCw,
} from 'lucide-react';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  initialPage?: number;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  initialPage = 1,
  onClose,
}) => {
  const { createDocumentSignedUrl } = useDocuments();
  const { showToast } = useToast();

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);

  // Generate short-lived signed URL whenever doc changes
  useEffect(() => {
    let isCancelled = false;

    async function prepareViewerUrl() {
      if (!doc) return;
      setLoading(true);
      setIframeLoading(true);
      setError(null);

      try {
        // Request short-lived signed URL for Google Docs Viewer
        const url = await createDocumentSignedUrl(doc.file_path, 600);
        if (!isCancelled) {
          setSignedUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to create signed URL for document:', err);
          setError(
            err instanceof Error
              ? err.message
              : 'Could not generate a secure access link for this document.'
          );
          setLoading(false);
        }
      }
    }

    prepareViewerUrl();

    return () => {
      isCancelled = true;
    };
  }, [doc, createDocumentSignedUrl]);

  // Handle keyboard shortcuts (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle document download fallback
  const handleDownload = useCallback(() => {
    if (!signedUrl || !doc) {
      showToast('Document link is still preparing, please wait...', 'info');
      return;
    }
    const a = window.document.createElement('a');
    a.href = signedUrl;
    a.download = doc.file_name || `${doc.title}.pdf`;
    a.target = '_blank';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    showToast(`Downloading ${doc.file_name || doc.title}...`, 'success');
  }, [signedUrl, doc, showToast]);

  // Handle share link
  const handleShare = useCallback(async () => {
    if (!doc) return;
    const shareUrl = `${window.location.origin}/?doc=${doc.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.title,
          text: `Check out ${doc.title} on Campus Resource Hub`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }
    navigator.clipboard.writeText(shareUrl);
    showToast('Link copied to clipboard!', 'success');
  }, [doc, showToast]);

  if (!doc) return null;

  const isBlobOrData = signedUrl ? signedUrl.startsWith('blob:') || signedUrl.startsWith('data:') : false;
  // Use encodeURIComponent on signedUrl when embedding in Google Docs Viewer to preserve token and exp query params
  const viewerUrl = signedUrl
    ? isBlobOrData
      ? signedUrl
      : `https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`
    : '';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#FFFFFF] border border-[#E8E8E3] rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E3] bg-[#FAFAF8] flex-shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-[#60B5FF]/10 text-[#60B5FF] flex items-center justify-center flex-shrink-0 border border-[#60B5FF]/20">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-[#1C1D1F] truncate" title={doc.title}>
                  {doc.title}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3]">
                  {doc.type}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#64666E] border border-[#E8E8E3]">
                  {doc.semester}
                </span>
                {doc.page_count > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#64666E] mt-0.5">
                {doc.uploader?.full_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-[#64666E]" />
                    <span>{doc.uploader.full_name}</span>
                  </span>
                )}
                {doc.subject && (
                  <>
                    <span>•</span>
                    <span className="font-medium">{doc.subject}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Download Fallback Button */}
            <button
              id="viewer-download-btn"
              type="button"
              onClick={handleDownload}
              title="Download original file"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-[#1C1D1F] text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#60B5FF]" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Open in New Window */}
            {signedUrl && (
              <a
                id="viewer-open-external-btn"
                href={viewerUrl || signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new browser tab"
                className="p-1.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-[#64666E] hover:text-[#1C1D1F] transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Share Link */}
            <button
              id="viewer-share-btn"
              type="button"
              onClick={handleShare}
              title="Share document link"
              className="p-1.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-[#64666E] hover:text-[#1C1D1F] transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              id="viewer-close-btn"
              type="button"
              onClick={onClose}
              title="Close viewer (Esc)"
              className="p-1.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-[#64666E] hover:text-[#1C1D1F] transition-all cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Match Context Callout (if opened at a specific page) */}
        {initialPage > 1 && (
          <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 flex items-center justify-between gap-3 text-xs text-sky-900">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <span className="font-semibold">
                Match found on Page {initialPage}
              </span>
              <span className="text-sky-700 hidden sm:inline">
                — Google Docs Viewer opens at page 1; please scroll to page {initialPage} below to view the match.
              </span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-800">
              Page {initialPage} of {doc.page_count || '?'}
            </span>
          </div>
        )}

        {/* Fallback & Reliability Status Bar */}
        <div className="bg-amber-50/70 border-b border-amber-200/60 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-900 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>
              Preview powered by {isBlobOrData ? 'Integrated Viewer' : 'Google Docs Viewer'}. If loading is slow or fails, use the{' '}
              <button
                type="button"
                onClick={handleDownload}
                className="font-bold underline text-amber-950 hover:text-amber-800 cursor-pointer"
              >
                Download
              </button>{' '}
              button.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className="flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 font-bold cursor-pointer"
            title="Reload preview"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reload Preview</span>
          </button>
        </div>

        {/* Viewer Content Area */}
        <div className="flex-1 relative bg-slate-100 overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-3">
              <Loader2 className="w-8 h-8 text-[#60B5FF] animate-spin" />
              <p className="text-xs font-bold text-[#64666E]">
                Generating secure access link...
              </p>
            </div>
          )}

          {error && (
            <div className="p-6 max-w-md text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#1C1D1F]">Preview Unavailable</h4>
              <p className="text-xs text-[#64666E]">{error}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#60B5FF] text-white font-bold text-xs shadow-xs hover:bg-[#4ea5ef] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Document File</span>
              </button>
            </div>
          )}

          {!loading && !error && viewerUrl && (
            <div className="w-full h-full relative">
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 gap-2">
                  <Loader2 className="w-7 h-7 text-[#60B5FF] animate-spin" />
                  <p className="text-xs font-semibold text-[#64666E]">
                    {isBlobOrData
                      ? 'Loading document preview...'
                      : 'Loading document in Google Docs Viewer...'}
                  </p>
                </div>
              )}
              <iframe
                key={iframeKey}
                id="google-docs-viewer-frame"
                src={viewerUrl}
                title={doc.title}
                className="w-full h-full border-0"
                onLoad={() => setIframeLoading(false)}
                onError={() => {
                  setIframeLoading(false);
                  setError(
                    isBlobOrData
                      ? 'Unable to preview this file in browser. Please use the Download button.'
                      : 'Google Docs Viewer was unable to embed this file. Please use the Download button.'
                  );
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
