'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { compressImage } from '@/lib/imageCompressor';
import { Year, Semester } from '@/types';
import {
  GraduationCap,
  Building,
  Calendar,
  User,
  Upload,
  X,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

const YEARS: Year[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
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

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'AI & Data Science',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
];

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateProfile, needsAcademicDetails } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [year, setYear] = useState<Year>((user?.year as Year) || '1st Year');
  const [semester, setSemester] = useState<Semester>((user?.semester as Semester) || 'Sem 1');
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state whenever user changes or modal opens
  useEffect(() => {
    if (user) {
      if (user.full_name) setFullName(user.full_name);
      if (user.year) setYear(user.year);
      if (user.semester) setSemester(user.semester);
      if (user.department) setDepartment(user.department);
      if (user.avatar_url && !avatarFile) setAvatarPreview(user.avatar_url);
    }
  }, [user, isOpen, avatarFile]);

  if (!isOpen || !user) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Avatar image size must be under 5MB.');
        return;
      }
      try {
        const compressed = await compressImage(file, 600, 600, 0.85);
        setAvatarFile(compressed);
        setAvatarPreview(URL.createObjectURL(compressed));
      } catch {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation to ensure fields cannot be cleared to empty
    if (!fullName.trim()) {
      setError('Full name is required and cannot be empty.');
      return;
    }

    if (!department) {
      setError('Please select a valid academic department / branch.');
      return;
    }

    if (!year) {
      setError('Please select a valid academic year.');
      return;
    }

    if (!semester) {
      setError('Please select a valid semester.');
      return;
    }

    setLoading(true);

    try {
      const result = await updateProfile(
        {
          full_name: fullName.trim(),
          year,
          semester,
          department,
        },
        avatarFile
      );

      setLoading(false);

      if (result.error) {
        setError(result.error);
        showToast(result.error, 'error');
      } else {
        showToast('Profile updated successfully!', 'success');
        if (onClose) onClose();
      }
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1D1F]/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#FFFFFF] rounded-3xl shadow-2xl border border-[#E8E8E3] overflow-hidden p-6 sm:p-8 my-6">
        
        {/* Close Button (when closable) */}
        {onClose && (
          <button
            id="profile-modal-close-btn"
            onClick={onClose}
            disabled={loading}
            className="absolute right-5 top-5 p-2 rounded-xl text-[#64666E] hover:text-[#1C1D1F] hover:bg-[#FAFAF8] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3] flex items-center justify-center mb-3 shadow-xs">
            <GraduationCap className="w-6 h-6 text-[#60B5FF]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFE588]/30 text-[#1C1D1F] text-[11px] font-bold border border-[#FFE588] mb-2">
            <Sparkles className="w-3 h-3 text-[#F79D65]" />
            <span>{needsAcademicDetails ? 'First-Time Academic Setup' : 'Student Account Settings'}</span>
          </div>

          <h2 className="text-xl font-bold text-[#1C1D1F] font-poppins">
            {needsAcademicDetails ? 'Complete Your Academic Profile' : 'Edit Student Profile'}
          </h2>
          <p className="text-xs text-[#64666E] font-medium mt-1">
            {needsAcademicDetails
              ? `Welcome, ${fullName || user.full_name}! Select your branch, year, and semester to personalize your study archive.`
              : 'Update your academic details, full name, or campus photo. Changes persist to your verified profile.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#F35252]/10 border border-[#F35252]/30 text-xs text-[#F35252] font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Avatar Preview & Upload */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E3]">
            <div className="relative group flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#FFFFFF] border-2 border-[#E8E8E3] flex items-center justify-center shadow-xs">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt={fullName || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-extrabold text-[#60B5FF]">
                    {(fullName || 'S').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <label
                htmlFor="modal-avatar-input"
                className="absolute inset-0 bg-[#1C1D1F]/70 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[#FFFFFF] cursor-pointer transition-opacity text-[10px] font-bold"
              >
                <Upload className="w-4 h-4 mb-0.5 text-[#FFFFFF]" />
                <span>Change</span>
              </label>
              <input
                ref={avatarInputRef}
                id="modal-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-bold text-[#1C1D1F]">
                Profile Photo / Avatar
              </p>
              <p className="text-[11px] text-[#64666E] mt-0.5">
                Click photo to upload a new avatar (JPG, PNG, WEBP &le;5MB).
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="modal-fullname" className="block text-xs font-bold text-[#1C1D1F] mb-1">
              Full Name *
            </label>
            <div className="relative">
              <input
                id="modal-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] placeholder:text-[#64666E]"
              />
              <User className="w-4 h-4 text-[#64666E] absolute left-3 top-3" />
            </div>
          </div>

          {/* Department / Branch */}
          <div>
            <label htmlFor="modal-department" className="block text-xs font-bold text-[#1C1D1F] mb-1">
              Engineering Department / Branch *
            </label>
            <div className="relative">
              <select
                id="modal-department"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] cursor-pointer"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Building className="w-4 h-4 text-[#64666E] absolute left-3 top-3" />
            </div>
          </div>

          {/* Year & Semester Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-year" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                Academic Year *
              </label>
              <div className="relative">
                <select
                  id="modal-year"
                  required
                  value={year}
                  onChange={(e) => setYear(e.target.value as Year)}
                  className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <Calendar className="w-3.5 h-3.5 text-[#64666E] absolute left-2.5 top-3" />
              </div>
            </div>

            <div>
              <label htmlFor="modal-semester" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                Current Semester *
              </label>
              <div className="relative">
                <select
                  id="modal-semester"
                  required
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as Semester)}
                  className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] cursor-pointer"
                >
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Calendar className="w-3.5 h-3.5 text-[#64666E] absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="complete-profile-submit-btn"
              type="submit"
              disabled={loading || !fullName.trim() || !department || !year || !semester}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] shadow-xs active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile Changes...</span>
                </>
              ) : (
                <>
                  <span>Save Profile Changes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
