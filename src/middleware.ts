import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Redirect /login or /signin aliases directly to /auth
  if (pathname === '/login' || pathname === '/signin') {
    const signInUrl = new URL('/auth', request.url);
    if (search) {
      signInUrl.search = search;
    }
    return NextResponse.redirect(signInUrl);
  }

  // Static files, OAuth callbacks, and internal Next.js assets are always public
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

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let isAuthenticated = false;

  // 1. Check local session cookie (supports demo mode & immediate fast response)
  const campusSessionCookie = request.cookies.get('campus_auth_session');
  if (campusSessionCookie && campusSessionCookie.value === 'active') {
    isAuthenticated = true;
  }

  // 2. Check Supabase session cookies if configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
  );

  if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        isAuthenticated = true;
      }
    } catch {
      // If Supabase check fails, fallback to isAuthenticated from cookie
    }
  }

  // Also check for any Supabase auth cookies present (e.g. sb-*-auth-token)
  if (!isAuthenticated) {
    const hasSbCookie = request.cookies.getAll().some((cookie) =>
      cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
    );
    if (hasSbCookie) {
      isAuthenticated = true;
    }
  }

  const isAuthRoute = pathname.startsWith('/auth') && !pathname.startsWith('/auth/callback');

  // If user is already authenticated and visits /auth, redirect to dashboard
  if (isAuthenticated && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  // If user is NOT authenticated and trying to access a protected route
  if (!isAuthenticated && !isAuthRoute) {
    // Preserve full target destination including query parameters (e.g. ?doc=123)
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
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.svg
     * - public folder images / fonts
     */
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
