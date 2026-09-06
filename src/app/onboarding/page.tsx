'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { compressImage } from '@/lib/imageCompressor';
import { Year, Semester } from '@/types';
import {
  GraduationCap,
  Sparkles,
  Building,
  Calendar,
  User,
  Upload,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
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

function OnboardingContent() {
  const router = useRouter();
  const { user, isLoading, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [year, setYear] = useState<Year>('1st Year');
  const [semester, setSemester] = useState<Semester>('Sem 1');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Complete Your Student Profile | Campus Document Hub';
  }, []);

  // Pre-fill full name and avatar from user profile / Google OAuth metadata
  useEffect(() => {
    if (user) {
      if (user.full_name && !fullName) {
        setFullName(user.full_name);
      }
      if (user.avatar_url && !avatarPreview) {
        setAvatarPreview(user.avatar_url);
      }
      if (user.department) setDepartment(user.department);
      if (user.year) setYear(user.year);
      if (user.semester) setSemester(user.semester);

      // If returning user already has complete profile, redirect straight to dashboard
      if (user.year && user.semester && user.department && user.full_name) {
        router.replace('/');
      }
    }
  }, [user, router, fullName, avatarPreview]);

  // Handle avatar upload with client-side compression
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Avatar image size must be under 5MB.');
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
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!department) {
      setErrorMessage('Please select your academic department / branch.');
      return;
    }

    if (!year) {
      setErrorMessage('Please select your academic year.');
      return;
    }

    if (!semester) {
      setErrorMessage('Please select your current semester.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateProfile(
        {
          full_name: fullName.trim(),
          department,
          year,
          semester,
        },
        avatarFile
      );

      if (result.error) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
        showToast(result.error, 'error');
      } else {
        showToast(`Welcome to Campus Document Hub, ${fullName.trim()}!`, 'success');
        router.push('/');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save academic profile.';
      setErrorMessage(msg);
      setIsSubmitting(false);
      showToast(msg, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#60B5FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#60B5FF]/20 selection:text-[#1C1D1F]">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="inline-flex items-center gap-2.5 group mb-2">
          <div className="w-12 h-12 rounded-2xl bg-[#60B5FF] flex items-center justify-center text-[#FFFFFF] shadow-md">
            <GraduationCap className="w-6 h-6 text-[#FFFFFF]" />
          </div>
          <span className="text-xl font-extrabold text-[#1C1D1F] tracking-tight font-poppins">
            Campus Document Hub
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE588]/30 border border-[#FFE588] text-xs font-bold text-[#1C1D1F] mt-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#F79D65]" />
          <span>First-Time Setup • Academic Onboarding</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-[#1C1D1F] font-poppins mt-1">
          Complete Your Student Profile
        </h1>
        <p className="text-xs text-[#64666E] font-medium mt-1 max-w-md mx-auto">
          Since you signed in with Google, we just need your branch, year, and semester to personalize your syllabus archive and course downloads.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-[#FFFFFF] py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-[#E8E8E3] space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-[#F35252]/10 border border-[#F35252]/30 flex items-start gap-2.5 text-xs text-[#F35252] font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Avatar Photo Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E3]">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FFFFFF] border-2 border-[#E8E8E3] flex items-center justify-center shadow-xs">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt={fullName || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-extrabold text-[#60B5FF]">
                      {(fullName || 'S').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <label
                  htmlFor="onboarding-avatar"
                  className="absolute inset-0 bg-[#1C1D1F]/70 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[#FFFFFF] cursor-pointer transition-opacity text-[10px] font-bold"
                >
                  <Upload className="w-4 h-4 mb-0.5 text-[#FFFFFF]" />
                  <span>Change</span>
                </label>
                <input
                  id="onboarding-avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="text-center sm:text-left">
                <p className="text-xs font-bold text-[#1C1D1F]">
                  Profile Photo (Google Profile)
                </p>
                <p className="text-[11px] text-[#64666E] mt-0.5">
                  Pre-filled from your Google account. You can keep it or click to upload a custom campus photo.
                </p>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="onboarding-name" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                Full Name *
              </label>
              <div className="relative">
                <input
                  id="onboarding-name"
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
              <label htmlFor="onboarding-dept" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                Department / Branch *
              </label>
              <div className="relative">
                <select
                  id="onboarding-dept"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] cursor-pointer appearance-none"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <Building className="w-4 h-4 text-[#64666E] absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Year & Semester Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Year */}
              <div>
                <label htmlFor="onboarding-year" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                  Academic Year *
                </label>
                <div className="relative">
                  <select
                    id="onboarding-year"
                    required
                    value={year}
                    onChange={(e) => setYear(e.target.value as Year)}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] cursor-pointer appearance-none"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <Calendar className="w-4 h-4 text-[#64666E] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Semester */}
              <div>
                <label htmlFor="onboarding-sem" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                  Current Semester *
                </label>
                <div className="relative">
                  <select
                    id="onboarding-sem"
                    required
                    value={semester}
                    onChange={(e) => setSemester(e.target.value as Semester)}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] cursor-pointer appearance-none"
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <GraduationCap className="w-4 h-4 text-[#64666E] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="onboarding-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] shadow-sm active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile & Loading Archive...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Setup & Enter Hub</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-2 text-center text-[11px] text-[#64666E] flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5EF2D5]" />
            <span>You can update these details anytime from your Profile page</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#60B5FF] animate-spin" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
