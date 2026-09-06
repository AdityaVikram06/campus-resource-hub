import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  // Confirm reading code from request.nextUrl.searchParams.get('code')
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next') ?? '/';
  const origin = request.nextUrl.origin;

  // Check for any error parameters passed directly by the OAuth provider
  const oauthError = request.nextUrl.searchParams.get('error');
  const oauthErrorDescription = request.nextUrl.searchParams.get('error_description');

  if (oauthError) {
    console.error('[OAuth Callback Error] OAuth provider returned error:', {
      error: oauthError,
      description: oauthErrorDescription,
      searchParams: request.nextUrl.searchParams.toString(),
    });
    return NextResponse.redirect(new URL('/auth?error=oauth_failed', origin));
  }

  if (!code) {
    console.error(
      '[OAuth Callback Error] Missing "code" parameter in request.nextUrl.searchParams. Query received:',
      request.nextUrl.searchParams.toString()
    );
    return NextResponse.redirect(new URL('/auth?error=oauth_failed', origin));
  }

  const DEFAULT_SUPABASE_URL = 'https://blkmyaqmonpilrdnaeji.supabase.co';
  const DEFAULT_SUPABASE_KEY = 'sb_publishable_8oAmr8-V6X5JTNbg-PlNVg_Z24Pr41P';

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;

  try {
    const response = NextResponse.redirect(new URL(next, origin));

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Confirm calling supabase.auth.exchangeCodeForSession(code)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[OAuth Callback Error] supabase.auth.exchangeCodeForSession failed:', {
        message: error.message,
        status: error.status,
        name: error.name,
        code,
      });
      return NextResponse.redirect(new URL('/auth?error=oauth_failed', origin));
    }

    if (!data || !data.session) {
      console.error(
        '[OAuth Callback Error] supabase.auth.exchangeCodeForSession returned no session without error object:',
        data
      );
      return NextResponse.redirect(new URL('/auth?error=oauth_failed', origin));
    }

    // Set fast campus_auth_session cookie for instant middleware validation
    response.cookies.set('campus_auth_session', 'active', {
      path: '/',
      maxAge: 604800,
      sameSite: 'lax',
      httpOnly: false,
    });

    // Check if user has completed academic onboarding
    const user = data.session.user;
    let needsOnboarding = false;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, year, semester, department, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        needsOnboarding = true;
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Student User';
        const avatarUrl =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null;

        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: fullName,
          year: null,
          semester: null,
          department: null,
          avatar_url: avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else if (!profile.year || !profile.semester || !profile.department) {
        needsOnboarding = true;
      }
    } catch (profileErr) {
      console.error('[OAuth Callback] Error verifying/creating OAuth profile:', profileErr);
      needsOnboarding = true;
    }

    if (needsOnboarding) {
      // Brand-new Google signup or missing academic fields: route to onboarding form
      const onboardingResponse = NextResponse.redirect(new URL('/onboarding', origin));
      response.cookies.getAll().forEach((c) => {
        onboardingResponse.cookies.set(c.name, c.value, {
          path: c.path || '/',
          maxAge: c.maxAge,
          sameSite: c.sameSite,
          httpOnly: c.httpOnly,
          secure: c.secure,
        });
      });
      return onboardingResponse;
    }

    // Returning user with completed profile: skip straight to dashboard
    return response;
  } catch (caughtErr) {
    console.error(
      '[OAuth Callback Error] Caught unexpected error during OAuth callback execution:',
      caughtErr
    );
    return NextResponse.redirect(new URL('/auth?error=oauth_failed', origin));
  }
}
