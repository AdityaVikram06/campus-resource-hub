'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useDocuments } from '@/context/DocumentContext';
import { useToast } from '@/context/ToastContext';
import { compressImage } from '@/lib/imageCompressor';
import { DocumentItem, DocumentType } from '@/types';
import { Navbar } from '@/components/Navbar';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { UploadModal } from '@/components/UploadModal';
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { DocumentCard } from '@/components/DocumentCard';
import { CompleteProfileModal } from '@/components/CompleteProfileModal';
import {
  User,
  Building,
  Calendar,
  FileText,
  Upload,
  BookOpen,
  ClipboardList,
  FlaskConical,
  Award,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Edit3,
} from 'lucide-react';

const TYPE_CARDS: {
  type: DocumentType;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  countColor: string;
}[] = [
  {
    type: 'Notes',
    label: 'Lecture Notes',
    icon: BookOpen,
    color: 'text-[#1C1D1F]',
    bgColor: 'bg-[#FFE588]/20',
    borderColor: 'border-[#FFE588]',
    textColor: 'text-[#1C1D1F]',
    countColor: 'text-[#1C1D1F]',
  },
  {
    type: 'Assignment',
    label: 'Assignments',
    icon: ClipboardList,
    color: 'text-[#FFFFFF]',
    bgColor: 'bg-[#F79D65]/15',
    borderColor: 'border-[#F79D65]',
    textColor: 'text-[#1C1D1F]',
    countColor: 'text-[#F79D65]',
  },
  {
    type: 'Experiment',
    label: 'Lab Experiments',
    icon: FlaskConical,
    color: 'text-[#1C1D1F]',
    bgColor: 'bg-[#5EF2D5]/20',
    borderColor: 'border-[#5EF2D5]',
    textColor: 'text-[#1C1D1F]',
    countColor: 'text-[#1C1D1F]',
  },
  {
    type: 'End-Sem Exam Paper',
    label: 'End-Sem Exam Papers',
    icon: Award,
    color: 'text-[#FFFFFF]',
    bgColor: 'bg-[#F35252]/15',
    borderColor: 'border-[#F35252]',
    textColor: 'text-[#1C1D1F]',
    countColor: 'text-[#F35252]',
  },
  {
    type: 'Midsem Paper',
    label: 'Midsem Papers',
    icon: FileCheck2,
    color: 'text-[#FFFFFF]',
    bgColor: 'bg-[#F79D65]/15',
    borderColor: 'border-[#F79D65]',
    textColor: 'text-[#1C1D1F]',
    countColor: 'text-[#F79D65]',
  },
];

