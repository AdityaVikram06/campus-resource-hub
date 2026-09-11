-- Migration: Add missing file_hash column to documents table and reload PostgREST schema cache
-- Enables O(1) duplicate-file detection before cloud storage

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Create index for fast duplicate lookups
CREATE INDEX IF NOT EXISTS documents_file_hash_idx 
ON public.documents (file_hash);

-- Refresh PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
