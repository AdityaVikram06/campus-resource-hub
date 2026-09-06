'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { DocumentItem, DocumentPage, DocumentType, Semester, SortOption } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { validateDocumentFile, convertImagesToPdf } from '@/lib/pdfConverter';

interface DocumentContextType {
  documents: DocumentItem[];
  pages: DocumentPage[];
  isLoading: boolean;
  isSupabaseConnected: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedType: DocumentType | 'All';
  setSelectedType: (type: DocumentType | 'All') => void;
  selectedSemester: Semester | 'All';
  setSelectedSemester: (sem: Semester | 'All') => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
  totalPages: number;
  totalFilteredCount: number;
  paginatedDocuments: DocumentItem[];
  uploadDocument: (params: {
    title: string;
    type: DocumentType;
    semester: Semester;
    subject?: string;
    deadline?: string | null;
    file?: File;
    files?: File[];
    onProgress?: (status: string) => void;
  }) => Promise<{ success: boolean; documentId?: string; error?: string }>;
  deleteDocument: (documentId: string) => Promise<{ success: boolean; error?: string }>;
  getDocumentPdfUrl: (doc: DocumentItem) => Promise<string>;
  createDocumentSignedUrl: (filePath: string, expiresInSeconds?: number) => Promise<string>;
  refreshDocuments: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// In-memory cache of signed document URLs
const pdfBlobUrlCache = new Map<string, string>();

const DEMO_DOCUMENTS: DocumentItem[] = [
  {
    id: 'demo-doc-1',
    title: 'Data Structures & Algorithms - Complete Notes',
    subject: 'Data Structures',
    type: 'Notes',
    semester: 'Sem 3',
    uploader_id: '00000000-0000-0000-0000-000000000001',
    file_path: 'demo/dsa-notes.pdf',
    file_name: 'dsa-notes.pdf',
    file_size: 1024 * 1024,
    file_type: 'pdf',
    page_count: 5,
    created_at: '2026-01-01T00:00:00.000Z',
    uploader: {
      id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Demo Student',
      year: '3rd Year',
      semester: 'Sem 5',
      department: 'Computer Science & Engineering',
      avatar_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  },
  {
    id: 'demo-doc-2',
    title: 'Computer Networks - Lab Assignment 3',
    subject: 'Computer Networks',
    type: 'Assignment',
    semester: 'Sem 5',
    uploader_id: '00000000-0000-0000-0000-000000000001',
    file_path: 'demo/networks-report.docx',
    file_name: 'networks-report.docx',
    file_size: 512 * 1024,
    file_type: 'docx',
    page_count: 3,
    created_at: '2026-01-01T00:00:00.000Z',
    uploader: {
      id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Demo Student',
      year: '3rd Year',
      semester: 'Sem 5',
      department: 'Computer Science & Engineering',
      avatar_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  },
];

// Helper function to clean up legacy test uploads with bad string IDs (doc_...)
async function cleanupLegacyDocUploads(userId: string) {
  if (!isSupabaseConfigured || !supabase || !userId) return;
  try {
    const { data: files, error } = await supabase.storage
      .from('documents')
      .list(userId);

    if (!error && files && files.length > 0) {
      const badFiles = files
        .filter((f) => f.name.startsWith('doc_'))
        .map((f) => `${userId}/${f.name}`);

      if (badFiles.length > 0) {
        console.log('[Storage Cleanup] Removing legacy test files:', badFiles);
        await supabase.storage.from('documents').remove(badFiles);
      }
    }
  } catch (cleanErr) {
    console.warn('[Storage Cleanup] Non-blocking cleanup error:', cleanErr);
  }
}

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<DocumentType | 'All'>('All');
  const [selectedSemester, setSelectedSemester] = useState<Semester | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  // Load real documents from Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select(`
            *,
            uploader:profiles(*)
          `)
          .order('created_at', { ascending: false });

        const { data: pagesData } = await supabase
          .from('document_pages')
          .select('*');

        if (!docsError && docs && docs.length > 0) {
          setDocuments(docs as DocumentItem[]);
          setPages((pagesData || []) as DocumentPage[]);
        } else {
          setDocuments(DEMO_DOCUMENTS);
          setPages([]);
        }
      } catch (err) {
        console.error('Failed to load documents from Supabase:', err);
        setDocuments(DEMO_DOCUMENTS);
        setPages([]);
      }
    } else {
      setDocuments(DEMO_DOCUMENTS);
      setPages([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clean up any legacy test uploads that used invalid 'doc_...' string IDs in storage
  useEffect(() => {
    if (user?.id) {
      cleanupLegacyDocUploads(user.id);
    }
  }, [user?.id]);

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let result = [...documents];

    // Filter by type
    if (selectedType !== 'All') {
      result = result.filter((doc) => doc.type === selectedType);
    }

    // Filter by semester
    if (selectedSemester !== 'All') {
      result = result.filter((doc) => doc.semester === selectedSemester);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((doc) => {
        const titleMatch = doc.title.toLowerCase().includes(q);
        const subjectMatch = doc.subject ? doc.subject.toLowerCase().includes(q) : false;
        const uploaderMatch = doc.uploader?.full_name ? doc.uploader.full_name.toLowerCase().includes(q) : false;
        const typeMatch = doc.type.toLowerCase().includes(q);
        const semMatch = doc.semester.toLowerCase().includes(q);

        // Also search in document pages content
        const pageMatch = pages.some(
          (p) => p.document_id === doc.id && p.content.toLowerCase().includes(q)
        );

        return titleMatch || subjectMatch || uploaderMatch || typeMatch || semMatch || pageMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'deadline': {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        case 'semester_asc':
          return a.semester.localeCompare(b.semester);
        case 'semester_desc':
          return b.semester.localeCompare(a.semester);
        default:
          return 0;
      }
    });

    return result;
  }, [documents, pages, selectedType, selectedSemester, searchQuery, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedSemester, sortBy]);

  // Calculate pagination
  const totalFilteredCount = filteredAndSortedDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / itemsPerPage));

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedDocuments.slice(start, start + itemsPerPage);
  }, [filteredAndSortedDocuments, currentPage, itemsPerPage]);

  // Upload Document
  const uploadDocument = useCallback(
    async (params: {
      title: string;
      type: DocumentType;
      semester: Semester;
      subject?: string;
      deadline?: string | null;
      file?: File;
      files?: File[];
      onProgress?: (status: string) => void;
    }) => {
      const { title, type, semester, subject, deadline, file, files, onProgress } = params;

      if (!user) {
        return { success: false, error: 'You must be signed in to upload documents.' };
      }

      if (!isSupabaseConfigured || !supabase) {
        return {
          success: false,
          error: 'Supabase database is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and key to .env.local.',
        };
      }

      const selectedFiles = files && files.length > 0 ? files : file ? [file] : [];
      if (selectedFiles.length === 0) {
        return { success: false, error: 'Please select a file to upload.' };
      }

      onProgress?.('Validating document format and size...');
      for (const f of selectedFiles) {
        const validation = validateDocumentFile(f);
        if (!validation.valid) {
          return { success: false, error: validation.error || `File ${f.name} is invalid.` };
        }
      }

      // Check if all selected files are images
      const areAllImages = selectedFiles.every(
        (f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name)
      );

      if (selectedFiles.length > 1 && !areAllImages) {
        return {
          success: false,
          error: 'Multiple file selection is only supported when combining images into a single PDF.',
        };
      }

      try {
        let finalFile: File = selectedFiles[0];
        let isConverted = false;
        let pageCount = 1;

        if (areAllImages) {
          onProgress?.(
            selectedFiles.length > 1
              ? `Combining and converting ${selectedFiles.length} images into a single PDF...`
              : 'Converting uploaded image to standardized PDF...'
          );
          try {
            const conversion = await convertImagesToPdf(selectedFiles, onProgress);
            finalFile = conversion.pdfFile;
            pageCount = conversion.pageCount;
            isConverted = true;
          } catch (convErr) {
            console.error('Image to PDF conversion failed:', convErr);
            return {
              success: false,
              error: 'Image conversion failed. Please try different images or upload a PDF.',
            };
          }
        }

        const cleanFileName = isConverted
          ? (selectedFiles.length > 1
              ? `${title.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'merged_document'}.pdf`
              : `${selectedFiles[0].name.replace(/\.[^/.]+$/, '')}.pdf`)
          : finalFile.name;
        const fileExt = isConverted
          ? 'pdf'
          : (finalFile.name.split('.').pop()?.toLowerCase() || 'bin');
        const storagePath = `${user.id}/${Date.now()}.${fileExt}`;
        const contentType = isConverted
          ? 'application/pdf'
          : (finalFile.type || 'application/octet-stream');


        if (!supabase) {
          return { success: false, error: 'Supabase client is not available.' };
        }

        onProgress?.('Uploading document to secure storage...');
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, finalFile, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          return { success: false, error: `Storage upload failed: ${uploadError.message}` };
        }

        onProgress?.('Indexing document metadata and subject tags...');
        // Insert document row with the real file_path already populated.
        // The 'id' column is omitted so Postgres auto-generates a valid UUID via DEFAULT gen_random_uuid()
        const { data: insertedDoc, error: insertError } = await supabase
          .from('documents')
          .insert({
            title: title.trim(),
            type,
            semester,
            subject: subject?.trim() || null,
            uploader_id: user.id,
            deadline: deadline || null,
            file_path: storagePath,
            file_name: cleanFileName,
            file_size: finalFile.size,
            file_type: contentType,
            page_count: pageCount,
          })
          .select(`
            *,
            uploader:profiles(*)
          `)
          .single();

        if (insertError || !insertedDoc) {
          console.error('Database insert failed, rolling back uploaded storage file:', insertError);
          // Delete uploaded storage object so no orphaned file is left
          await supabase.storage.from('documents').remove([storagePath]);
          return { success: false, error: `Database insert failed: ${insertError?.message}` };
        }

        // Insert document_pages for all pages to support AI search & direct page jumping
        const newPageRows = Array.from({ length: pageCount }, (_, idx) => ({
          document_id: insertedDoc.id,
          page_number: idx + 1,
          content: `${title} - Page ${idx + 1} of ${pageCount}. Course: ${
            subject || 'General BTech'
          }. Category: ${type}, ${semester}. Uploaded by ${user.full_name}.`,
        }));

        const { error: pageError } = await supabase.from('document_pages').insert(newPageRows);
        if (pageError) {
          console.warn('Warning: Failed to index document pages:', pageError);
        }

        // Update local state
        const formattedDoc = insertedDoc as DocumentItem;
        setDocuments((prev) => [formattedDoc, ...prev]);
        setPages((prev) => [...prev, ...(newPageRows as DocumentPage[])]);

        // Cleanup any legacy doc_... orphaned test uploads in the background
        cleanupLegacyDocUploads(user.id);

        return { success: true, documentId: insertedDoc.id };
      } catch (err) {
        console.error('Upload error in Supabase mode:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Upload failed' };
      }
    },
    [user]
  );

  // Delete Document (Protected by RLS check)
  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (!user) {
        return { success: false, error: 'You must be logged in to delete documents.' };
      }

      const docToDelete = documents.find((d) => d.id === documentId);
      if (!docToDelete) {
        return { success: false, error: 'Document not found.' };
      }

      // RLS Check: Only uploader can delete
      if (docToDelete.uploader_id !== user.id) {
        return {
          success: false,
          error: 'RLS Security Violation: You can only delete documents that you uploaded.',
        };
      }

      if (isSupabaseConfigured && supabase) {
        try {
          // Delete from storage
          await supabase.storage.from('documents').remove([docToDelete.file_path]);

          // Delete from database (document_pages cascade automatically)
          const { error } = await supabase.from('documents').delete().eq('id', documentId);
          if (error) {
            return { success: false, error: error.message };
          }

          pdfBlobUrlCache.delete(docToDelete.file_path);
          setDocuments((prev) => prev.filter((d) => d.id !== documentId));
          setPages((prev) => prev.filter((p) => p.document_id !== documentId));

          return { success: true };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : 'Delete failed' };
        }
      } else {
        return { success: false, error: 'Supabase database is not configured.' };
      }
    },
    [user, documents]
  );

  // Get PDF / file Url for viewer (cached)
  const getDocumentPdfUrl = useCallback(
    async (doc: DocumentItem): Promise<string> => {
      if (pdfBlobUrlCache.has(doc.file_path)) {
        return pdfBlobUrlCache.get(doc.file_path)!;
      }

      if (doc.id.startsWith('demo-')) {
        try {
          const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
          const pdfDoc = await PDFDocument.create();
          const timesRoman = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const page = pdfDoc.addPage([595.28, 841.89]);
          page.drawText(doc.title, { x: 50, y: 780, size: 18, font: timesRoman, color: rgb(0.1, 0.1, 0.1) });
          page.drawText(`Subject: ${doc.subject || 'General'} | Type: ${doc.type} | Semester: ${doc.semester}`, {
            x: 50,
            y: 750,
            size: 11,
            font: timesRoman,
            color: rgb(0.4, 0.4, 0.4),
          });
          page.drawText('This is a demo document generated for verifying the built-in document viewer.', {
            x: 50,
            y: 700,
            size: 12,
            font: timesRoman,
            color: rgb(0.2, 0.2, 0.2),
          });
          page.drawText('Try zooming in and out with Ctrl + Scroll Wheel, trackpad pinch, or the zoom controls above.', {
            x: 50,
            y: 670,
            size: 12,
            font: timesRoman,
            color: rgb(0.2, 0.5, 0.8),
          });
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          pdfBlobUrlCache.set(doc.file_path, url);
          return url;
        } catch {
          return '';
        }
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.file_path, 3600);

          if (!error && data?.signedUrl) {
            pdfBlobUrlCache.set(doc.file_path, data.signedUrl);
            return data.signedUrl;
          }
        } catch (err) {
          console.warn('Could not create signed URL for document:', err);
        }
      }

      throw new Error(`Document file unavailable in storage: ${doc.file_name}`);
    },
    []
  );

  // Generate short-lived signed URL (e.g. for Google Docs Viewer or temporary access)
  const createDocumentSignedUrl = useCallback(
    async (filePath: string, expiresInSeconds: number = 600): Promise<string> => {
      if (filePath.startsWith('demo/')) {
        if (filePath.endsWith('.pdf')) {
          return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        }
        return 'https://calibre-ebook.com/downloads/demos/demo.docx';
      }


      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, expiresInSeconds);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
        if (error) {
          throw new Error(error.message);
        }
      }
      throw new Error('Supabase storage not configured');
    },
    []
  );

  return (
    <DocumentContext.Provider
      value={{
        documents,
        pages,
        isLoading,
        isSupabaseConnected: isSupabaseConfigured,
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
        uploadDocument,
        deleteDocument,
        getDocumentPdfUrl,
        createDocumentSignedUrl,
        refreshDocuments: loadData,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};
