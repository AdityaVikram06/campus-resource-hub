import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
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

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) {
        // Set the fast campus_auth_session cookie for instant middleware validation
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
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, year, semester, department, avatar_url')
            .eq('id', user.id)
            .single();

          if (!profile) {
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
          console.error('Error verifying/creating OAuth profile:', profileErr);
          needsOnboarding = true;
        }

        if (needsOnboarding) {
          // Brand-new Google signup or missing academic fields: route to onboarding form
          const onboardingResponse = NextResponse.redirect(new URL('/onboarding', origin));
          response.cookies.getAll().forEach((c) => {
            onboardingResponse.cookies.set(c.name, c.value, {
              path: '/',
              maxAge: 604800,
              sameSite: 'lax',
              httpOnly: false,
            });
          });
          return onboardingResponse;
        }

        // Returning user with completed profile: skip straight to dashboard
        return response;
      } else if (error) {
        console.error('OAuth exchange error:', error);
      }
    }
  }

  // If code exchange fails or no code is provided, redirect to /auth
  return NextResponse.redirect(new URL('/auth?error=oauth_failed', origin));
}
