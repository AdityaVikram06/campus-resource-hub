'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { compressImage } from '@/lib/imageCompressor';
import { Year, Semester } from '@/types';
import {
  GraduationCap,
  Sparkles,
  Lock,
  Mail,
  User,
  Building,
  Upload,
  ArrowRight,
  AlertCircle,
  Loader2,
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
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'AI & Data Science',
  'Chemical Engineering',
];

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const redirectUrl = rawRedirect && rawRedirect.startsWith('/') ? rawRedirect : '/';

  const { login, signup, loginWithGoogle, isSupabaseConnected } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [year, setYear] = useState<Year>('3rd Year');
  const [semester, setSemester] = useState<Semester>('Sem 5');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    document.title =
      mode === 'signup'
        ? 'Create Student Account | Campus Document Hub'
        : 'Sign In | Campus Document Hub';
  }, [mode]);

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
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (result.error) {
          setErrorMessage(result.error);
          setLoading(false);
          return;
        }
        showToast('Signed in successfully!', 'success');
      } else {
        if (!fullName.trim()) {
          setErrorMessage('Please enter your full student name.');
          setLoading(false);
          return;
        }

        const result = await signup({
          email,
          password,
          fullName: fullName.trim(),
          year,
          semester,
          department,
          avatarFile,
        });

        if (result.error) {
          setErrorMessage(result.error);
          setLoading(false);
          return;
        }
        showToast('Account created successfully!', 'success');
      }

      router.push(redirectUrl);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setLoading(true);
    const result = await loginWithGoogle();
    if (result.error) {
      setErrorMessage(result.error);
      setLoading(false);
    } else {
      showToast('Signed in via Google OAuth!', 'success');
      router.push(redirectUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#60B5FF]/20 selection:text-[#1C1D1F]">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-12 h-12 rounded-2xl bg-[#60B5FF] flex items-center justify-center text-[#FFFFFF] shadow-md group-hover:bg-[#4ea5ef] transition-colors">
            <GraduationCap className="w-6 h-6 text-[#FFFFFF]" />
          </div>
          <span className="text-xl font-extrabold text-[#1C1D1F] tracking-tight font-poppins">
            Campus Document Hub
          </span>
        </Link>
        <h2 className="mt-4 text-xl font-bold text-[#1C1D1F]">
          {mode === 'signup' ? 'Join the B.Tech Resource Network' : 'Welcome Back, Student'}
        </h2>
        <p className="mt-1 text-xs text-[#64666E] font-medium">
          Access notes, assignments, and exam archives across all branches
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFFFFF] py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-[#E8E8E3] space-y-5">
          
          {/* Tabs: Login / Sign Up */}
          <div className="flex rounded-xl bg-[#FAFAF8] p-1 border border-[#E8E8E3]">
            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-[#60B5FF] text-[#FFFFFF] shadow-xs'
                  : 'text-[#64666E] hover:text-[#1C1D1F]'
              }`}
            >
              Create Account
            </button>
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#60B5FF] text-[#FFFFFF] shadow-xs'
                  : 'text-[#64666E] hover:text-[#1C1D1F]'
              }`}
            >
              Sign In
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#F35252]/10 border border-[#F35252]/30 flex items-start gap-2 text-xs text-[#F35252] font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#F35252]" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google OAuth Provider Button */}
          <div>
            <button
              id="auth-google-oauth-btn"
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] hover:bg-[#FAFAF8] text-[#1C1D1F] font-bold text-xs transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <span className="w-4 h-4 rounded-full bg-[#60B5FF] text-[#FFFFFF] flex items-center justify-center text-[10px] font-bold">
                G
              </span>
              <span>Continue with Google</span>
            </button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8E8E3]" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-[#64666E] bg-[#FFFFFF] px-2 font-bold">
                Or with institutional email
              </div>
            </div>
          </div>

          {/* Main Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Sign Up Fields: Full Name, Academic Details, Avatar */}
            {mode === 'signup' && (
              <>
                {/* Avatar upload */}
                <div className="flex items-center gap-3.5 p-2 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E3]">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#FFFFFF] flex items-center justify-center flex-shrink-0 border border-[#E8E8E3]">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-[#64666E]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-[#1C1D1F]">
                      Profile Picture <span className="text-[#64666E] font-normal">(Optional)</span>
                    </label>
                    <label className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#60B5FF] font-bold hover:underline cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>{avatarFile ? 'Change photo' : 'Upload photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="auth-fullname" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <input
                      id="auth-fullname"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] placeholder:text-[#64666E]"
                    />
                    <User className="w-4 h-4 text-[#64666E] absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Year and Semester */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-year" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                      Academic Year *
                    </label>
                    <select
                      id="auth-year"
                      value={year}
                      onChange={(e) => setYear(e.target.value as Year)}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] cursor-pointer"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="auth-semester" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                      Current Semester *
                    </label>
                    <select
                      id="auth-semester"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value as Semester)}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] cursor-pointer"
                    >
                      {SEMESTERS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Department / Branch */}
                <div>
                  <label htmlFor="auth-department" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                    Department / Branch *
                  </label>
                  <div className="relative">
                    <select
                      id="auth-department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] cursor-pointer"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <Building className="w-4 h-4 text-[#64666E] absolute left-3 top-2.5" />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                Student Email Address *
              </label>
              <div className="relative">
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@campus.edu"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] placeholder:text-[#64666E]"
                />
                <Mail className="w-4 h-4 text-[#64666E] absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="block text-xs font-bold text-[#1C1D1F] mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#60B5FF] placeholder:text-[#64666E]"
                />
                <Lock className="w-4 h-4 text-[#64666E] absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Submit Button (Primary Action CTA: Sky Blue) */}
            <div className="pt-2">
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] shadow-xs active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signup' ? 'Complete Onboarding & Enter' : 'Sign In to Hub'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Configuration Error State */}
          {!isSupabaseConnected && (
            <div className="p-3.5 rounded-2xl bg-[#F35252]/10 border border-[#F35252]/30 text-xs text-[#F35252] font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#F35252]" />
              <div>
                <span className="font-bold">Database Not Configured:</span> Supabase environment variables are missing. Please configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> to enable student authentication.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#60B5FF] animate-spin" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
