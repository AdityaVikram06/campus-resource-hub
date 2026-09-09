-- ==============================================================================
-- CAMPUS DOCUMENT HUB: BACKBLAZE B2 STORAGE & SUPABASE RLS MIGRATION
-- Version: 20260909010000
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    year TEXT,
    semester TEXT,
    department TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure nullable academic columns for OAuth onboarding flow
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN year DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN semester DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN department DROP NOT NULL;

-- 3. HANDLE NEW USER TRIGGER (Google sign-in pre-fills name & avatar; year/semester/department left null)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        year,
        semester,
        department,
        avatar_url,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
            SPLIT_PART(NEW.email, '@', 1),
            'Student User'
        ),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'year'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'semester'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''),
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
        ),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. DOCUMENTS TABLE (B2 object keys and exact check constraints)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    semester TEXT NOT NULL,
    uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deadline TIMESTAMPTZ,
    file_path TEXT NOT NULL, -- Key in Backblaze B2 Resources-hub bucket
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    file_hash TEXT NOT NULL, -- SHA-256 binary hash for duplicate detection
    page_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure check constraint matches lowercase snake_case standard
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_type_check 
    CHECK (type IN ('notes', 'assignment', 'experiment', 'end_sem_exam_paper', 'midsem_paper'));

-- Index on file_hash for instantaneous duplicate detection
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON public.documents (file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON public.documents (uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents (type);
CREATE INDEX IF NOT EXISTS idx_documents_semester ON public.documents (semester);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents (created_at DESC);

-- 5. DOCUMENT PAGES TABLE (Extracted text for Gemini AI search)
CREATE TABLE IF NOT EXISTS public.document_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_pages_document_id ON public.document_pages (document_id);
CREATE INDEX IF NOT EXISTS idx_document_pages_page_num ON public.document_pages (document_id, page_number);

-- Full-text search index for keyword fallback
CREATE INDEX IF NOT EXISTS idx_doc_pages_fts ON public.document_pages USING gin(to_tsvector('english', COALESCE(content, '')));

-- 6. ROW LEVEL SECURITY (RLS) - STRICTLY ENABLED
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;

-- 6.1 PROFILES RLS
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- 6.2 DOCUMENTS RLS
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON public.documents;
CREATE POLICY "Allow authenticated users to read documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow users to insert their own documents" ON public.documents;
CREATE POLICY "Allow users to insert their own documents"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = uploader_id);

DROP POLICY IF EXISTS "Allow users to update their own documents" ON public.documents;
CREATE POLICY "Allow users to update their own documents"
    ON public.documents FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = uploader_id)
    WITH CHECK ((SELECT auth.uid()) = uploader_id);

DROP POLICY IF EXISTS "Allow users to delete their own documents" ON public.documents;
CREATE POLICY "Allow users to delete their own documents"
    ON public.documents FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = uploader_id);

-- 6.3 DOCUMENT PAGES RLS
DROP POLICY IF EXISTS "Allow authenticated users to read document pages" ON public.document_pages;
CREATE POLICY "Allow authenticated users to read document pages"
    ON public.document_pages FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow uploader to insert document pages" ON public.document_pages;
CREATE POLICY "Allow uploader to insert document pages"
    ON public.document_pages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE id = document_pages.document_id
            AND uploader_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Allow uploader to delete document pages" ON public.document_pages;
CREATE POLICY "Allow uploader to delete document pages"
    ON public.document_pages FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE id = document_pages.document_id
            AND uploader_id = (SELECT auth.uid())
        )
    );

-- 7. SUPABASE STORAGE: AVATARS BUCKET ONLY (Private, user-scoped)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Clean up storage policies for avatars
DROP POLICY IF EXISTS "Allow authenticated users to view avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to view avatars"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow authenticated users to upload avatar" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

DROP POLICY IF EXISTS "Allow authenticated users to update avatar" ON storage.objects;
CREATE POLICY "Allow authenticated users to update avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

DROP POLICY IF EXISTS "Allow authenticated users to delete avatar" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete avatar"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );
