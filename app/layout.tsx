import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans_Arabic, Amiri_Quran } from 'next/font/google';
import './globals.css';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import { ArabicFontProvider } from '@/lib/contexts/ArabicFontContext';
import { Sidebar } from '@/components/Sidebar';
import { CommandPalette } from '@/components/CommandPalette';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: '--font-noto-arabic',
  subsets: ['arabic'],
});

const amiriQuran = Amiri_Quran({
  variable: '--font-amiri-quran',
  subsets: ['arabic'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Personal OS',
  description: 'Unified dashboard for projects, tasks, and study.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${notoSansArabic.variable} ${amiriQuran.variable} antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50`}>
        <ConvexClientProvider>
          <ArabicFontProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                  {children}
                </main>
              </div>
            </div>
            <CommandPalette />
          </ArabicFontProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
