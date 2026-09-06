'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useDocuments } from '@/context/DocumentContext';
import {
  GraduationCap,
  Sparkles,
  UploadCloud,
  User,
  LogOut,
  ChevronDown,
  Users,
  FileText,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenAI: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload, onOpenAI }) => {
  const { user, logout, switchDemoUser, isSupabaseConnected } = useAuth();
  const { documents } = useDocuments();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E8E8E3] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#60B5FF] flex items-center justify-center text-[#FFFFFF] shadow-xs group-hover:bg-[#60B5FF]/90 transition-colors">
                <GraduationCap className="w-5 h-5 text-[#FFFFFF]" />
              </div>
              <div>
                <div className="font-bold text-[#1C1D1F] tracking-tight flex items-center gap-1.5 text-base sm:text-lg font-heading">
                  Campus Document Hub
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#FAFAF8] text-[#64666E] border border-[#E8E8E3]">
                    BTech
                  </span>
                </div>
                <div className="text-xs text-[#64666E] hidden sm:block font-medium">
                  Notes • Assignments • Experiments • Exam Papers
                </div>
              </div>
            </Link>

            {/* Quick Stat Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAFAF8] text-xs font-semibold text-[#64666E] border border-[#E8E8E3]">
              <FileText className="w-3.5 h-3.5 text-[#60B5FF]" />
              <span>{documents.length} verified documents</span>
            </div>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* AI Assistant Quick Trigger (Primary Action - #60B5FF) */}
            <button
              id="nav-ai-assistant-btn"
              onClick={onOpenAI}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#60B5FF] hover:bg-[#60B5FF]/90 text-[#FFFFFF] shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FFFFFF]" />
              <span>AI Assistant</span>
              <kbd className="inline-block px-1.5 py-0.5 text-[10px] font-mono bg-[#FFFFFF]/20 text-[#FFFFFF] rounded">
                Search
              </kbd>
            </button>

            {/* Upload Document Button (Action) */}
            <button
              id="nav-upload-doc-btn"
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#FFFFFF] border border-[#E8E8E3] hover:border-[#60B5FF] hover:bg-[#FAFAF8] text-[#1C1D1F] shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-[#60B5FF]" />
              <span>Upload</span>
            </button>

            {/* User Profile & Demo Switcher */}
            {user ? (
              <div className="relative">
                <button
                  id="nav-user-dropdown-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-[#E8E8E3] hover:bg-[#FAFAF8] transition-colors cursor-pointer bg-[#FFFFFF]"
                >
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#FAFAF8] border border-[#E8E8E3] flex items-center justify-center flex-shrink-0">
                    {user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-[#64666E]">
                        {user.full_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="text-left text-xs">
                    <div className="font-semibold text-[#1C1D1F] leading-tight">
                      {user.full_name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-[#64666E]">
                      {user.semester} • {user.year}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#64666E]" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#FFFFFF] shadow-lg border border-[#E8E8E3] py-2 z-50">
                      <div className="px-4 py-2.5 border-b border-[#E8E8E3]">
                        <p className="text-xs font-bold text-[#1C1D1F]">
                          {user.full_name}
                        </p>
                        <p className="text-[11px] text-[#64666E] truncate">
                          {user.department}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FAFAF8] text-[#64666E] border border-[#E8E8E3]">
                            {user.year} ({user.semester})
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#1C1D1F] hover:bg-[#FAFAF8] transition-colors"
                        >
                          <User className="w-4 h-4 text-[#60B5FF]" />
                          <span>Student Profile & Upload Counts</span>
                        </Link>
                      </div>

                      {/* Demo User Switcher */}
                      <div className="px-4 py-2 border-t border-[#E8E8E3] bg-[#FAFAF8]">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#64666E] mb-1.5">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-[#60B5FF]" /> Switch Student View
                          </span>
                          {!isSupabaseConnected && (
                            <span className="text-[9px] bg-[#FFFFFF] text-[#64666E] px-1 py-0.2 rounded font-mono border border-[#E8E8E3]">
                              Demo
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            onClick={() => {
                              switchDemoUser('usr_priya_sharma_001');
                              setDropdownOpen(false);
                            }}
                            className={`px-2 py-1 rounded text-[11px] text-left transition-colors cursor-pointer ${
                              user.id === 'usr_priya_sharma_001'
                                ? 'bg-[#60B5FF] text-[#FFFFFF] font-bold'
                                : 'bg-[#FFFFFF] text-[#1C1D1F] border border-[#E8E8E3] hover:bg-[#FAFAF8]'
                            }`}
                          >
                            Priya (CSE)
                          </button>
                          <button
                            onClick={() => {
                              switchDemoUser('usr_arjun_mehta_002');
                              setDropdownOpen(false);
                            }}
                            className={`px-2 py-1 rounded text-[11px] text-left transition-colors cursor-pointer ${
                              user.id === 'usr_arjun_mehta_002'
                                ? 'bg-[#60B5FF] text-[#FFFFFF] font-bold'
                                : 'bg-[#FFFFFF] text-[#1C1D1F] border border-[#E8E8E3] hover:bg-[#FAFAF8]'
                            }`}
                          >
                            Arjun (CSE)
                          </button>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-[#E8E8E3]">
                        <button
                          onClick={() => {
                            logout();
                            setDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F35252] hover:bg-[#F35252]/10 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#FFFFFF] bg-[#60B5FF] hover:bg-[#60B5FF]/90 transition-colors shadow-xs"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Actions: AI quick button & Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenAI}
              className="p-2 rounded-xl bg-[#60B5FF] text-[#FFFFFF] hover:bg-[#60B5FF]/90 transition-colors cursor-pointer"
              title="Search with AI"
              aria-label="AI Search"
            >
              <Sparkles className="w-4 h-4 text-[#FFFFFF]" />
            </button>

            <button
              id="nav-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-[#E8E8E3] text-[#1C1D1F] bg-[#FFFFFF] hover:bg-[#FAFAF8] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8E8E3] bg-[#FFFFFF] px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E3]">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#FFFFFF] border border-[#E8E8E3] flex items-center justify-center flex-shrink-0">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-[#64666E]">
                    {user.full_name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#1C1D1F] truncate">{user.full_name}</div>
                <div className="text-[11px] text-[#64666E] truncate">{user.department}</div>
                <div className="text-[10px] font-bold text-[#60B5FF]">{user.year} • {user.semester}</div>
              </div>
            </div>
          )}

          {/* Action Buttons in Mobile Menu */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenUpload();
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#FFFFFF] border border-[#E8E8E3] hover:border-[#60B5FF] text-[#1C1D1F] shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-[#60B5FF]" />
              <span>Upload Doc</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAI();
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#60B5FF] hover:bg-[#60B5FF]/90 text-[#FFFFFF] shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FFFFFF]" />
              <span>AI Search</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 pt-1 border-t border-[#E8E8E3]">
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1C1D1F] hover:bg-[#FAFAF8] transition-colors"
            >
              <User className="w-4 h-4 text-[#60B5FF]" />
              <span>Student Profile & Upload Breakdown</span>
            </Link>
          </div>

          {/* Demo User Switcher in Mobile Drawer */}
          {user && (
            <div className="p-3 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E3] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#1C1D1F]">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#60B5FF]" /> Switch Student View
                </span>
                {!isSupabaseConnected && (
                  <span className="text-[9px] bg-[#FFFFFF] text-[#64666E] px-1.5 py-0.5 rounded font-mono border border-[#E8E8E3]">
                    Demo Mode
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    switchDemoUser('usr_priya_sharma_001');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center transition-colors cursor-pointer ${
                    user.id === 'usr_priya_sharma_001'
                      ? 'bg-[#60B5FF] text-[#FFFFFF]'
                      : 'bg-[#FFFFFF] text-[#1C1D1F] border border-[#E8E8E3]'
                  }`}
                >
                  Priya (CSE)
                </button>
                <button
                  onClick={() => {
                    switchDemoUser('usr_arjun_mehta_002');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center transition-colors cursor-pointer ${
                    user.id === 'usr_arjun_mehta_002'
                      ? 'bg-[#60B5FF] text-[#FFFFFF]'
                      : 'bg-[#FFFFFF] text-[#1C1D1F] border border-[#E8E8E3]'
                  }`}
                >
                  Arjun (CSE)
                </button>
              </div>
            </div>
          )}

          {/* Sign Out / Sign In */}
          <div className="pt-1">
            {user ? (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#F35252] hover:bg-[#F35252]/10 border border-transparent transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-bold bg-[#60B5FF] text-[#FFFFFF] shadow-xs"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
