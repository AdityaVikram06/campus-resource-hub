import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { b2Client, B2_BUCKET_NAME, isB2Configured, getMimeType, MAX_UPLOAD_SIZE_BYTES } from '@/lib/b2';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate calling user
    const cookieStore = await cookies();

    const DEFAULT_SUPABASE_URL = 'https://blkmyaqmonpilrdnaeji.supabase.co';
    const DEFAULT_SUPABASE_KEY = 'sb_publishable_8oAmr8-V6X5JTNbg-PlNVg_Z24Pr41P';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      DEFAULT_SUPABASE_KEY;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be signed in to upload files.' },
        { status: 401 }
      );
    }

    if (!isB2Configured()) {
      return NextResponse.json(
        { error: 'Backblaze B2 storage is not configured.' },
        { status: 503 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const key = formData.get('key') as string | null;
    const contentType = formData.get('contentType') as string | null;

    if (!file || !key) {
      return NextResponse.json(
        { error: 'Missing required parameters: file and key.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File exceeds maximum upload size (25 MB).' },
        { status: 413 }
      );
    }

    // 3. Upload directly to Backblaze B2 from server
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = contentType || file.type || getMimeType(key);

    const command = new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mime,
    });

    await b2Client.send(command);

    return NextResponse.json({
      success: true,
      key,
      message: 'Uploaded to Backblaze B2 via server fallback.',
    });
  } catch (err: unknown) {
    console.error('[B2 Server Proxy Upload Error]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server upload to B2 failed.' },
      { status: 500 }
    );
  }
}
