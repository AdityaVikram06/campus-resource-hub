import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getPresignedViewUrl, isB2Configured } from '@/lib/b2';

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json(
        { error: 'Missing required query parameter "key".' },
        { status: 400 }
      );
    }

    // 1. Authenticate user
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
        setAll() {},
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const isAuthorized = (!authError && Boolean(user));

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be signed in to access document files.' },
        { status: 401 }
      );
    }

    // 2. Generate presigned GET URL from Backblaze B2
    if (!isB2Configured()) {
      return NextResponse.json(
        { error: 'Backblaze B2 storage is not configured on the server.' },
        { status: 503 }
      );
    }

    const expiresIn = parseInt(request.nextUrl.searchParams.get('expiresIn') || '1800', 10);
    const viewUrl = await getPresignedViewUrl({
      key,
      expiresIn,
    });

    return NextResponse.json({
      success: true,
      viewUrl,
      expiresIn,
    });
  } catch (err: unknown) {
    console.error('[B2 Presigned View URL Error]:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to generate presigned view URL for document.',
      },
      { status: 500 }
    );
  }
}
