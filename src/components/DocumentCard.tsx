'use client';

import React, { useState } from 'react';
import { DocumentItem, DocumentType } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useDocuments } from '@/context/DocumentContext';
import { useToast } from '@/context/ToastContext';
import {
  Eye,
  Download,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  Share2,
  ExternalLink,
} from 'lucide-react';

interface DocumentCardProps {
  document: DocumentItem;
  onView: (doc: DocumentItem) => void;
}

const TYPE_CONFIG: Record<
  DocumentType,
  { label: string; bg: string; text: string; border: string }
> = {
  Notes: {
    label: 'Notes',
    bg: 'bg-[#FFE588]',
    text: 'text-[#1C1D1F]',
    border: 'border-[#FFE588]',
  },
  Assignment: {
    label: 'Assignment',
    bg: 'bg-[#F79D65]',
    text: 'text-[#FFFFFF]',
    border: 'border-[#F79D65]',
  },
  Experiment: {
    label: 'Experiment',
    bg: 'bg-[#5EF2D5]',
    text: 'text-[#1C1D1F]',
    border: 'border-[#5EF2D5]',
  },
  'End-Sem Exam Paper': {
    label: 'End-Sem Exam Paper',
    bg: 'bg-[#F35252]',
    text: 'text-[#FFFFFF]',
    border: 'border-[#F35252]',
  },
  'Midsem Paper': {
    label: 'Midsem Paper',
    bg: 'bg-[#F79D65]',
    text: 'text-[#FFFFFF]',
    border: 'border-[#F79D65]',
  },
};

