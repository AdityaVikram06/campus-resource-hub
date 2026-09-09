import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getPresignedUploadUrl, isB2Configured, getMimeType, MAX_UPLOAD_SIZE_BYTES } from '@/lib/b2';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate calling user via Supabase session
    const cookieStore = await cookies();
    const DEFAULT_SUPABASE_URL = 'https://blkmyaqmonpilrdnaeji.supabase.co';
    const DEFAULT_SUPABASE_KEY = 'sb_publishable_8oAmr8-V6X5JTNbg-PlNVg_Z24Pr41P';

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      DEFAULT_SUPABASE_KEY;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Read-only context in route handler
          }
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const userId = (!authError && user) ? user.id : null;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be signed in to request an upload URL.' },
        { status: 401 }
      );
    }

    // 2. Check Backblaze B2 credentials
    if (!isB2Configured()) {
      return NextResponse.json(
        {
          error:
            'Backblaze B2 storage is not configured. Please add B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY to your server environment variables.',
        },
        { status: 503 }
      );
    }

    // 3. Parse request payload
    const body = await request.json().catch(() => ({}));
    const { fileName, fileSize, contentType } = body;

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: "fileName" is required.' },
        { status: 400 }
      );
    }

    if (fileSize && fileSize > MAX_UPLOAD_SIZE_BYTES) {
      const maxMb = Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024));
      return NextResponse.json(
        {
          error: `File size exceeds the allowable limit of ${maxMb} MB for Backblaze B2 storage.`,
        },
        { status: 413 }
      );
    }

    // 4. Sanitize file name and construct B2 storage key with true original extension
    const rawExt = (fileName.split('.').pop() || 'pdf').toLowerCase();
    const sanitizedBase = fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80);
    const key = `${userId}/${Date.now()}_${sanitizedBase || 'document'}.${rawExt}`;

    // 5. Generate presigned PUT URL with exact MIME type
    const mime = contentType || getMimeType(key);
    const uploadUrl = await getPresignedUploadUrl({
      key,
      contentType: mime,
      expiresIn: 1800, // 30 minutes
    });

    return NextResponse.json({
      success: true,
      uploadUrl,
      key,
      contentType: mime,
      bucket: process.env.B2_BUCKET_NAME || 'Resources-hub',
      expiresIn: 1800,
    });
  } catch (err: unknown) {
    console.error('[B2 Presigned Upload URL Error]:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Internal Server Error while generating presigned upload URL.',
      },
      { status: 500 }
    );
  }
}
