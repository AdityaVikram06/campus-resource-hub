import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Profile & Upload Breakdown | Campus Document Hub',
  description:
    'Review your uploaded notes, assignments, lab experiments, and midsem exam papers, view upload statistics, and manage your student profile.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
