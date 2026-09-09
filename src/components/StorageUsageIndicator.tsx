'use client';

import React, { useMemo } from 'react';
import { useDocuments } from '@/context/DocumentContext';
import { HardDrive, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StorageUsageIndicatorProps {
  variant?: 'modal' | 'navbar' | 'sidebar' | 'inline';
  className?: string;
  showNote?: boolean;
}

export const StorageUsageIndicator: React.FC<StorageUsageIndicatorProps> = ({
  variant = 'modal',
  className = '',
  showNote = true,
}) => {
  const { storageStats, isLoading } = useDocuments();

  const {
    usedBytes = 0,
    quotaBytes = 10 * 1024 * 1024 * 1024,
    usedPercentage = 0,
    fileCount = 0,
  } = storageStats || {};

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i >= 2 ? 1 : 0)} ${sizes[i]}`;
  };

  const formattedUsed = useMemo(() => formatSize(usedBytes), [usedBytes]);
  const formattedQuota = useMemo(() => formatSize(quotaBytes), [quotaBytes]);

  // Dynamic color states:
  // Neutral/blue under 70%, amber warning between 70-90%, red alert above 90%
  const ringColor = useMemo(() => {
    if (usedPercentage > 90) return '#F35252'; // error-coral
    if (usedPercentage >= 70) return '#F79D65'; // warn-orange
    return '#60B5FF'; // action-blue
  }, [usedPercentage]);

  const textColor = useMemo(() => {
    if (usedPercentage > 90) return 'text-[#F35252]';
    if (usedPercentage >= 70) return 'text-[#F79D65]';
    return 'text-[#1C1D1F]';
  }, [usedPercentage]);

  // SVG Circular Ring geometry
  const size = variant === 'navbar' ? 32 : 44;
  const strokeWidth = variant === 'navbar' ? 3.5 : 4.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Ensure a tiny visible dot if used > 0 but percentage < 1%
  const safePercentage = Math.min(100, Math.max(0, usedPercentage));
  const strokeDashoffset = circumference - (safePercentage / 100) * circumference;

  const disclaimerNote = (
    <p className="text-[11px] text-[#64666E] leading-snug font-medium">
      Please don&apos;t misuse the resource hub — upload only what&apos;s necessary, and avoid uploading the same file more than once.
    </p>
  );

  // Variant 1: Navbar / Dropdown (Ultra-compact)
  if (variant === 'navbar') {
    return (
      <div className={`p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E8E3] space-y-2 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="rotate-[-90deg]">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#E8E8E3"
                strokeWidth={strokeWidth}
                fill="none"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={ringColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className="absolute text-[9px] font-bold font-mono text-[#1C1D1F]">
              {safePercentage.toFixed(0)}%
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#1C1D1F] flex items-center gap-1.5">
              <span>B2 Storage</span>
              <span className="text-[10px] font-normal text-[#64666E]">
                ({formattedUsed} / {formattedQuota})
              </span>
            </div>
            <div className="text-[10px] text-[#64666E] font-medium">
              {fileCount} {fileCount === 1 ? 'file' : 'files'} uploaded
            </div>
          </div>
        </div>
        {showNote && disclaimerNote}
      </div>
    );
  }

  // Variant 2: Sidebar (Profile page)
  if (variant === 'sidebar') {
    return (
      <div className={`bg-[#FFFFFF] rounded-2xl border border-[#E8E8E3] p-4.5 shadow-xs space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#60B5FF]" />
            <h4 className="text-xs font-bold text-[#1C1D1F] uppercase tracking-wider">
              Cloud Storage Usage
            </h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#64666E] border border-[#E8E8E3]">
            10 GB Free Tier
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="rotate-[-90deg]">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#F0F0EB"
                strokeWidth={strokeWidth}
                fill="none"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={ringColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className="absolute text-[10px] font-bold font-mono text-[#1C1D1F]">
              {safePercentage.toFixed(0)}%
            </span>
          </div>

          <div className="space-y-0.5">
            <div className={`text-sm font-extrabold ${textColor}`}>
              {formattedUsed} <span className="text-xs font-normal text-[#64666E]">used of {formattedQuota}</span>
            </div>
            <p className="text-[11px] text-[#64666E] font-medium">
              Backblaze B2 encrypted bucket ({fileCount} {fileCount === 1 ? 'file' : 'files'})
            </p>
          </div>
        </div>

        {showNote && (
          <div className="pt-2 border-t border-[#E8E8E3]">
            {disclaimerNote}
          </div>
        )}
      </div>
    );
  }

  // Variant 3: Modal (Default - Compact & Unobtrusive)
  return (
    <div
      className={`p-3 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E3] space-y-2 transition-all min-h-[72px] ${className}`}
      data-testid="circular-storage-indicator"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Circular Progress Ring */}
          <div
            className="relative flex-shrink-0 flex items-center justify-center"
            style={{ width: size, height: size }}
          >
            <svg width={size} height={size} className="rotate-[-90deg]">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#E8E8E3"
                strokeWidth={strokeWidth}
                fill="none"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={ringColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className="absolute text-[10px] font-bold font-mono text-[#1C1D1F]">
              {safePercentage < 0.1 && safePercentage > 0 ? '<1%' : `${safePercentage.toFixed(0)}%`}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1D1F]">
              <span>Storage Used:</span>
              <span className={textColor}>{formattedUsed}</span>
              <span className="text-[#64666E] font-normal">/ {formattedQuota}</span>
            </div>
            <div className="text-[11px] text-[#64666E] font-medium">
              Backblaze B2 • {fileCount} {fileCount === 1 ? 'file' : 'files'} indexed
            </div>
          </div>
        </div>

        {/* Small Status Pill */}
        <div className="flex-shrink-0">
          {safePercentage >= 90 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#F35252] border border-red-200">
              <AlertTriangle className="w-3 h-3" />
              <span>Full</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>Healthy</span>
            </span>
          )}
        </div>
      </div>

      {showNote && (
        <div className="pt-1.5 border-t border-[#E8E8E3]">
          {disclaimerNote}
        </div>
      )}
    </div>
  );
};