export const DocumentCard: React.FC<DocumentCardProps> = ({ document: doc, onView }) => {
  const { user } = useAuth();
  const { deleteDocument, getDocumentPdfUrl } = useDocuments();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const typeStyle = TYPE_CONFIG[doc.type] || TYPE_CONFIG.Notes;
  const isUploader = Boolean(user && (user.id === doc.uploader_id || user.id === doc.uploader?.id));

  // Deadline calculation
  const deadlineDate = doc.deadline ? new Date(doc.deadline) : null;
  const isExpired = deadlineDate ? deadlineDate.getTime() < Date.now() : false;
  const daysLeft = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isApproaching = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteDocument(doc.id);
    if (!result.success) {
      setDeleteError(result.error || 'Failed to delete document.');
      showToast(result.error || 'Failed to delete document.', 'error');
      setIsDeleting(false);
    } else {
      showToast('Document deleted successfully.', 'success');
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}/?doc=${doc.id}`;
      navigator.clipboard.writeText(shareUrl);
      showToast(`Direct document link copied!`, 'success');
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const url = await getDocumentPdfUrl(doc);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.file_name || `${doc.title}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <div
      id={`doc-card-${doc.id}`}
      className="group relative bg-[#FFFFFF] rounded-2xl border border-[#E8E8E3] p-5 shadow-xs hover:shadow-md hover:border-[#60B5FF] transition-all flex flex-col justify-between"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Type badge */}
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
            >
              {typeStyle.label}
            </span>

            {/* Semester badge */}
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAFAF8] text-[#64666E] border border-[#E8E8E3]">
              {doc.semester}
            </span>
          </div>

          {/* Deadline Countdown badge for Assignment / Experiment */}
          {deadlineDate && (
            <div
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                isExpired
                  ? 'bg-[#F35252] text-[#FFFFFF] border-[#F35252]'
                  : isApproaching
                  ? 'bg-[#F79D65] text-[#FFFFFF] border-[#F79D65]'
                  : 'bg-[#FAFAF8] text-[#64666E] border-[#E8E8E3]'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>
                {isExpired
                  ? 'Overdue'
                  : daysLeft === 0
                  ? 'Due Today'
                  : daysLeft === 1
                  ? 'Due Tomorrow'
                  : `Due in ${daysLeft}d`}
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3
          onClick={() => onView(doc)}
          className="text-sm sm:text-base font-bold text-[#1C1D1F] hover:text-[#60B5FF] cursor-pointer transition-colors line-clamp-2 leading-snug mb-1 font-heading"
        >
          {doc.title}
        </h3>

        {/* Subject tag */}
        {doc.subject && (
          <p className="text-xs text-[#64666E] font-medium mb-3">
            {doc.subject}
          </p>
        )}

        {/* Uploader Name Display */}
        <div className="flex items-center gap-2 pt-2 pb-3 border-t border-[#E8E8E3] text-xs">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-[#FAFAF8] border border-[#E8E8E3] flex items-center justify-center flex-shrink-0">
            {doc.uploader?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doc.uploader.avatar_url}
                alt={doc.uploader.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-bold text-[#64666E]">
                {(doc.uploader?.full_name || 'S').charAt(0)}
              </span>
            )}
          </div>

          <div className="truncate flex-1">
            <span className="text-[#64666E] text-[11px]">Uploaded by: </span>
            <strong className="text-[#1C1D1F] font-semibold text-xs">
              {doc.uploader?.full_name || 'Student Contributor'}
            </strong>
          </div>
        </div>
      </div>

      {/* Card Footer: Metadata & Actions */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-[#64666E] mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#64666E]" />
            {new Date(doc.created_at).toLocaleDateString()}
          </span>
          <span className="font-semibold text-[#64666E]">{(doc.file_size / (1024 * 1024)).toFixed(1)} MB</span>
        </div>

        {deleteError && (
          <div className="mb-2 p-2 rounded-lg bg-[#F35252]/10 text-[#F35252] border border-[#F35252]/30 text-[11px] flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}

        {deleteConfirm ? (
          <div className="p-2.5 rounded-xl bg-[#FAFAF8] border border-[#E8E8E3] text-xs space-y-2">
            <p className="text-[#1C1D1F] font-bold text-center">
              Confirm deleting your document?
            </p>
            <div className="flex items-center gap-2">
              <button
                id={`confirm-delete-${doc.id}`}
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 py-1 px-2 rounded-lg bg-[#F35252] hover:bg-[#F35252]/90 text-[#FFFFFF] font-bold text-xs transition-colors cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="py-1 px-2 rounded-lg border border-[#E8E8E3] text-[#1C1D1F] bg-[#FFFFFF] text-xs hover:bg-[#FAFAF8] cursor-pointer font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* View Inline Button (Primary Action - #60B5FF) */}
            <button
              id={`view-btn-${doc.id}`}
              onClick={() => onView(doc)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#60B5FF]/90 text-[#FFFFFF] transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Inline</span>
            </button>

            {/* Download Button */}
            <button
              id={`download-btn-${doc.id}`}
              onClick={handleDownload}
              className="p-2 rounded-xl border border-[#E8E8E3] text-[#1C1D1F] bg-[#FFFFFF] hover:bg-[#FAFAF8] hover:border-[#60B5FF] transition-colors cursor-pointer"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Copy Direct Link Button */}
            <button
              id={`share-btn-${doc.id}`}
              onClick={handleCopyLink}
              className="p-2 rounded-xl border border-[#E8E8E3] text-[#1C1D1F] bg-[#FFFFFF] hover:bg-[#FAFAF8] hover:border-[#60B5FF] transition-colors cursor-pointer"
              title="Copy Direct Link to Document"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Open in Dedicated Tab (Secondary Opt-in Action) */}
            <a
              id={`new-tab-btn-${doc.id}`}
              href={`/view/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl border border-[#E8E8E3] text-[#1C1D1F] bg-[#FFFFFF] hover:bg-[#FAFAF8] hover:border-[#60B5FF] hover:text-[#60B5FF] transition-colors cursor-pointer inline-flex items-center justify-center"
              title="Open full page in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Delete Button (Allowed and visible only for uploader) */}
            {isUploader && (
              <button
                id={`delete-btn-${doc.id}`}
                onClick={() => setDeleteConfirm(true)}
                className="p-2 rounded-xl text-[#64666E] hover:text-[#F35252] hover:bg-[#F35252]/10 border border-transparent hover:border-[#F35252]/30 transition-colors cursor-pointer"
                title="Delete Your Upload"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
