'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DocumentItem } from '@/types';
import { useDocuments } from '@/context/DocumentContext';
import { useToast } from '@/context/ToastContext';
import {
  X,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Calendar,
  User,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  initialPage?: number;
  onClose: () => void;
}

// Load pdf.js dynamically from CDN
function loadPdfJsFromCdn(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window not available'));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).pdfjsLib) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return resolve((window as any).pdfjsLib);
    }

    const script = window.document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(lib);
      } else {
        reject(new Error('pdfjsLib not defined after script load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF viewer engine'));
    window.document.head.appendChild(script);
  });
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  initialPage = 1,
  onClose,
}) => {
  const { getDocumentPdfUrl } = useDocuments();
  const { showToast } = useToast();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // PDF page state
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(doc?.page_count || 1);
  const [scale, setScale] = useState<number>(1.2);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const touchStartX = useRef<number>(0);

  const handleShareLink = () => {
    if (!doc) return;
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}/?doc=${doc.id}&page=${currentPage}`;
      navigator.clipboard.writeText(shareUrl);
      showToast(`Link to Page ${currentPage} copied!`, 'success');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    if (diffX > 60) {
      // swipe right -> previous page
      setCurrentPage((p) => Math.max(1, p - 1));
    } else if (diffX < -60) {
      // swipe left -> next page
      setCurrentPage((p) => Math.min(numPages, p + 1));
    }
  };

  // Sync initialPage if it changes
  useEffect(() => {
    if (initialPage && initialPage > 0) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  // Load document URL
  useEffect(() => {
    if (!doc) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getDocumentPdfUrl(doc)
      .then((url) => {
        if (isMounted) {
          setPdfUrl(url);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError('Failed to load document: ' + (err?.message || 'Unknown error'));
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [doc, getDocumentPdfUrl]);

  // Render PDF using pdfjs
  const renderPage = useCallback(
    async (pageNumber: number, pdfDocument: any) => {
      if (!canvasRef.current || !pdfDocument) return;

      try {
        setRenderingPage(true);

        if (renderTaskRef.current && typeof renderTaskRef.current.cancel === 'function') {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          transform: transform || undefined,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        setRenderingPage(false);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error('PDF Page render error:', err);
        }
        setRenderingPage(false);
      }
    },
    [scale]
  );

  // Initialize PDF.js Document
  useEffect(() => {
    if (!pdfUrl) return;

    let isMounted = true;

    async function initPdf() {
      try {
        const pdfjsLib = await loadPdfJsFromCdn();
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const loadedDoc = await loadingTask.promise;

        if (!isMounted) return;

        pdfDocRef.current = loadedDoc;
        setNumPages(loadedDoc.numPages);
        setLoading(false);

        const targetPage = Math.min(Math.max(1, initialPage), loadedDoc.numPages);
        setCurrentPage(targetPage);
        renderPage(targetPage, loadedDoc);
      } catch (err: unknown) {
        console.warn('PDF.js canvas rendering failed, enabling preview fallback:', err);
        if (isMounted) {
          setUseIframeFallback(true);
          setLoading(false);
        }
      }
    }

    initPdf();

    return () => {
      isMounted = false;
    };
  }, [pdfUrl, initialPage, renderPage]);

  // Re-render when page or scale changes
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(currentPage, pdfDocRef.current);
    }
  }, [currentPage, scale, renderPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((p) => Math.min(numPages, p + 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, onClose]);

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

  if (!doc) return null;

  const isNonPdf = doc.file_type && !doc.file_type.includes('pdf');

  // Direct download handler
  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = window.document.createElement('a');
    link.href = pdfUrl;
    link.download = doc.file_name || `${doc.title}.pdf`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1D1F]/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] bg-[#FFFFFF] rounded-2xl shadow-2xl border border-[#E8E8E3] flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#E8E8E3] bg-[#FFFFFF] flex-shrink-0">
          
          <div className="flex items-center gap-3 overflow-hidden mr-4">
            <div className="w-8 h-8 rounded-lg bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3] flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-[#60B5FF]" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#1C1D1F] truncate">
                  {doc.title}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTypeBadgeStyle(doc.type)}`}>
                  {doc.type}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#64666E] border border-[#E8E8E3]">
                  {doc.semester}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#64666E] mt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <User className="w-3 h-3 text-[#64666E]" />
                  Uploaded by <strong className="text-[#1C1D1F] ml-0.5">{doc.uploader?.full_name || 'Student'}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#64666E]" />
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share / Copy Direct Link Button */}
            <button
              id="viewer-share-btn"
              onClick={handleShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-[#1C1D1F] shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Copy Direct Link to this Document"
            >
              <Share2 className="w-3.5 h-3.5 text-[#64666E]" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Download Button */}
            <button
              id="viewer-download-btn"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Close Button */}
            <button
              id="viewer-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#64666E] hover:text-[#1C1D1F] hover:bg-[#FAFAF8] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Controls (Page Nav & Zoom) */}
        {!isNonPdf && !useIframeFallback && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8E8E3] bg-[#FAFAF8] text-xs text-[#1C1D1F] font-semibold flex-shrink-0">
            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                id="viewer-prev-page-btn"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] disabled:opacity-40 cursor-pointer text-[#1C1D1F]"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4 text-[#1C1D1F]" />
              </button>
              <span className="font-mono text-xs font-bold text-[#1C1D1F]">
                Page {currentPage} of {numPages}
              </span>
              <button
                id="viewer-next-page-btn"
                disabled={currentPage >= numPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] disabled:opacity-40 cursor-pointer text-[#1C1D1F]"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4 text-[#1C1D1F]" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                id="viewer-zoom-out-btn"
                onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
                className="p-1.5 rounded-lg border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] cursor-pointer text-[#1C1D1F]"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-[#1C1D1F]" />
              </button>
              <span className="w-12 text-center font-mono text-[11px] font-bold text-[#1C1D1F]">
                {Math.round(scale * 100)}%
              </span>
              <button
                id="viewer-zoom-in-btn"
                onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                className="p-1.5 rounded-lg border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] cursor-pointer text-[#1C1D1F]"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-[#1C1D1F]" />
              </button>
              <button
                id="viewer-fit-width-btn"
                onClick={() => setScale(1.0)}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] cursor-pointer text-[11px] font-bold text-[#1C1D1F]"
              >
                <Maximize2 className="w-3 h-3 text-[#1C1D1F]" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}

        {/* Viewer Viewport (with touch swipe gesture support) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-auto bg-[#FAFAF8] p-4 flex items-center justify-center relative touch-pan-y"
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-[#60B5FF]">
              <Loader2 className="w-8 h-8 animate-spin text-[#60B5FF]" />
              <p className="text-xs font-bold text-[#1C1D1F]">Loading document viewer...</p>
            </div>
          ) : isNonPdf ? (
            /* Non-PDF Fallback Card */
            <div className="max-w-md w-full bg-[#FFFFFF] p-6 rounded-2xl border border-[#E8E8E3] text-center shadow-md">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3] flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-[#60B5FF]" />
              </div>
              <h4 className="text-base font-bold text-[#1C1D1F] mb-1">
                {doc.file_name}
              </h4>
              <p className="text-xs text-[#64666E] mb-4 font-medium">
                This document is in <strong>{doc.file_type || 'legacy'}</strong> format. Download to open in your native viewer.
              </p>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Document</span>
              </button>
            </div>
          ) : useIframeFallback && pdfUrl ? (
            /* Native Browser PDF Embed Fallback */
            <iframe
              src={`${pdfUrl}#page=${currentPage}`}
              className="w-full h-full rounded-lg border border-[#E8E8E3] bg-[#FFFFFF]"
              title={doc.title}
            />
          ) : error ? (
            /* Error Card */
            <div className="max-w-md w-full bg-[#FFFFFF] p-6 rounded-2xl border border-[#F35252]/30 text-center shadow-md">
              <AlertCircle className="w-10 h-10 text-[#F35252] mx-auto mb-3" />
              <p className="text-xs text-[#F35252] mb-4 font-bold">{error}</p>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 mx-auto py-2 px-4 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download File Directly</span>
              </button>
            </div>
          ) : (
            /* Canvas PDF Renderer */
            <div className="relative shadow-md rounded-lg overflow-hidden bg-[#FFFFFF] border border-[#E8E8E3]">
              {renderingPage && (
                <div className="absolute inset-0 bg-[#FFFFFF]/70 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[#60B5FF]" />
                </div>
              )}
              <canvas ref={canvasRef} className="block mx-auto" />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#FFFFFF] border-t border-[#E8E8E3] text-[11px] text-[#64666E] font-semibold flex items-center justify-between flex-shrink-0">
          <span>Campus Document Hub • Verified Academic Stream</span>
          <span>Size: {(doc.file_size / (1024 * 1024)).toFixed(2)} MB</span>
        </div>
      </div>
    </div>
  );
};