export default function ProfilePage() {
  const { user, updateProfile, needsAcademicDetails } = useAuth();
  const { documents } = useDocuments();
  const { showToast } = useToast();

  // Modals state
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isEditAcademicOpen, setIsEditAcademicOpen] = useState(false);

  // Avatar update state
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Student Profile & Upload Breakdown | Campus Document Hub';
  }, []);

  // Filter user's documents
  const myDocuments = useMemo(() => {
    if (!user) return [];
    return documents.filter((d) => d.uploader_id === user.id);
  }, [documents, user]);

  // Breakdown counts grouped by document type
  const typeCounts = useMemo(() => {
    const counts: Record<DocumentType, number> = {
      Notes: 0,
      Assignment: 0,
      Experiment: 0,
      'End-Sem Exam Paper': 0,
      'Midsem Paper': 0,
    };

    myDocuments.forEach((doc) => {
      if (counts[doc.type] !== undefined) {
        counts[doc.type]++;
      }
    });

    return counts;
  }, [myDocuments]);

  // Handle avatar upload with canvas compression
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Avatar file must be less than 5MB.');
      showToast('Avatar file must be less than 5MB.', 'error');
      return;
    }

    setIsUpdatingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(false);

    try {
      const compressedFile = await compressImage(file, 600, 600, 0.85);
      const result = await updateProfile({}, compressedFile);
      setIsUpdatingAvatar(false);

      if (result.error) {
        setAvatarError(result.error);
        showToast(result.error, 'error');
      } else {
        setAvatarSuccess(true);
        showToast('Profile photo updated successfully!', 'success');
        setTimeout(() => setAvatarSuccess(false), 2500);
      }
    } catch (err) {
      setIsUpdatingAvatar(false);
      const msg = err instanceof Error ? err.message : 'Failed to update avatar.';
      setAvatarError(msg);
      showToast(msg, 'error');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="text-center p-8 bg-[#FFFFFF] rounded-3xl border border-[#E8E8E3] shadow-lg max-w-sm w-full">
          <User className="w-12 h-12 mx-auto text-[#64666E] mb-3" />
          <h2 className="text-base font-bold text-[#1C1D1F] mb-1">
            Sign In Required
          </h2>
          <p className="text-xs text-[#64666E] mb-4 font-medium">
            Please sign in to view your student profile and upload statistics.
          </p>
          <Link
            href="/auth"
            className="block py-2.5 px-4 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] shadow-xs cursor-pointer"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1C1D1F] flex flex-col selection:bg-[#60B5FF]/20 selection:text-[#1C1D1F]">
      {/* Navigation */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#64666E] hover:text-[#1C1D1F] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#60B5FF]" />
            <span>Back to All Documents</span>
          </Link>
        </div>

        {/* Student Profile Card */}
        <div className="bg-[#FFFFFF] rounded-3xl border border-[#E8E8E3] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            
            {/* Avatar & Photo Upload */}
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-[#FAFAF8] border-2 border-[#E8E8E3] flex items-center justify-center shadow-xs">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-[#60B5FF]">
                    {user.full_name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Upload Overlay */}
              <label
                id="profile-avatar-upload-btn"
                className="absolute inset-0 bg-[#1C1D1F]/75 rounded-3xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[#FFFFFF] cursor-pointer transition-opacity"
              >
                {isUpdatingAvatar ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#FFFFFF]" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 mb-1 text-[#FFFFFF]" />
                    <span className="text-[10px] font-bold">Change Photo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUpdatingAvatar}
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#1C1D1F] font-poppins">
                    {user.full_name}
                  </h1>
                  <p className="text-xs text-[#64666E] font-semibold flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-[#60B5FF]" />
                    <span>{user.department}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#FAFAF8] text-[#64666E] text-xs font-bold border border-[#E8E8E3]">
                    {user.year || 'Year not set'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#FAFAF8] text-[#64666E] text-xs font-bold border border-[#E8E8E3]">
                    {user.semester || 'Semester not set'}
                  </span>
                  <button
                    onClick={() => setIsEditAcademicOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-[#1C1D1F] transition-colors cursor-pointer shadow-xs"
                    title="Edit Academic Year, Semester, and Branch"
                  >
                    <Edit3 className="w-3 h-3 text-[#60B5FF]" />
                    <span>{user.year ? 'Edit Details' : 'Set Academic Details'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#64666E]">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#64666E]" />
                  Joined Campus Hub: {new Date(user.created_at).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="font-bold text-[#1C1D1F]">
                  {myDocuments.length} total uploads contributed
                </span>
              </div>

              {avatarSuccess && (
                <div className="pt-1 text-xs text-[#1C1D1F] bg-[#5EF2D5]/20 border border-[#5EF2D5] px-3 py-1.5 rounded-xl font-bold flex items-center justify-center sm:justify-start gap-1.5 w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1C1D1F]" />
                  <span>Profile avatar updated successfully!</span>
                </div>
              )}

              {avatarError && (
                <div className="pt-1 text-xs text-[#F35252] bg-[#F35252]/10 border border-[#F35252]/30 px-3 py-1.5 rounded-xl font-bold flex items-center justify-center sm:justify-start gap-1.5 w-fit">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{avatarError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Breakdown Statistics */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1C1D1F]">
                Upload Count Breakdown
              </h2>
              <p className="text-xs text-[#64666E] font-medium">
                Academic contributions by category for this student
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] transition-colors cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload More</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {TYPE_CARDS.map(({ type, label, icon: Icon, color, bgColor, borderColor, textColor, countColor }) => {
              const count = typeCounts[type] || 0;
              return (
                <div
                  key={type}
                  id={`stat-card-${type.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`p-4 rounded-2xl border ${bgColor} ${borderColor} flex flex-col justify-between transition-all hover:scale-102 shadow-xs`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-[#FFFFFF] shadow-xs border border-[#E8E8E3]">
                      <Icon className="w-5 h-5 text-[#1C1D1F]" />
                    </div>
                    <span className={`text-2xl font-black font-mono ${countColor}`}>
                      {count}
                    </span>
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${textColor}`}>
                      {label}
                    </h4>
                    <p className={`text-[11px] font-semibold ${textColor} opacity-80`}>
                      {count === 1 ? '1 document' : `${count} documents`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Uploads List */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#1C1D1F] mb-4">
            My Uploaded Documents ({myDocuments.length})
          </h2>

          {myDocuments.length === 0 ? (
            <div className="text-center py-12 bg-[#FFFFFF] rounded-2xl border border-[#E8E8E3] p-6">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFE588]/30 border border-[#FFE588] flex items-center justify-center mb-3">
                <FileText className="w-7 h-7 text-[#1C1D1F]" />
              </div>
              <p className="text-xs font-bold text-[#1C1D1F] mb-3">
                You haven&apos;t uploaded any documents yet.
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] transition-colors cursor-pointer shadow-xs"
              >
                Upload First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onView={(selected) => setViewerDoc(selected)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onSelectDocument={(doc, page) => setViewerDoc(doc)}
      />

      {/* Document Viewer Modal */}
      {viewerDoc && (
        <DocumentViewerModal
          document={viewerDoc}
          onClose={() => setViewerDoc(null)}
        />
      )}

      {/* Complete/Edit Academic Profile Modal */}
      <CompleteProfileModal
        isOpen={needsAcademicDetails || isEditAcademicOpen}
        onClose={() => setIsEditAcademicOpen(false)}
      />
    </div>
  );
}
