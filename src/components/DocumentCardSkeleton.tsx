'use client';

import React from 'react';

export const DocumentCardSkeleton: React.FC = () => {
  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E8E3] p-5 shadow-xs flex flex-col justify-between min-h-[260px] animate-skeleton">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-18 rounded-full bg-[#E8E8E3] animate-pulse" />
            <div className="h-5 w-14 rounded-full bg-[#E8E8E3] animate-pulse" />
          </div>
          <div className="h-5 w-20 rounded-full bg-[#E8E8E3]/60 animate-pulse" />
        </div>

        {/* Title placeholder */}
        <div className="space-y-2 mb-3">
          <div className="h-5 w-full bg-[#E8E8E3] rounded-lg animate-pulse" />
          <div className="h-4 w-3/4 bg-[#E8E8E3]/70 rounded-lg animate-pulse" />
        </div>

        {/* Subject tag placeholder */}
        <div className="h-3.5 w-1/2 bg-[#E8E8E3]/50 rounded-md mb-4 animate-pulse" />

        {/* Uploader Name Display */}
        <div className="flex items-center gap-2 pt-2 pb-3 border-t border-[#E8E8E3]">
          <div className="w-6 h-6 rounded-full bg-[#E8E8E3] flex-shrink-0 animate-pulse" />
          <div className="h-3.5 w-32 bg-[#E8E8E3]/80 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Card Footer: Metadata & Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-20 bg-[#E8E8E3]/60 rounded animate-pulse" />
          <div className="h-3 w-12 bg-[#E8E8E3]/60 rounded animate-pulse" />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-9 rounded-xl bg-[#E8E8E3] animate-pulse" />
          <div className="w-9 h-9 rounded-xl bg-[#E8E8E3] animate-pulse" />
          <div className="w-9 h-9 rounded-xl bg-[#E8E8E3] animate-pulse" />
        </div>
      </div>
    </div>
  );
};
