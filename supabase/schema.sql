-- ==============================================================================
-- CAMPUS DOCUMENT HUB - COMPLETE SUPABASE POSTGRES SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PROFILES TABLE (Keyed to auth.users.id)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    year TEXT CHECK (year IS NULL OR year IN ('1st Year', '2nd Year', '3rd Year', '4th Year')),
    semester TEXT CHECK (semester IS NULL OR semester IN ('Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8')),
    department TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Migration helpers for existing databases
ALTER TABLE public.profiles ALTER COLUMN year DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN semester DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN department DROP NOT NULL;

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_year_semester ON public.profiles(year, semester);

-- 3. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Notes', 'Assignment', 'Experiment', 'End-Sem Exam Paper', 'Midsem Paper')),
    semester TEXT NOT NULL CHECK (semester IN ('Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8')),
    subject TEXT,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    deadline TIMESTAMPTZ, -- Nullable; populated for 'Assignment' and 'Experiment'
    file_path TEXT NOT NULL, -- Relative path in 'documents' bucket e.g. <uploader_id>/<doc_id>.pdf
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'application/pdf',
    page_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON public.documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_semester ON public.documents(semester);
CREATE INDEX IF NOT EXISTS idx_documents_deadline ON public.documents(deadline);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

-- 4. DOCUMENT PAGES (Extracted text per page for granular AI search & direct page jumping)
CREATE TABLE IF NOT EXISTS public.document_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doc_pages_doc_id ON public.document_pages(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_pages_page_num ON public.document_pages(document_id, page_number);

-- Full Text Search index on page content and document title
CREATE INDEX IF NOT EXISTS idx_doc_pages_fts ON public.document_pages USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_documents_fts ON public.documents USING gin(to_tsvector('english', title || ' ' || COALESCE(subject, '')));

-- 5. TRIGGER FOR NEW AUTH USERS (Automatically creates profile row upon signup or OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        year,
        semester,
        department,
        avatar_url
    )
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
            split_part(NEW.email, '@', 1),
            'Student User'
        ),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'year'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'semester'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''),
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
        )
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;

-- 6.1 PROFILES POLICIES
-- Anyone authenticated can view student profiles (to display uploader name & avatar)
CREATE POLICY "Allow authenticated users to read profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- User can insert their own profile
CREATE POLICY "Allow users to insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- User can only update their own profile
CREATE POLICY "Allow users to update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 6.2 DOCUMENTS POLICIES
-- All authenticated users can browse and search documents across campus
CREATE POLICY "Allow authenticated users to read documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (true);

-- Users can only insert documents where uploader_id is their own auth.uid()
CREATE POLICY "Allow users to insert their own documents"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploader_id);

-- Only the uploader can update their document metadata
CREATE POLICY "Allow users to update their own documents"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (auth.uid() = uploader_id)
    WITH CHECK (auth.uid() = uploader_id);

-- Only the uploader can delete their own documents
CREATE POLICY "Allow users to delete their own documents"
    ON public.documents FOR DELETE
    TO authenticated
    USING (auth.uid() = uploader_id);

-- 6.3 DOCUMENT PAGES POLICIES
-- All authenticated users can read extracted pages for AI assistant search
CREATE POLICY "Allow authenticated users to read document pages"
    ON public.document_pages FOR SELECT
    TO authenticated
    USING (true);

-- Only the document uploader can insert pages for their documents
CREATE POLICY "Allow uploader to insert document pages"
    ON public.document_pages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE id = document_pages.document_id
            AND uploader_id = auth.uid()
        )
    );

-- Only the document uploader can delete document pages
CREATE POLICY "Allow uploader to delete document pages"
    ON public.document_pages FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE id = document_pages.document_id
            AND uploader_id = auth.uid()
        )
    );

-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKET CONFIGURATION & POLICIES
-- ==============================================================================
-- Execute these in Supabase SQL editor or ensure buckets 'documents' and 'avatars' exist.

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 7.1 DOCUMENTS STORAGE POLICIES
-- Allow authenticated users to view/download documents
CREATE POLICY "Allow authenticated users to view documents storage"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'documents');

-- Allow authenticated users to upload only into their own folder: <auth.uid()>/...
CREATE POLICY "Allow authenticated users to upload documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow users to delete only files in their own folder
CREATE POLICY "Allow users to delete their own storage documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'documents' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 7.2 AVATARS STORAGE POLICIES
-- Publicly readable avatars
CREATE POLICY "Allow public read for avatars"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

-- Allow user to upload avatar into their own folder
CREATE POLICY "Allow authenticated users to upload avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow user to update/delete their avatar
CREATE POLICY "Allow users to delete their avatar"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
