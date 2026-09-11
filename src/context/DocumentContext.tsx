'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  DocumentItem,
  DocumentPage,
  DocumentType,
  Semester,
  SortOption,
  StorageStats,
  toDbDocumentType,
  fromDbDocumentType,
} from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { validateDocumentFile, convertImagesToPdf } from '@/lib/pdfConverter';
import { computeFileSHA256 } from '@/lib/hashUtils';

interface DocumentContextType {
  documents: DocumentItem[];
  pages: DocumentPage[];
  isLoading: boolean;
  isSupabaseConnected: boolean;
  storageStats: StorageStats;
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
  }) => Promise<{
    success: boolean;
    documentId?: string;
    error?: string;
    isDuplicate?: boolean;
    duplicateDoc?: DocumentItem;
  }>;
  deleteDocument: (documentId: string) => Promise<{ success: boolean; error?: string }>;
  getDocumentPdfUrl: (doc: DocumentItem) => Promise<string>;
  createDocumentSignedUrl: (filePath: string, expiresInSeconds?: number) => Promise<string>;
  refreshDocuments: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

const B2_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB Free Tier

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

  // Real-Time Storage Statistics (10 GB Backblaze B2 Free Tier)
  const storageStats = useMemo<StorageStats>(() => {
    const usedBytes = documents.reduce((acc, doc) => acc + (Number(doc.file_size) || 0), 0);
    const freeBytes = Math.max(0, B2_QUOTA_BYTES - usedBytes);
    const usedPercentage = Math.min(100, (usedBytes / B2_QUOTA_BYTES) * 100);
    return {
      usedBytes,
      quotaBytes: B2_QUOTA_BYTES,
      usedPercentage,
      fileCount: documents.length,
      freeBytes,
    };
  }, [documents]);

  // Load documents and pages from Supabase
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
          const normalizedDocs: DocumentItem[] = docs.map((d) => ({
            ...d,
            type: fromDbDocumentType(d.type),
            file_hash: d.file_hash || '',
          }));

          setDocuments(normalizedDocs);
          setPages((pagesData || []) as DocumentPage[]);
        } else {
          setDocuments([]);
          setPages([]);
        }
      } catch {
        setDocuments([]);
        setPages([]);
      }
    } else {
      setDocuments([]);
      setPages([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

        const pageMatch = pages.some(
          (p) => p.document_id === doc.id && p.content && p.content.toLowerCase().includes(q)
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

  /**
   * Storage-First, DB-Second Upload Pipeline:
   * 1. Compute binary SHA-256 hash.
   * 2. Check for duplicate row in Supabase documents table.
   * 3. Images converted to PDF via pdf-lib. PDFs & Office docs stored in native format.
   * 4. Request short-lived presigned upload URL from /api/get-upload-url.
   * 5. Upload file directly from browser to Backblaze B2 via PUT.
   * 6. Confirm 200 OK from B2.
   * 7. Insert row into Supabase documents table with real file_path key and genuine file_type.
   * 8. Insert document_pages for text search.
   */
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

      const selectedFiles = files && files.length > 0 ? files : file ? [file] : [];
      if (selectedFiles.length === 0) {
        return { success: false, error: 'Please select a file to upload.' };
      }

      onProgress?.('Validating document format and size (max 25 MB)...');
      for (const f of selectedFiles) {
        const validation = validateDocumentFile(f);
        if (!validation.valid) {
          return { success: false, error: validation.error || `File ${f.name} is invalid.` };
        }
      }

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
        // Step 1: Compute binary SHA-256 hash for duplicate-file detection
        onProgress?.('Checking for duplicate files across campus...');
        const primaryFile = selectedFiles[0];
        const fileHash = await computeFileSHA256(primaryFile);

        // Step 2: Check for existing document with identical file_hash
        const existingLocal = documents.find((d) => d.file_hash === fileHash);
        if (existingLocal) {
          const uploaderName = existingLocal.uploader?.full_name || 'another student';
          return {
            success: false,
            isDuplicate: true,
            duplicateDoc: existingLocal,
            error: `Duplicate file detected: This exact file has already been uploaded as "${existingLocal.title}" by ${uploaderName}.`,
          };
        }

        if (isSupabaseConfigured && supabase) {
          try {
            const fetchPromise = supabase
              .from('documents')
              .select(`
                *,
                uploader:profiles(*)
              `)
              .eq('file_hash', fileHash)
              .maybeSingle();

            const timeoutPromise = new Promise<{ data: null }>((resolve) =>
              setTimeout(() => resolve({ data: null }), 1200)
            );

            const res = (await Promise.race([fetchPromise, timeoutPromise])) as {
              data: any;
            };

            const existingDoc = res?.data;
            if (existingDoc) {
              const typedDoc: DocumentItem = {
                ...(existingDoc as unknown as DocumentItem),
                type: fromDbDocumentType(existingDoc.type),
              };
              const uploaderName = typedDoc.uploader?.full_name || 'another student';
              return {
                success: false,
                isDuplicate: true,
                duplicateDoc: typedDoc,
                error: `Duplicate file detected: This exact file has already been uploaded as "${typedDoc.title}" by ${uploaderName}.`,
              };
            }
          } catch {}
        }

        // Step 3: Handle formats (Images -> PDF via pdf-lib; PDFs & Office files uploaded as-is)
        let finalFile: File = selectedFiles[0];
        const rawExt = (primaryFile.name.split('.').pop() || 'pdf').toLowerCase();
        let originalFormat = rawExt;
        let pageCount = 1;

        const isAlreadyPdf = primaryFile.type === 'application/pdf' || rawExt === 'pdf';
        const isOfficeDoc = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'odt', 'odp', 'ods', 'txt', 'csv'].includes(rawExt);

        if (areAllImages) {
          onProgress?.(
            selectedFiles.length > 1
              ? `Combining and converting ${selectedFiles.length} images into a single PDF...`
              : 'Converting image to standardized PDF...'
          );
          try {
            const conversion = await convertImagesToPdf(selectedFiles, onProgress);
            finalFile = conversion.pdfFile;
            pageCount = conversion.pageCount;
            originalFormat = selectedFiles.length > 1 ? 'images' : rawExt || 'image';
          } catch (convErr) {
            console.error('Image to PDF conversion failed:', convErr);
            return {
              success: false,
              error: 'Image conversion failed. Please try different images or upload a PDF.',
            };
          }
        } else if (isAlreadyPdf) {
          finalFile = primaryFile;
          originalFormat = 'pdf';
          try {
            const { PDFDocument } = await import('pdf-lib');
            const arrayBuffer = await finalFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            pageCount = pdfDoc.getPageCount() || 1;
          } catch {
            pageCount = 1;
          }
        } else if (isOfficeDoc) {
          // Native Office document upload (viewed directly via Microsoft Office Online Viewer)
          finalFile = primaryFile;
          originalFormat = rawExt;
          pageCount = 1;
        }

        // Step 4: Request short-lived presigned upload URL from Backblaze B2 endpoint
        onProgress?.('Requesting secure Backblaze B2 direct upload URL...');
        const baseName =
          selectedFiles.length > 1
            ? `${title.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'merged_document'}`
            : primaryFile.name.replace(/\.[^/.]+$/, '');
        const cleanFileName = areAllImages ? `${baseName}.pdf` : `${baseName}.${rawExt}`;

        const presignedRes = await fetch('/api/get-upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: cleanFileName,
            fileSize: finalFile.size,
            contentType: finalFile.type || undefined,
            fileHash,
          }),
        });

        if (!presignedRes.ok) {
          const errData = await presignedRes.json().catch(() => ({}));
          throw new Error(errData.error || `Could not obtain upload URL (${presignedRes.status})`);
        }

        const { uploadUrl, key: b2Key, contentType: signedContentType } = await presignedRes.json();

        // Step 5: Upload file to Backblaze B2 (Direct PUT with automatic server proxy fallback)
        onProgress?.('Uploading document directly to Backblaze B2 cloud storage...');
        let uploadSucceeded = false;

        try {
          const b2UploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: finalFile,
            headers: {
              'Content-Type': signedContentType || finalFile.type || 'application/octet-stream',
            },
          });

          if (b2UploadRes.ok) {
            uploadSucceeded = true;
          } else {
            console.warn(`Direct B2 PUT returned ${b2UploadRes.status}, attempting fallback relay...`);
          }
        } catch (directErr) {
          console.warn('Direct B2 PUT encountered network/CORS error, activating server relay:', directErr);
        }

        // Fallback: If direct PUT failed or was blocked by browser, upload via server proxy
        if (!uploadSucceeded) {
          onProgress?.('Finalizing upload via secure cloud storage relay...');
          const formData = new FormData();
          formData.append('file', finalFile);
          formData.append('key', b2Key);
          formData.append('contentType', signedContentType || finalFile.type || 'application/octet-stream');

          const proxyRes = await fetch('/api/upload-b2-proxy', {
            method: 'POST',
            body: formData,
          });

          if (!proxyRes.ok) {
            const errData = await proxyRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Upload to Backblaze B2 storage failed.');
          }
        }

        // Step 6: Insert document row into Supabase database (or fallback to local session)
        onProgress?.('Confirming cloud storage and indexing document metadata...');
        const dbDocType = toDbDocumentType(type);
        const hasDeadline = type === 'Assignment' || type === 'Experiment';

        let insertedDoc = null;
        if (isSupabaseConfigured && supabase) {
          try {
            const insertPayload = {
              title: title.trim(),
              type: dbDocType,
              semester,
              subject: subject?.trim() || null,
              uploader_id: user.id,
              deadline: hasDeadline ? deadline || null : null,
              file_path: b2Key, // Backblaze B2 Resources-hub object key
              file_name: cleanFileName,
              file_size: finalFile.size,
              file_type: originalFormat, // True stored format (docx, pptx, xlsx, pdf)
              page_count: pageCount,
              file_hash: fileHash,
            };

            let { data, error: insertError } = await supabase
              .from('documents')
              .insert(insertPayload)
              .select(`
                *,
                uploader:profiles(*)
              `)
              .single();

            // Resilient retry if DB check constraint expects lowercase vs capitalized format
            if (insertError && insertError.message?.includes('documents_type_check')) {
              const fallbackType = dbDocType === type ? dbDocType.toLowerCase() : type;
              const retryRes = await supabase
                .from('documents')
                .insert({ ...insertPayload, type: fallbackType })
                .select(`
                  *,
                  uploader:profiles(*)
                `)
                .single();
              data = retryRes.data;
              insertError = retryRes.error;
            }

            if (insertError) {
              throw new Error(`Failed to save document record: ${insertError.message}`);
            }
            if (data) {
              insertedDoc = data;
            }
          } catch (dbErr: unknown) {
            console.error('Supabase insert error:', dbErr);
            throw dbErr;
          }
        } else {
          throw new Error('Supabase client is not configured.');
        }

        const formattedDoc: DocumentItem = {
          ...insertedDoc,
          type: fromDbDocumentType(insertedDoc.type),
          file_hash: insertedDoc.file_hash || fileHash,
        };

        // Step 7: Index document_pages for search
        const newPageRows = Array.from({ length: pageCount }, (_, idx) => ({
          document_id: formattedDoc.id,
          page_number: idx + 1,
          content: `${title} - Page ${idx + 1} of ${pageCount}. Course: ${
            subject || 'General BTech'
          }. Category: ${type}, ${semester}. Uploaded by ${user.full_name}.`,
        }));

        if (supabase) {
          try {
            await supabase.from('document_pages').insert(newPageRows);
          } catch {
            // Page indexing error non-fatal
          }
        }

        // Update local state
        setDocuments((prev) => [formattedDoc, ...prev.filter((d) => d.id !== formattedDoc.id)]);
        setPages((prev) => [...prev, ...(newPageRows as DocumentPage[])]);

        return { success: true, documentId: formattedDoc.id };
      } catch (err: unknown) {
        console.error('Upload error in B2 pipeline:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Upload failed' };
      }
    },
    [user, documents]
  );

  // Delete Document (Calls /api/documents/[id] which deletes from B2 and Supabase)
  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (!user) {
        return { success: false, error: 'You must be logged in to delete documents.' };
      }

      const docToDelete = documents.find((d) => d.id === documentId);
      if (!docToDelete) {
        return { success: false, error: 'Document not found.' };
      }

      if (docToDelete.uploader_id !== user.id) {
        return {
          success: false,
          error: 'RLS Security Violation: You can only delete documents that you uploaded.',
        };
      }

      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Delete failed with status ${res.status}`);
        }

        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
        setPages((prev) => prev.filter((p) => p.document_id !== documentId));

        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : 'Delete failed' };
      }
    },
    [user, documents]
  );

  /**
   * "Generate Fresh, Never Store" Pattern:
   * Always requests a fresh signed URL from Backblaze B2 on-demand (30 minutes expiry).
   * Never stores or caches signed URLs in client memory or database.
   */
  const createDocumentSignedUrl = useCallback(
    async (filePath: string, expiresInSeconds: number = 1800): Promise<string> => {
      try {
        const res = await fetch(
          `/api/documents/view-url?key=${encodeURIComponent(filePath)}&expiresIn=${expiresInSeconds}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.viewUrl) {
            return data.viewUrl;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch fresh presigned view URL from B2:', err);
      }

      throw new Error(`Could not generate secure view URL for "${filePath}".`);
    },
    []
  );

  const getDocumentPdfUrl = useCallback(
    async (doc: DocumentItem): Promise<string> => {
      return createDocumentSignedUrl(doc.file_path, 1800);
    },
    [createDocumentSignedUrl]
  );

  return (
    <DocumentContext.Provider
      value={{
        documents,
        pages,
        isLoading,
        isSupabaseConnected: isSupabaseConfigured,
        storageStats,
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
