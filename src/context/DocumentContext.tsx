'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { DocumentItem, DocumentPage, DocumentType, Semester, SortOption } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_DOCUMENTS, INITIAL_DOCUMENT_PAGES, generateSamplePdfDocument } from '@/lib/mockData';
import { useAuth } from './AuthContext';
import { validateDocumentFile, convertImageToPdf } from '@/lib/pdfConverter';

interface DocumentContextType {
  documents: DocumentItem[];
  pages: DocumentPage[];
  isLoading: boolean;
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
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

const LOCAL_STORAGE_DOCS_KEY = 'campus_hub_docs_v1';
const LOCAL_STORAGE_PAGES_KEY = 'campus_hub_pages_v1';

// In-memory cache of generated or uploaded PDF Object URLs
const pdfBlobUrlCache = new Map<string, string>();

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

  // Load documents
  useEffect(() => {
    async function loadData() {
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
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error('Supabase documents load error, falling back to local store:', err);
        }
      }

      // Local storage or default mock documents
      if (typeof window !== 'undefined') {
        const savedDocs = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
        const savedPages = localStorage.getItem(LOCAL_STORAGE_PAGES_KEY);

        if (savedDocs) {
          try {
            setDocuments(JSON.parse(savedDocs));
          } catch {
            setDocuments(INITIAL_DOCUMENTS);
          }
        } else {
          setDocuments(INITIAL_DOCUMENTS);
        }

        if (savedPages) {
          try {
            setPages(JSON.parse(savedPages));
          } catch {
            setPages(INITIAL_DOCUMENT_PAGES);
          }
        } else {
          setPages(INITIAL_DOCUMENT_PAGES);
        }
      } else {
        setDocuments(INITIAL_DOCUMENTS);
        setPages(INITIAL_DOCUMENT_PAGES);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  // Save changes to localStorage in local mode
  const persistLocalData = (newDocs: DocumentItem[], newPages: DocumentPage[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(newDocs));
      localStorage.setItem(LOCAL_STORAGE_PAGES_KEY, JSON.stringify(newPages));
    }
  };

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let result = [...documents];

    // Filter by Type
    if (selectedType !== 'All') {
      result = result.filter((d) => d.type === selectedType);
    }

    // Filter by Semester
    if (selectedSemester !== 'All') {
      result = result.filter((d) => d.semester === selectedSemester);
    }

    // Search bar filter: title, type, uploader name, semester, subject
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((d) => {
        const titleMatch = d.title.toLowerCase().includes(q);
        const typeMatch = d.type.toLowerCase().includes(q);
        const semMatch = d.semester.toLowerCase().includes(q);
        const uploaderMatch = d.uploader?.full_name.toLowerCase().includes(q);
        const subjectMatch = d.subject?.toLowerCase().includes(q);
        return titleMatch || typeMatch || semMatch || uploaderMatch || subjectMatch;
      });
    }

