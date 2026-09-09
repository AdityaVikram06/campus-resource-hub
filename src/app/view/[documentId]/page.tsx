'use client';

import React, { use, useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { DocumentItem, fromDbDocumentType } from '@/types';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeft,
  Download,
  Share2,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
  User,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ documentId: string }>;
}

export default function DocumentViewPage({ params }: PageProps) {
  const { documentId } = use(params);
  const { showToast } = useToast();

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState<boolean>(
    () => typeof window !== 'undefined' && Boolean(window.AdobeDC)
  );

  const containerId = 'adobe-full-page-container';
  const adobeViewerRef = useRef<any>(null);

  // Determine file type
  const rawExt = (document?.file_name?.split('.').pop() || document?.file_type || '').toLowerCase();
  const isOfficeDoc = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(rawExt);
  const isPdf = !isOfficeDoc;

  // 1. Fetch document metadata and generate fresh B2 signed view URL
  useEffect(() => {
    let isCancelled = false;

    async function loadDocument() {
      setLoading(true);
      setError(null);

      try {
        if (!supabase) {
          throw new Error('Supabase client is not configured.');
        }

        // Fetch document metadata
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('*, uploader:profiles(*)')
          .eq('id', documentId)
          .maybeSingle();

        if (docError || !docData) {
          throw new Error(docError?.message || 'Document not found.');
        }

        const normalized: DocumentItem = {
          ...docData,
          type: fromDbDocumentType(docData.type),
        };

        if (isCancelled) return;
        setDocument(normalized);

        // Fetch fresh B2 presigned signed URL
        const res = await fetch(
          `/api/documents/view-url?key=${encodeURIComponent(normalized.file_path)}&expiresIn=1800`
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to generate secure view URL.');
        }

        const data = await res.json();
        if (isCancelled) return;

        if (data.viewUrl) {
          setSignedUrl(data.viewUrl);
        } else {
          throw new Error('No view URL returned from server.');
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        console.error('Error loading document in full-page viewer:', err);
        setError(err instanceof Error ? err.message : 'Could not load document preview.');
        setLoading(false);
      }
    }

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [documentId]);

  // 2. Load Adobe PDF Embed SDK dynamically for PDF files
  useEffect(() => {
    if (typeof window === 'undefined' || !isPdf) return;

    if (window.AdobeDC) {
      setSdkReady(true);
      return;
    }

    const handleSdkReady = () => {
      setSdkReady(true);
    };

    window.document.addEventListener('adobe_dc_view_sdk.ready', handleSdkReady, { once: true });

    const existingScript = window.document.getElementById('adobe-pdf-embed-sdk');
    if (!existingScript) {
      const script = window.document.createElement('script');
      script.id = 'adobe-pdf-embed-sdk';
      script.src = 'https://acrobatservices.adobe.com/view-sdk/viewer.js';
      script.async = true;
      window.document.head.appendChild(script);
    }

    return () => {
      window.document.removeEventListener('adobe_dc_view_sdk.ready', handleSdkReady);
    };
  }, [isPdf]);

  // 3. Initialize Adobe PDF Embed API viewer for PDF files
  // IDENTICAL configuration to modal: FULL_WINDOW + defaultViewMode: "FIT_WIDTH" (vertical portrait scroll)
  useEffect(() => {
    if (!isPdf || !sdkReady || !signedUrl || !document) return;

    const clientId =
      process.env.NEXT_PUBLIC_ADOBE_PDF_EMBED_CLIENT_ID ||
      process.env.NEXT_PUBLIC_ADOBE_CLIENT_ID;

    if (!clientId) {
      setError('Adobe PDF Embed API Client ID is not configured.');
      setLoading(false);
      return;
    }

    const container = window.document.getElementById(containerId);
    if (!container) return;

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
          metaData: { fileName: document.file_name || `${document.title}.pdf` },
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
        .then((viewer: any) => {
          setLoading(false);
          adobeViewerRef.current = viewer;
        })
        .catch((err: unknown) => {
          setLoading(false);
          console.error('Adobe preview error:', err);
          setError('Unable to render PDF document preview. You can download the file directly.');
        });
    } catch (err: unknown) {
      setLoading(false);
      console.error('Adobe initialization error:', err);
      setError('Failed to initialize Adobe PDF Viewer.');
    }
  }, [isPdf, sdkReady, signedUrl, document]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!signedUrl || !document) return;
    const a = window.document.createElement('a');
    a.href = signedUrl;
    a.download = document.file_name || `${document.title}.${rawExt || 'pdf'}`;
    a.target = '_blank';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    showToast(`Downloading ${document.file_name || document.title}...`, 'success');
  }, [signedUrl, document, rawExt, showToast]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!document) return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: `Check out "${document.title}" on Campus Document Hub:`,
          url: shareUrl,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Document link copied to clipboard!', 'success');
    }
  }, [document, showToast]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAFAF8]">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-[#E8E8E3] bg-[#FFFFFF] px-4 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-xs font-bold text-[#1C1D1F] transition-all hover:border-[#60B5FF] flex-shrink-0"
            title="Return to Campus Resource Hub"
          >
            <ArrowLeft className="w-4 h-4 text-[#60B5FF]" />
            <span className="hidden sm:inline">Back to Hub</span>
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#60B5FF]/10 text-[#60B5FF] flex items-center justify-center flex-shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-[#1C1D1F] truncate font-heading">
                  {document?.title || 'Loading Document...'}
                </h1>
                {document && (
                  <>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3] hidden sm:inline">
                      {document.type}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#64666E] border border-[#E8E8E3] hidden md:inline">
                      {document.semester}
                    </span>
                  </>
                )}
              </div>
              {document?.uploader?.full_name && (
                <div className="flex items-center gap-1 text-[11px] text-[#64666E] leading-none mt-0.5">
                  <User className="w-3 h-3 text-[#64666E]" />
                  <span>Uploaded by {document.uploader.full_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {signedUrl && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-1.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-[#64666E] hover:text-[#1C1D1F] transition-all cursor-pointer"
            title="Share document link"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Viewer Canvas */}
      <main className="flex-1 relative w-full h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-3">
            <Loader2 className="w-8 h-8 text-[#60B5FF] animate-spin" />
            <p className="text-xs font-bold text-[#64666E]">
              Loading full-page document viewer...
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-white z-10">
            <div className="max-w-md text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-sm text-[#1C1D1F]">Preview Unavailable</h2>
              <p className="text-xs text-[#64666E]">{error}</p>
              {signedUrl && (
                <button
                  onClick={handleDownload}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#60B5FF] text-white font-bold text-xs shadow-xs hover:bg-[#4ea5ef] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Original File</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Branch 1: Microsoft Office Online Viewer for Office Docs */}
        {isOfficeDoc && signedUrl && !error && (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`}
            width="100%"
            height="100%"
            frameBorder="0"
            className="w-full h-full border-0 bg-white"
            title={document?.title || 'Office Document Viewer'}
            onLoad={() => setLoading(false)}
          />
        )}

        {/* Branch 2: Adobe PDF Embed API for PDFs (identical FULL_WINDOW + FIT_WIDTH vertical scroll) */}
        {isPdf && !error && (
          <div
            id={containerId}
            className="w-full h-full relative"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </main>
    </div>
  );
}
