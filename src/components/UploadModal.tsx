'use client';

import React, { useState, useRef } from 'react';
import { DocumentType, Semester } from '@/types';
import { useDocuments } from '@/context/DocumentContext';
import { validateDocumentFile } from '@/lib/pdfConverter';
import { compressImage } from '@/lib/imageCompressor';
import { useToast } from '@/context/ToastContext';
import {
  X,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DOCUMENT_TYPES: DocumentType[] = [
  'Notes',
  'Assignment',
  'Experiment',
  'End-Sem Exam Paper',
  'Midsem Paper',
];

const SEMESTERS: Semester[] = [
  'Sem 1',
  'Sem 2',
  'Sem 3',
  'Sem 4',
  'Sem 5',
  'Sem 6',
  'Sem 7',
  'Sem 8',
];

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { uploadDocument } = useDocuments();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('Notes');
  const [semester, setSemester] = useState<Semester>('Sem 5');
  const [subject, setSubject] = useState('');
  const [deadline, setDeadline] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [isImageFile, setIsImageFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const requiresDeadline = type === 'Assignment' || type === 'Experiment';

  const handleFileSelection = async (selectedFile: File) => {
    setFileError(null);
    const validation = validateDocumentFile(selectedFile);

    if (!validation.valid) {
      setFileError(validation.error || 'Invalid file.');
      setFile(null);
      setIsImageFile(false);
      return;
    }

    if (validation.isImage) {
      setIsImageFile(true);
      try {
        const compressed = await compressImage(selectedFile, 1600, 1600, 0.85);
        setFile(compressed);
      } catch {
        setFile(selectedFile);
      }
    } else {
      setFile(selectedFile);
      setIsImageFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!title.trim()) {
      setGeneralError('Please enter a descriptive document title.');
      return;
    }

    if (!file) {
      setGeneralError('Please select a PDF document or image to upload.');
      return;
    }

    if (requiresDeadline && !deadline) {
      setGeneralError(`Please specify the submission deadline for this ${type}.`);
      return;
    }

    setIsSubmitting(true);
    setProgressStatus('Initializing upload...');

    try {
      const result = await uploadDocument({
        title: title.trim(),
        type,
        semester,
        subject: subject.trim() || undefined,
        deadline: requiresDeadline && deadline ? new Date(deadline).toISOString() : null,
        file,
        onProgress: (status) => setProgressStatus(status),
      });

      if (!result.success) {
        setGeneralError(result.error || 'Upload failed. Please check file format and try again.');
        showToast(result.error || 'Upload failed. Please try again.', 'error');
        setIsSubmitting(false);
      } else {
        setUploadSuccess(true);
        showToast(`Document "${title.trim()}" published to hub!`, 'success');
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 1200);
      }
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'An unexpected error occurred during upload.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setTitle('');
    setType('Notes');
    setSemester('Sem 5');
    setSubject('');
    setDeadline('');
    setFile(null);
    setFileError(null);
    setGeneralError(null);
    setUploadSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1D1F]/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#E8E8E3] overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E3] bg-[#FFFFFF]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3] flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-[#60B5FF]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1C1D1F] font-heading">
                Upload Campus Document
              </h3>
              <p className="text-xs text-[#64666E]">
                Share verified notes, assignments, lab experiments, or exam papers
              </p>
            </div>
          </div>
          <button
            id="upload-modal-close-btn"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-[#64666E] hover:text-[#1C1D1F] hover:bg-[#FAFAF8] transition-colors disabled:opacity-30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploadSuccess ? (
          /* Success Screen */
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#5EF2D5] text-[#1C1D1F] border border-[#5EF2D5] flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8 text-[#1C1D1F]" />
            </div>
            <h4 className="text-lg font-bold text-[#1C1D1F] mb-1 font-heading">
              Document Uploaded Successfully!
            </h4>
            <p className="text-xs text-[#64666E]">
              Your document has been indexed and is now visible on the campus hub.
            </p>
          </div>
        ) : (
          /* Upload Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {generalError && (
              <div className="p-3 rounded-xl bg-[#F35252]/10 border border-[#F35252]/30 flex items-start gap-2.5 text-xs text-[#F35252] font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#F35252]" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Document Title */}
            <div>
              <label htmlFor="upload-title" className="block text-xs font-semibold text-[#1C1D1F] mb-1">
                Document Title *
              </label>
              <input
                id="upload-title"
                type="text"
                required
                placeholder="e.g. OS Experiment 5 - Banker's Algorithm & Safe State"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] text-sm focus:outline-none focus:border-[#60B5FF] focus:ring-2 focus:ring-[#60B5FF]/20 transition-all placeholder:text-[#64666E]"
              />
            </div>

            {/* Type & Semester Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="upload-type" className="block text-xs font-semibold text-[#1C1D1F] mb-1">
                  Document Type *
                </label>
                <select
                  id="upload-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as DocumentType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] font-semibold text-sm focus:outline-none focus:border-[#60B5FF] focus:ring-2 focus:ring-[#60B5FF]/20 transition-all"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="upload-semester" className="block text-xs font-semibold text-[#1C1D1F] mb-1">
                  Semester *
                </label>
                <select
                  id="upload-semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as Semester)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] font-semibold text-sm focus:outline-none focus:border-[#60B5FF] focus:ring-2 focus:ring-[#60B5FF]/20 transition-all"
                >
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Code (Optional) */}
            <div>
              <label htmlFor="upload-subject" className="block text-xs font-semibold text-[#1C1D1F] mb-1">
                Subject / Course Code <span className="text-[#64666E] font-normal">(Optional)</span>
              </label>
              <input
                id="upload-subject"
                type="text"
                placeholder="e.g. Operating Systems (CSE-501)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] text-sm focus:outline-none focus:border-[#60B5FF] focus:ring-2 focus:ring-[#60B5FF]/20 transition-all placeholder:text-[#64666E]"
              />
            </div>

            {/* Dynamic Deadline Picker for Assignment or Experiment */}
            {requiresDeadline && (
              <div className="p-3.5 rounded-2xl bg-[#F79D65]/10 border border-[#F79D65]/30 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F79D65] mb-2">
                  <Clock className="w-4 h-4 text-[#F79D65]" />
                  <span className="text-[#1C1D1F]">Submission Deadline ({type}) *</span>
                </div>
                <div className="relative">
                  <input
                    id="upload-deadline"
                    type="datetime-local"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:border-[#60B5FF] focus:ring-2 focus:ring-[#60B5FF]/20"
                  />
                </div>
                <p className="text-[11px] text-[#64666E] mt-1 font-medium">
                  Approaching deadlines (&le;48 hours) will display an amber attention badge for classmates.
                </p>
              </div>
            )}

            {/* Dropzone File Upload */}
            <div>
              <label className="block text-xs font-semibold text-[#1C1D1F] mb-1">
                Upload File (PDF or Image) *
              </label>
              
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                  isDragging || file
                    ? 'border-[#60B5FF] bg-[#60B5FF]/5'
                    : 'border-[#E8E8E3] hover:border-[#60B5FF] bg-[#FAFAF8]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="upload-file-input"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelection(e.target.files[0]);
                    }
                  }}
                />

                {file ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#60B5FF]/15 text-[#60B5FF] flex items-center justify-center">
                      <FileCheck className="w-5 h-5 text-[#60B5FF]" />
                    </div>
                    <div className="font-bold text-xs text-[#1C1D1F] truncate max-w-xs">
                      {file.name}
                    </div>
                    <div className="text-[11px] text-[#64666E] font-medium">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                      {isImageFile && (
                        <span className="ml-2 text-[#60B5FF] font-semibold inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#60B5FF]" /> Auto-converts to PDF
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3] flex items-center justify-center">
                      <UploadCloud className="w-5 h-5 text-[#60B5FF]" />
                    </div>
                    <div className="text-xs font-semibold text-[#1C1D1F]">
                      Drag and drop your file here, or <span className="text-[#60B5FF] underline">browse</span>
                    </div>
                    <div className="text-[11px] text-[#64666E] font-normal">
                      PDF, JPG, PNG, WEBP (Max 20MB)
                    </div>
                  </div>
                )}
              </div>

              {fileError && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#F35252] font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-[#F35252]" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>

            {/* Submission / Progress */}
            <div className="pt-2">
              {isSubmitting ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#1C1D1F]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#60B5FF]" />
                    <span>{progressStatus || 'Uploading document...'}</span>
                  </div>
                  {/* Progress bar fill using #5EF2D5 (mint) */}
                  <div className="w-full bg-[#E8E8E3] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#5EF2D5] h-full w-2/3 animate-pulse rounded-full" />
                  </div>
                </div>
              ) : (
                <button
                  id="upload-submit-btn"
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-[#60B5FF] hover:bg-[#60B5FF]/90 text-[#FFFFFF] shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Upload & Index Document
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
