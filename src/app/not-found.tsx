import React from 'react';
import Link from 'next/link';
import { GraduationCap, FileQuestion, ArrowLeft, Mail } from 'lucide-react';

export const metadata = {
  title: '404 - Document or Route Not Found | Campus Document Hub',
  description: 'The requested academic document or campus hub route does not exist or may have been deleted.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1C1D1F] flex flex-col justify-between selection:bg-[#60B5FF]/20 selection:text-[#1C1D1F]">
      {/* Top Brand Bar */}
      <header className="border-b border-[#E8E8E3] py-4 px-6 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#60B5FF] flex items-center justify-center text-[#FFFFFF] shadow-sm group-hover:bg-[#4ea5ef] transition-colors">
              <GraduationCap className="w-5 h-5 text-[#FFFFFF]" />
            </div>
            <div>
              <span className="font-bold text-[#1C1D1F] tracking-tight text-base sm:text-lg font-poppins">
                Campus Document Hub
              </span>
              <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3]">
                BTech
              </span>
            </div>
          </Link>

          <a
            href="mailto:support@campusdochub.edu"
            className="text-xs font-semibold text-[#64666E] hover:text-[#1C1D1F] transition-colors flex items-center gap-1"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">support@campusdochub.edu</span>
          </a>
        </div>
      </header>

      {/* Main 404 Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center bg-[#FFFFFF] p-8 sm:p-12 rounded-3xl border border-[#E8E8E3] shadow-lg">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#F79D65]/15 text-[#F79D65] border border-[#F79D65]/30 flex items-center justify-center mb-6 shadow-xs">
            <FileQuestion className="w-10 h-10 text-[#F79D65]" />
          </div>

          <span className="font-mono text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#F35252]/10 text-[#F35252] border border-[#F35252]/30">
            HTTP 404
          </span>

          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-[#1C1D1F] tracking-tight font-poppins">
            Document or Page Not Found
          </h1>

          <p className="mt-3 text-sm text-[#64666E] font-medium leading-relaxed">
            The document link you followed may have expired, been deleted by its uploader, or the address was mistyped.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#4ea5ef] text-[#FFFFFF] shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Documents</span>
            </Link>

            <a
              href="mailto:support@campusdochub.edu?subject=Missing%20Document%20Report"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-[#E8E8E3] text-[#1C1D1F] hover:bg-[#FAFAF8] bg-[#FFFFFF] transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#64666E]" />
              <span>Contact Campus Support</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E8E3] py-4 text-center text-xs text-[#64666E] font-medium bg-[#FFFFFF]">
        Campus Document Hub • B.Tech Student Academic Network • Need assistance? Email{' '}
        <a href="mailto:support@campusdochub.edu" className="text-[#60B5FF] underline font-bold">
          support@campusdochub.edu
        </a>
      </footer>
    </div>
  );
}
