-- Migration: Ensure UUID generation defaults on documents and document_pages tables
-- Applied to ensure documents.id and document_pages.id auto-generate standard UUIDv4 on INSERT

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure documents.id default is gen_random_uuid()
ALTER TABLE public.documents 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure document_pages.id default is gen_random_uuid()
ALTER TABLE public.document_pages 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
