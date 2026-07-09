import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AppSessionProvider } from '@/components/providers/session-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'SoloFlow', template: '%s · SoloFlow' },
  description: 'Simple accounting for solopreneurs',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">        <ThemeProvider>
          <QueryProvider>
            <AppSessionProvider>{children}</AppSessionProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}