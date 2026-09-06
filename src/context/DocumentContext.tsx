'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { DocumentItem, DocumentPage, DocumentType, Semester, SortOption } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { validateDocumentFile, convertImageToPdf } from '@/lib/pdfConverter';

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
    file: File;
    onProgress?: (status: string) => void;
  }) => Promise<{ success: boolean; documentId?: string; error?: string }>;
  deleteDocument: (documentId: string) => Promise<{ success: boolean; error?: string }>;
  getDocumentPdfUrl: (doc: DocumentItem) => Promise<string>;
  refreshDocuments: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// In-memory cache of signed document URLs
const pdfBlobUrlCache = new Map<string, string>();

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

        if (!docsError && docs) {
          setDocuments(docs as DocumentItem[]);
          setPages((pagesData || []) as DocumentPage[]);
        } else {
          setDocuments([]);
          setPages([]);
        }
      } catch (err) {
        console.error('Failed to load documents from Supabase:', err);
        setDocuments([]);
        setPages([]);
      }
    } else {
      // Supabase is not configured - no fake/mock documents
      setDocuments([]);
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
      file: File;
      onProgress?: (status: string) => void;
    }) => {
      const { title, type, semester, subject, deadline, file, onProgress } = params;

      if (!user) {
        return { success: false, error: 'You must be signed in to upload documents.' };
      }

      if (!isSupabaseConfigured || !supabase) {
        return {
          success: false,
          error: 'Supabase database is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and key to .env.local.',
        };
      }

      onProgress?.('Validating document format and size...');
      const validation = validateDocumentFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      try {
        let finalFile = file;
        let isConverted = false;
        let pageCount = 1;

        // Convert image files (JPG/PNG/WebP) to standard PDF
        if (file.type.startsWith('image/')) {
          onProgress?.('Converting uploaded image to standardized PDF...');
          try {
            const conversion = await convertImageToPdf(file);
            finalFile = conversion.pdfFile;
            pageCount = conversion.pageCount;
            isConverted = true;
          } catch (convErr) {
            console.error('Image to PDF conversion failed:', convErr);
            return { success: false, error: 'Image conversion failed. Please try a different image or upload a PDF.' };
          }
        }

        const cleanFileName = isConverted
          ? `${file.name.replace(/\.[^/.]+$/, '')}.pdf`
          : file.name;
        const fileExt = isConverted ? 'pdf' : (file.name.split('.').pop() || 'pdf');
        // Storage path uses timestamp (independent of the future Postgres-generated UUID)
        const storagePath = `${user.id}/${Date.now()}.${fileExt}`;

        onProgress?.('Uploading document to secure storage...');
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, finalFile, {
            contentType: 'application/pdf',
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
            file_type: 'application/pdf',
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

        // Insert initial page text for AI Assistant indexing using the Postgres-generated UUID
        const newPageRow = {
          document_id: insertedDoc.id,
          page_number: 1,
          content: `${title}. Course: ${subject || 'General BTech'}. Category: ${type}, ${semester}. Uploaded by ${user.full_name}.`,
        };
        const { error: pageError } = await supabase.from('document_pages').insert(newPageRow);
        if (pageError) {
          console.warn('Warning: Failed to index initial document page:', pageError);
        }

        // Update local state
        const formattedDoc = insertedDoc as DocumentItem;
        setDocuments((prev) => [formattedDoc, ...prev]);
        setPages((prev) => [...prev, newPageRow as DocumentPage]);

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

  // Get PDF Url for viewer
  const getDocumentPdfUrl = useCallback(
    async (doc: DocumentItem): Promise<string> => {
      if (pdfBlobUrlCache.has(doc.file_path)) {
        return pdfBlobUrlCache.get(doc.file_path)!;
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
