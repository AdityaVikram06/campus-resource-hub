import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Static files, OAuth callbacks, and internal Next.js assets are always public
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth/callback') ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.svg' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Redirect /login or /signin aliases directly to /auth (preserving destination query)
  if (pathname === '/login' || pathname === '/signin') {
    const signInUrl = new URL('/auth', request.url);
    if (search) {
      signInUrl.search = search;
    }
    return NextResponse.redirect(signInUrl);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let isAuthenticated = false;

  // 3. Supabase session validation via @supabase/ssr
  const DEFAULT_SUPABASE_URL = 'https://blkmyaqmonpilrdnaeji.supabase.co';
  const DEFAULT_SUPABASE_KEY = 'sb_publishable_8oAmr8-V6X5JTNbg-PlNVg_Z24Pr41P';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;

  const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
  );

  if (isSupabaseConfigured) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      // Strict user validation from Supabase Auth server
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        isAuthenticated = true;
      }
    } catch {
      // In case of transient network error, fall back to checking auth token cookie
    }
  }


  // Fallback: check presence of Supabase auth cookie (e.g. sb-*-auth-token)
  if (!isAuthenticated) {
    const hasSbCookie = request.cookies.getAll().some((cookie) =>
      cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
    );
    if (hasSbCookie) {
      isAuthenticated = true;
    }
  }

  const isAuthRoute = pathname.startsWith('/auth') && !pathname.startsWith('/auth/callback');
  const isOnboardingRoute = pathname === '/onboarding';

  // 4. Authenticated user visiting /auth -> redirect straight to dashboard
  if (isAuthenticated && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  // 5. Unauthenticated user accessing ANY protected route (dashboard, upload, profile, viewer, etc.)
  // Only /auth, /login, /onboarding (mid-flow), and static assets are reachable without a session
  if (!isAuthenticated && !isAuthRoute && !isOnboardingRoute) {
    const targetPath = pathname + search;
    const signInUrl = new URL('/auth', request.url);
    if (targetPath && targetPath !== '/') {
      signInUrl.searchParams.set('redirect', targetPath);
    }
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files & images:
     */
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
