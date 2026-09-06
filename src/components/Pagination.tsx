'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-[#E8E8E3] text-xs text-[#64666E]">
      
      {/* Items Range & Per Page Selector */}
      <div className="flex items-center gap-4">
        <span>
          Showing <strong className="text-[#1C1D1F]">{startItem}</strong> to{' '}
          <strong className="text-[#1C1D1F]">{endItem}</strong> of{' '}
          <strong className="text-[#1C1D1F]">{totalItems}</strong> documents
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-[#64666E] text-[11px]">Per page:</span>
          <select
            id="pagination-items-per-page"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="py-1 px-2 rounded-lg border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#60B5FF] cursor-pointer"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          id="pagination-prev-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] hover:bg-[#FAFAF8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4 text-[#1C1D1F]" />
        </button>

        {/* Page Numbers */}
        {getPageNumbers().map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={`page_${p}`}
              id={`pagination-page-${p}`}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentPage === p
                  ? 'bg-[#60B5FF] text-[#FFFFFF] shadow-xs'
                  : 'text-[#1C1D1F] bg-[#FFFFFF] border border-[#E8E8E3] hover:bg-[#FAFAF8]'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={`ellipsis_${idx}`} className="px-1 text-[#64666E] font-mono">
              ...
            </span>
          )
        )}

        {/* Next */}
        <button
          id="pagination-next-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] hover:bg-[#FAFAF8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4 text-[#1C1D1F]" />
        </button>
      </div>
    </div>
  );
};
