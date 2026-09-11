export type DocumentType =
  | 'Notes'
  | 'Assignment'
  | 'Experiment'
  | 'End-Sem Exam Paper'
  | 'Midsem Paper';

export type DbDocumentType =
  | 'notes'
  | 'assignment'
  | 'experiment'
  | 'end_sem_exam_paper'
  | 'midsem_paper'
  | 'Notes'
  | 'Assignment'
  | 'Experiment'
  | 'End-Sem Exam Paper'
  | 'Midsem Paper';

export function toDbDocumentType(type: DocumentType | string): DbDocumentType {
  switch (type.toLowerCase().trim()) {
    case 'assignment':
      return 'Assignment';
    case 'experiment':
      return 'Experiment';
    case 'end-sem exam paper':
    case 'end_sem_exam_paper':
      return 'End-Sem Exam Paper';
    case 'midsem paper':
    case 'midsem_paper':
      return 'Midsem Paper';
    case 'notes':
    default:
      return 'Notes';
  }
}

export function fromDbDocumentType(type: string): DocumentType {
  switch (type.toLowerCase().trim()) {
    case 'assignment':
      return 'Assignment';
    case 'experiment':
      return 'Experiment';
    case 'end_sem_exam_paper':
    case 'end-sem exam paper':
      return 'End-Sem Exam Paper';
    case 'midsem_paper':
    case 'midsem paper':
      return 'Midsem Paper';
    case 'notes':
    default:
      return 'Notes';
  }
}

export type Semester =
  | 'Sem 1'
  | 'Sem 2'
  | 'Sem 3'
  | 'Sem 4'
  | 'Sem 5'
  | 'Sem 6'
  | 'Sem 7'
  | 'Sem 8';

export type Year = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';

export interface Profile {
  id: string;
  full_name: string;
  year?: Year | null;
  semester?: Semester | null;
  department?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: DocumentType;
  semester: Semester;
  subject?: string;
  uploader_id: string;
  deadline?: string | null; // ISO string for assignments/experiments
  file_path: string; // Object key in Backblaze B2 Resources-hub bucket
  file_name: string;
  file_size: number;
  file_type: string;
  page_count: number;
  file_hash: string;
  created_at: string;
  uploader?: Profile;
}

export interface DocumentPage {
  id: string;
  document_id: string;
  page_number: number;
  content: string;
  created_at?: string;
}

export interface SearchResultMatch {
  document_id: string;
  document_title: string;
  type: DocumentType;
  semester: Semester;
  subject?: string;
  uploader_name: string;
  uploader_avatar?: string | null;
  uploader_id: string;
  page_number: number;
  snippet: string;
  summary?: string;
  file_path: string;
  file_name: string;
  relevance_score?: number;
}

export interface AISearchResponse {
  answer: string;
  matches: SearchResultMatch[];
  query: string;
  mode: 'gemini' | 'keyword_fallback';
  rateLimitRemaining?: number;
}

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'deadline'
  | 'semester_asc'
  | 'semester_desc';

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number; // 10 GB
  usedPercentage: number;
  fileCount: number;
  freeBytes: number;
}
