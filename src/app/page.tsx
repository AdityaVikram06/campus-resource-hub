'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDocuments } from '@/context/DocumentContext';
import { DocumentItem, DocumentType, Semester, SortOption } from '@/types';
import { DocumentCard } from '@/components/DocumentCard';
import { Pagination } from '@/components/Pagination';
import { UploadModal } from '@/components/UploadModal';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { CompleteProfileModal } from '@/components/CompleteProfileModal';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Sparkles,
  LayoutGrid,
  List,
  Clock,
  Loader2,
} from 'lucide-react';

const TYPE_PILLS: (DocumentType | 'All')[] = [
  'All',
  'Notes',
  'Assignment',
  'Experiment',
  'End-Sem Exam Paper',
  'Midsem Paper',
];

const SEMESTERS: (Semester | 'All')[] = [
  'All',
  'Sem 1',
  'Sem 2',
  'Sem 3',
  'Sem 4',
  'Sem 5',
  'Sem 6',
  'Sem 7',
  'Sem 8',
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const {
    documents,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    selectedSemester,
    setSelectedSemester,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalFilteredCount,
    paginatedDocuments,
  } = useDocuments();

  const { needsAcademicDetails } = useAuth();

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);
  const [viewerInitialPage, setViewerInitialPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Deep-link check: open document viewer if ?doc=<id> is in URL
  useEffect(() => {
    const docId = searchParams.get('doc') || searchParams.get('view');
    if (docId && documents.length > 0) {
      const targetDoc = documents.find((d) => d.id === docId);
      if (targetDoc) {
        setViewerDoc(targetDoc);
        const pageStr = searchParams.get('page');
        if (pageStr) {
          const p = parseInt(pageStr, 10);
          if (!isNaN(p) && p > 0) setViewerInitialPage(p);
        }
      }
    }
  }, [searchParams, documents]);

  // Handle open viewer and update URL query param
  const handleOpenViewer = (doc: DocumentItem, pageNumber: number = 1) => {
    setViewerDoc(doc);
    setViewerInitialPage(pageNumber);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('doc', doc.id);
      if (pageNumber > 1) {
        url.searchParams.set('page', pageNumber.toString());
      } else {
        url.searchParams.delete('page');
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  // Handle close viewer and remove doc query param
  const handleCloseViewer = () => {
    setViewerDoc(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('doc');
      url.searchParams.delete('page');
      window.history.replaceState(null, '', url.pathname + (url.search || ''));
    }
  };

  // Counts by type
  const getTypeCount = (type: DocumentType | 'All') => {
    if (type === 'All') return documents.length;
    return documents.filter((d) => d.type === type).length;
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'Notes':
        return 'bg-[#FFE588] text-[#1C1D1F] border-[#FFE588]';
      case 'Assignment':
        return 'bg-[#F79D65] text-[#FFFFFF] border-[#F79D65]';
      case 'Midsem Paper':
        return 'bg-[#F79D65] text-[#FFFFFF] border-[#F79D65]';
      case 'Experiment':
        return 'bg-[#5EF2D5] text-[#1C1D1F] border-[#5EF2D5]';
      case 'End-Sem Exam Paper':
        return 'bg-[#F35252] text-[#FFFFFF] border-[#F35252]';
      default:
        return 'bg-[#FAFAF8] text-[#1C1D1F] border-[#E8E8E3]';
    }
  };

  const getDeadlineInfo = (deadlineStr?: string | null) => {
    if (!deadlineStr) return null;
    const deadlineDate = new Date(deadlineStr);
    const now = new Date();
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return {
        label: 'Overdue: ' + deadlineDate.toLocaleDateString(),
        className: 'text-[#F35252] font-bold',
      };
    }
    if (diffHours <= 48) {
      return {
        label: 'Due soon: ' + deadlineDate.toLocaleDateString(),
        className: 'text-[#F79D65] font-bold',
      };
    }
    return {
      label: deadlineDate.toLocaleDateString(),
      className: 'text-[#64666E] font-medium',
    };
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1C1D1F] flex flex-col selection:bg-[#60B5FF]/20 selection:text-[#1C1D1F]">
      {/* Navigation */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
      />

      {/* Hero Banner with Campus Hub Overview */}
      <section className="relative overflow-hidden bg-[#FFFFFF] border-b border-[#E8E8E3] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAFAF8] text-[#60B5FF] text-xs font-bold mb-3 border border-[#E8E8E3]">
              <Sparkles className="w-3.5 h-3.5 text-[#60B5FF] animate-pulse" />
              <span>Campus Academic Archive with Generative AI Search</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1C1D1F]">
              B.Tech Campus Document Hub
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#64666E] font-medium">
              Browse notes, assignments, lab experiments, exam papers, and midsem papers uploaded by fellow students across semesters.
            </p>
          </div>

          {/* Quick AI Trigger Card */}
          <div className="flex-shrink-0 bg-[#FFFFFF] p-4 rounded-2xl border border-[#E8E8E3] shadow-xs max-w-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAFAF8] text-[#60B5FF] border border-[#E8E8E3] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[#60B5FF]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1C1D1F]">
                Looking for specific lab code or questions?
              </p>
              <button
                id="hero-ai-search-btn"
                onClick={() => setIsAIOpen(true)}
                className="mt-1 text-xs text-[#60B5FF] hover:text-[#4ea5ef] font-bold flex items-center gap-1 cursor-pointer underline"
              >
                Ask AI Assistant &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Search, Sort & Filters Toolbar */}
        <div className="bg-[#FFFFFF] rounded-2xl p-4 border border-[#E8E8E3] shadow-xs space-y-4">
          
          {/* Top Row: Search Input & View Switcher */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#64666E] absolute left-3.5 top-3.5" />
              <input
                id="dashboard-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, subject, semester, or uploader name (e.g. 'OS Experiment', 'Priya', 'DBMS')..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] text-[#1C1D1F] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#60B5FF] transition-all placeholder:text-[#64666E]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-xs text-[#64666E] hover:text-[#1C1D1F] font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1.5 text-xs text-[#64666E] font-bold flex-shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#60B5FF]" />
                <span>Sort by:</span>
              </div>
              <select
                id="dashboard-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="py-2 px-3 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#60B5FF] cursor-pointer"
              >
                <option value="newest">Most Recent Uploads</option>
                <option value="oldest">Oldest First</option>
                <option value="deadline">Upcoming Deadlines First</option>
                <option value="semester_asc">Semester (Ascending)</option>
                <option value="semester_desc">Semester (Descending)</option>
              </select>

              {/* Grid / Table Toggle */}
              <div className="hidden sm:flex items-center border border-[#E8E8E3] rounded-xl p-0.5 bg-[#FAFAF8]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#FFFFFF] text-[#1C1D1F] shadow-xs'
                      : 'text-[#64666E] hover:text-[#1C1D1F]'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-[#FFFFFF] text-[#1C1D1F] shadow-xs'
                      : 'text-[#64666E] hover:text-[#1C1D1F]'
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Filter Pills for Document Types & Semester Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-[#E8E8E3]">
            
            {/* Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {TYPE_PILLS.map((type) => (
                <button
                  key={type}
                  id={`filter-pill-${type.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    selectedType === type
                      ? 'bg-[#60B5FF] text-[#FFFFFF] border-[#60B5FF] shadow-xs'
                      : 'bg-[#FFFFFF] text-[#1C1D1F] border-[#E8E8E3] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <span>{type}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      selectedType === type
                        ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                        : 'bg-[#FAFAF8] text-[#64666E]'
                    }`}
                  >
                    {getTypeCount(type)}
                  </span>
                </button>
              ))}
            </div>

            {/* Semester Dropdown Filter */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <Filter className="w-3.5 h-3.5 text-[#60B5FF]" />
              <span className="text-xs text-[#64666E] font-bold">Semester:</span>
              <select
                id="dashboard-semester-select"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value as Semester | 'All')}
                className="py-1 px-2.5 rounded-xl border border-[#E8E8E3] bg-[#FFFFFF] text-[#1C1D1F] text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#60B5FF] cursor-pointer"
              >
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem === 'All' ? 'All Semesters' : sem}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Documents Grid / Table */}
        {totalFilteredCount === 0 ? (
          <div className="py-16 text-center bg-[#FFFFFF] rounded-2xl border border-[#E8E8E3] p-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFE588]/30 text-[#1C1D1F] border border-[#FFE588] flex items-center justify-center mb-3">
              <FileText className="w-8 h-8 text-[#1C1D1F]" />
            </div>
            <h3 className="text-base font-bold text-[#1C1D1F] mb-1">
              No documents matched your filters
            </h3>
            <p className="text-xs text-[#64666E] font-medium max-w-md mx-auto mb-4">
              Try adjusting your search terms, changing the semester filter, or be the first to upload resources for this course!
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('All');
                setSelectedSemester('All');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FAFAF8] text-[#1C1D1F] border border-[#E8E8E3] hover:bg-[#E8E8E3] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={(selected) => handleOpenViewer(selected)}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E8E3] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF8] border-b border-[#E8E8E3] text-[#64666E] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">Document Title</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Semester</th>
                    <th className="px-4 py-3">Uploader</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Uploaded</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E3]">
                  {paginatedDocuments.map((doc) => {
                    const deadlineInfo = getDeadlineInfo(doc.deadline);
                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-[#FAFAF8] transition-colors"
                      >
                        <td className="px-4 py-3 font-bold text-[#1C1D1F] max-w-xs truncate">
                          <button
                            onClick={() => handleOpenViewer(doc)}
                            className="hover:text-[#60B5FF] text-left font-bold cursor-pointer"
                          >
                            {doc.title}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold px-2 py-0.5 rounded-full border text-[10px] ${getTypeBadgeStyle(doc.type)}`}>
                            {doc.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#64666E] font-semibold">
                          {doc.semester}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#1C1D1F]">
                          {doc.uploader?.full_name || 'Contributor'}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {deadlineInfo ? (
                            <span className={`flex items-center gap-1 ${deadlineInfo.className}`}>
                              <Clock className="w-3 h-3" />
                              {deadlineInfo.label}
                            </span>
                          ) : (
                            <span className="text-[#64666E]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#64666E] font-medium">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleOpenViewer(doc)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#60B5FF] hover:bg-[#60B5FF]/10 border border-[#60B5FF]/30 transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dashboard Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalFilteredCount}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onItemsPerPageChange={(items) => setItemsPerPage(items)}
        />
      </main>

      {/* Upload Document Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onSelectDocument={(doc, page) => handleOpenViewer(doc, page)}
      />

      {/* Built-in Document Viewer Modal */}
      {viewerDoc && (
        <DocumentViewerModal
          document={viewerDoc}
          initialPage={viewerInitialPage}
          onClose={handleCloseViewer}
        />
      )}

      {/* Google OAuth New User Academic Profile Setup Modal */}
      <CompleteProfileModal
        isOpen={needsAcademicDetails}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#60B5FF] animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
