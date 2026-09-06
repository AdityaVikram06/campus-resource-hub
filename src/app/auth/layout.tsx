import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In & Register | Campus Document Hub',
  description:
    'Sign in or create your student profile with institutional email or Google OAuth to access the B.Tech academic document hub.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
