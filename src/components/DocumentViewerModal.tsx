'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DocumentItem } from '@/types';
import { useDocuments } from '@/context/DocumentContext';
import { useToast } from '@/context/ToastContext';
import {
  X,
  Download,
  Share2,
  FileText,
  User,
  AlertCircle,
  Loader2,
  Bookmark,
  ExternalLink,
} from 'lucide-react';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  initialPage?: number;
  onClose: () => void;
}

interface AdobeDCViewInstance {
  previewFile: (
    fileConfig: {
      content: { location: { url: string } };
      metaData: { fileName: string };
    },
    viewerConfig: Record<string, unknown>
  ) => Promise<AdobeViewerInstance>;
}

interface AdobeViewerInstance {
  getAPIs?: () => Promise<{
    gotoLocation?: (pageNumber: number) => void;
  }>;
}

declare global {
  interface Window {
    AdobeDC?: {
      View: new (config: { clientId: string; divId: string }) => AdobeDCViewInstance;
    };
    adobe_dc_view_sdk?: unknown;
  }
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
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState<boolean>(
    () => typeof window !== 'undefined' && Boolean(window.AdobeDC)
  );

  const containerId = 'adobe-pdf-view-container';
  const adobeViewerRef = useRef<AdobeViewerInstance | null>(null);

  // Determine viewer engine based on file format
  const rawExt = (doc?.file_name.split('.').pop() || doc?.file_type || '').toLowerCase();
  const isOfficeDoc = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(rawExt);
  const isPdf = !isOfficeDoc;

  // Load Adobe PDF Embed API script dynamically only for PDF documents
  useEffect(() => {
    if (typeof window === 'undefined' || !isPdf) return;

    if (window.AdobeDC) {
      setSdkReady(true);
      return;
    }

    const handleSdkReady = () => {
      setSdkReady(true);
    };

    document.addEventListener('adobe_dc_view_sdk.ready', handleSdkReady, { once: true });

    const existingScript = document.getElementById('adobe-pdf-embed-sdk');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'adobe-pdf-embed-sdk';
      script.src = 'https://acrobatservices.adobe.com/view-sdk/viewer.js';
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      document.removeEventListener('adobe_dc_view_sdk.ready', handleSdkReady);
    };
  }, [isPdf]);

  /**
   * "Generate Fresh, Never Store" Pattern:
   * Generate a fresh signed URL from Backblaze B2 the moment DocumentViewerModal opens,
   * authenticated against the user's session (1800s / 30 minutes expiry).
   */
  useEffect(() => {
    let isCancelled = false;

    async function prepareViewerUrl() {
      if (!doc) return;
      setLoading(true);
      setError(null);

      try {
        const freshUrl = await createDocumentSignedUrl(doc.file_path, 1800);
        if (!isCancelled) {
          setSignedUrl(freshUrl);
          // For office docs, iframe onLoad will turn off loading
          // For PDFs, previewPromise.then will turn off loading
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to create fresh signed URL for document:', err);
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

  // Initialize Adobe PDF Embed API viewer for PDF documents
  useEffect(() => {
    if (!isPdf || !sdkReady || !signedUrl || !doc) return;

    const clientId =
      process.env.NEXT_PUBLIC_ADOBE_PDF_EMBED_CLIENT_ID ||
      process.env.NEXT_PUBLIC_ADOBE_CLIENT_ID;

    if (!clientId) {
      console.error('Adobe PDF Embed API Client ID is not configured (NEXT_PUBLIC_ADOBE_PDF_EMBED_CLIENT_ID).');
      setError('Adobe PDF Embed API Client ID is not configured. You can download the PDF directly.');
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    // Reset container contents
    container.innerHTML = '';

    try {
      if (!window.AdobeDC) return;

      const adobeDCView = new window.AdobeDC.View({
        clientId,
        divId: containerId,
      });

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      const previewPromise = adobeDCView.previewFile(
        {
          content: { location: { url: signedUrl } },
          metaData: { fileName: doc.file_name || `${doc.title}.pdf` },
        },
        {
          embedMode: 'FULL_WINDOW',
          defaultViewMode: 'FIT_WIDTH',
          showAnnotationTools: false,
          showLeftHandPanel: !isMobile,
          showDownloadPDF: true,
          showPrintPDF: true,
          showPageControls: true,
        }
      );

      previewPromise
        .then((viewer: AdobeViewerInstance) => {
          setLoading(false);
          adobeViewerRef.current = viewer;
          if (initialPage > 1 && viewer.getAPIs) {
            viewer.getAPIs().then((apis) => {
              if (apis && typeof apis.gotoLocation === 'function') {
                apis.gotoLocation(initialPage);
              }
            });
          }
        })
        .catch((renderErr: unknown) => {
          setLoading(false);
          console.error('Adobe PDF Embed API previewFile error:', renderErr);
          setError('Adobe PDF Embed API was unable to render the document. You can download the PDF directly.');
        });
    } catch (viewInitErr: unknown) {
      setLoading(false);
      console.error('Failed to initialize AdobeDC.View:', viewInitErr);
      setTimeout(() => {
        setError('Could not initialize Adobe PDF Embed Viewer.');
      }, 0);
    }
  }, [isPdf, sdkReady, signedUrl, doc, initialPage]);

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

  // Handle document download (works for both PDF and Office formats)
  const handleDownload = useCallback(() => {
    if (!signedUrl || !doc) {
      showToast('Document link is still preparing, please wait...', 'info');
      return;
    }
    const a = window.document.createElement('a');
    a.href = signedUrl;
    a.download = doc.file_name || `${doc.title}.${rawExt || 'pdf'}`;
    a.target = '_blank';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    showToast(`Downloading ${doc.file_name || doc.title}...`, 'success');
  }, [signedUrl, doc, rawExt, showToast]);

  // Handle share link
  const handleShare = useCallback(async () => {
    if (!doc) return;
    const shareUrl = `${window.location.origin}/?doc=${doc.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.title,
          text: `Check out "${doc.title}" on Campus Document Hub:`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Document link copied to clipboard!', 'success');
    }
  }, [doc, showToast]);

  if (!doc) return null;

  return (
    <div
      id="document-viewer-modal-backdrop"
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
                {isOfficeDoc ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                    <ExternalLink className="w-2.5 h-2.5" />
                    Microsoft Office Online
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                    Adobe PDF Embed
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
                <span>•</span>
                <span className="uppercase font-mono text-[10px]">Format: {rawExt || doc.file_type || 'PDF'}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Download Button (Visible for both viewer types) */}
            <button
              id="viewer-download-btn"
              type="button"
              onClick={handleDownload}
              title={`Download original ${rawExt.toUpperCase()} file`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-[#1C1D1F] text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#60B5FF]" />
              <span className="hidden sm:inline">Download</span>
            </button>

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

            {/* Open in Dedicated Tab (Secondary Opt-in Action) */}
            <a
              id="viewer-new-tab-btn"
              href={`/view/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open full page in new tab"
              className="p-1.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-[#64666E] hover:text-[#60B5FF] transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

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

        {/* AI Match Context Callout (if opened at a specific page for PDFs) */}
        {isPdf && initialPage > 1 && (
          <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 flex items-center justify-between gap-3 text-xs text-sky-900">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <span className="font-semibold">
                Match found on Page {initialPage}
              </span>
              <span className="text-sky-700 hidden sm:inline">
                — Document viewer opened directly at relevant page.
              </span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-800">
              Page {initialPage} of {doc.page_count || '?'}
            </span>
          </div>
        )}

        {/* Viewer Content Area */}
        <div className="flex-1 relative bg-slate-100 overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-3">
              <Loader2 className="w-8 h-8 text-[#60B5FF] animate-spin" />
              <p className="text-xs font-bold text-[#64666E]">
                Preparing secure document preview...
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
                <span>Download {rawExt.toUpperCase()} File</span>
              </button>
            </div>
          )}

          {/* Branch 1: Microsoft Office Online Viewer for Office documents (docx, pptx, xlsx) */}
          {isOfficeDoc && signedUrl && !error && (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`}
              width="100%"
              height="100%"
              frameBorder="0"
              className="w-full h-full border-0 bg-white"
              title={doc.title}
              onLoad={() => setLoading(false)}
            />
          )}

          {/* Branch 2: Adobe PDF Embed API for PDF documents */}
          {isPdf && !error && (
            <div
              id={containerId}
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