    // Sort controls
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'deadline') {
        // Items with deadlines first, nearest deadline first
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'semester_asc') {
        return a.semester.localeCompare(b.semester);
      }
      if (sortBy === 'semester_desc') {
        return b.semester.localeCompare(a.semester);
      }
      return 0;
    });

    return result;
  }, [documents, selectedType, selectedSemester, searchQuery, sortBy]);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedSemester, sortBy]);

  // Pagination calculation
  const totalFilteredCount = filteredAndSortedDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / itemsPerPage));
  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedDocuments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedDocuments, currentPage, itemsPerPage]);

  // Upload Document
  const uploadDocument = useCallback(
    async ({
      title,
      type,
      semester,
      subject,
      deadline,
      file,
      onProgress,
    }: {
      title: string;
      type: DocumentType;
      semester: Semester;
      subject?: string;
      deadline?: string | null;
      file: File;
      onProgress?: (status: string) => void;
    }) => {
      if (!user) {
        return { success: false, error: 'You must be logged in to upload documents.' };
      }

      // Step 1: Validate file format and size
      const validation = validateDocumentFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Invalid file.' };
      }

      onProgress?.('Preparing document for upload...');

      let finalFile = file;
      let pageCount = 1;

      // Step 2: Auto-convert images to PDF
      if (validation.isImage) {
        onProgress?.('Converting image to PDF format...');
        try {
          const converted = await convertImageToPdf(file);
          finalFile = converted.pdfFile;
          pageCount = converted.pageCount;
        } catch (convErr) {
          console.error('Image conversion error:', convErr);
          return {
            success: false,
            error: 'Failed to convert image to PDF. Please try a different image or upload a PDF directly.',
          };
        }
      }

      const docId = `doc_${Date.now()}`;
      const cleanFileName = finalFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${docId}_${cleanFileName}`;

      onProgress?.('Uploading to secure campus storage...');

      // Step 3: Handle Supabase or Local Mode
      if (isSupabaseConfigured && supabase) {
        try {
          // Upload to Supabase storage bucket 'documents'
          const { error: storageError } = await supabase.storage
            .from('documents')
            .upload(storagePath, finalFile, {
              contentType: 'application/pdf',
              upsert: false,
            });

          if (storageError) {
            return { success: false, error: `Storage upload failed: ${storageError.message}` };
          }

          // Insert row into 'documents' table
          const newDocRow = {
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
            created_at: new Date().toISOString(),
          };

          const { data: insertedDoc, error: insertError } = await supabase
            .from('documents')
            .insert(newDocRow)
            .select('*, uploader:profiles(*)')
            .single();

          if (insertError || !insertedDoc) {
            return { success: false, error: `Database insert failed: ${insertError?.message}` };
          }

          // Insert default extracted page text for AI search
          const newPageRow = {
            document_id: insertedDoc.id,
            page_number: 1,
            content: `${title}. Course: ${subject || 'BTech'}. Type: ${type}, ${semester}. Uploaded by ${user.full_name}. Verified student document.`,
          };
          await supabase.from('document_pages').insert(newPageRow);

          // Update local state
          const formattedDoc = insertedDoc as DocumentItem;
          setDocuments((prev) => [formattedDoc, ...prev]);
          setPages((prev) => [...prev, newPageRow as DocumentPage]);

          return { success: true, documentId: insertedDoc.id };
        } catch (err) {
          console.error('Upload error in Supabase mode:', err);
          return { success: false, error: err instanceof Error ? err.message : 'Upload failed' };
        }
      } else {
        // Local mode
        const objectUrl = URL.createObjectURL(finalFile);
        pdfBlobUrlCache.set(storagePath, objectUrl);

        const newDoc: DocumentItem = {
          id: docId,
          title: title.trim(),
          type,
          semester,
          subject: subject?.trim() || undefined,
          uploader_id: user.id,
          deadline: deadline || null,
          file_path: storagePath,
          file_name: cleanFileName,
          file_size: finalFile.size,
          file_type: 'application/pdf',
          page_count: pageCount,
          created_at: new Date().toISOString(),
          uploader: user,
        };

        const newPage: DocumentPage = {
          id: `page_${docId}_1`,
          document_id: docId,
          page_number: 1,
          content: `${title}. Subject: ${subject || 'BTech'}. Category: ${type}, ${semester}. Contributed by ${user.full_name}. Verified academic resource.`,
        };

        const updatedDocs = [newDoc, ...documents];
        const updatedPages = [...pages, newPage];

        setDocuments(updatedDocs);
        setPages(updatedPages);
        persistLocalData(updatedDocs, updatedPages);

        return { success: true, documentId: docId };
      }
    },
    [user, documents, pages]
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
          const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId)
            .eq('uploader_id', user.id); // Double guard with auth check

          if (dbError) {
            return { success: false, error: dbError.message };
          }
        } catch (err) {
          console.error('Delete error:', err);
          return { success: false, error: err instanceof Error ? err.message : 'Delete failed' };
        }
      }

      // Update local state
      const updatedDocs = documents.filter((d) => d.id !== documentId);
      const updatedPages = pages.filter((p) => p.document_id !== documentId);
      setDocuments(updatedDocs);
      setPages(updatedPages);
      persistLocalData(updatedDocs, updatedPages);

      // Clean up cached blob URL
      if (pdfBlobUrlCache.has(docToDelete.file_path)) {
        URL.revokeObjectURL(pdfBlobUrlCache.get(docToDelete.file_path)!);
        pdfBlobUrlCache.delete(docToDelete.file_path);
      }

      return { success: true };
    },
    [user, documents, pages]
  );

  // Get in-browser viewing PDF Blob URL for any document
  const getDocumentPdfUrl = useCallback(
    async (doc: DocumentItem): Promise<string> => {
      // 1. Check if already cached
      if (pdfBlobUrlCache.has(doc.file_path)) {
        return pdfBlobUrlCache.get(doc.file_path)!;
      }

      // 2. If Supabase is connected, get signed URL or public URL
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.file_path, 3600); // 1 hour valid

          if (!error && data?.signedUrl) {
            pdfBlobUrlCache.set(doc.file_path, data.signedUrl);
            return data.signedUrl;
          }
        } catch (err) {
          console.warn('Could not create signed URL, generating mock PDF:', err);
        }
      }

      // 3. Fallback: generate high-fidelity PDF from mockData generator
      const pdfBytes = await generateSamplePdfDocument(doc, pages);
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      pdfBlobUrlCache.set(doc.file_path, objectUrl);
      return objectUrl;
    },
    [pages]
  );

  return (
    <DocumentContext.Provider
      value={{
        documents,
        pages,
        isLoading,
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
