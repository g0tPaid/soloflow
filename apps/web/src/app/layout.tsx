import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AppSessionProvider } from '@/components/providers/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'SoloFlow', template: '%s · SoloFlow' },
  description: 'Simple accounting for solopreneurs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <QueryProvider>
            <AppSessionProvider>{children}</AppSessionProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}