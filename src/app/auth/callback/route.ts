import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

        // Ensure a profile row exists in case trigger was not executed in Supabase SQL editor
        const user = data.session.user;
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

          if (!existingProfile) {
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
              year: user.user_metadata?.year || null,
              semester: user.user_metadata?.semester || null,
              department: user.user_metadata?.department || null,
              avatar_url: avatarUrl,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        } catch (profileErr) {
          console.error('Error verifying/creating OAuth profile:', profileErr);
        }

        return response;
      } else if (error) {
        console.error('OAuth exchange error:', error);
      }
    }
  }

  // If code exchange fails or no code is provided, redirect to /auth
  return NextResponse.redirect(new URL('/auth?error=oauth_failed', origin));
}
