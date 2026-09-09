-- Migration: Add file_hash to documents table for duplicate file detection
-- Indexed to enable O(1) duplicate checks before file storage

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Create index for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_documents_file_hash 
ON public.documents(file_hash) 
WHERE file_hash IS NOT NULL;
