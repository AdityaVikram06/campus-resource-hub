import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Campus Document Hub | B.Tech Academic Notes, Assignments & Exam Papers',
  description:
    'A full-stack collaborative repository for BTech students to upload, browse, and search verified lecture notes, lab experiments, assignments, and midsem exam papers with Claude AI-assisted page retrieval.',
  keywords: [
    'BTech notes',
    'campus document hub',
    'engineering assignments',
    'lab experiments',
    'midsem question papers',
    'exam papers',
    'Claude AI search',
  ],
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#FAFAF8] text-[#1C1D1F]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
