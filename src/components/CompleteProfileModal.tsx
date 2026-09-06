'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Year, Semester } from '@/types';
import { GraduationCap, Building, Calendar, ArrowRight, Loader2, Sparkles } from 'lucide-react';

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
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [year, setYear] = useState<Year>((user?.year as Year) || '3rd Year');
  const [semester, setSemester] = useState<Semester>((user?.semester as Semester) || 'Sem 5');
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await updateProfile({
      year,
      semester,
      department,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      showToast(result.error, 'error');
    } else {
      showToast('Academic profile updated successfully!', 'success');
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1D1F]/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FFFFFF] rounded-3xl shadow-2xl border border-[#E8E8E3] overflow-hidden p-6 sm:p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3] flex items-center justify-center mb-3 shadow-xs">
            <GraduationCap className="w-6 h-6 text-[#60B5FF]" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFE588]/30 text-[#1C1D1F] text-[11px] font-bold border border-[#FFE588] mb-2">
            <Sparkles className="w-3 h-3 text-[#F79D65]" />
            <span>One-Time Setup</span>
          </div>
          <h2 className="text-xl font-bold text-[#1C1D1F] font-poppins">
            Complete Your Academic Profile
          </h2>
          <p className="text-xs text-[#64666E] font-medium mt-1">
            Welcome, <strong>{user.full_name}</strong>! Select your branch and semester to personalize your study archive.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#F35252]/10 border border-[#F35252]/30 text-xs text-[#F35252] font-bold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Department / Branch */}
          <div>
            <label htmlFor="modal-department" className="block text-xs font-bold text-[#1C1D1F] mb-1">
              Engineering Department / Branch *
            </label>
            <div className="relative">
              <select
                id="modal-department"
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
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] shadow-xs active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving details...</span>
                </>
              ) : (
                <>
                  <span>Save Academic Details</span>
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
