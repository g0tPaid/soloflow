import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AppSessionProvider } from '@/components/providers/session-provider';
import { RegisterServiceWorker } from '@/components/pwa/register-service-worker';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'SoloFlow', template: '%s · SoloFlow' },
  description: 'Simple accounting for solopreneurs',
  applicationName: 'SoloFlow',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'SoloFlow',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#E40046',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">        <ThemeProvider>
          <QueryProvider>
            <AppSessionProvider>
              <RegisterServiceWorker />
              {children}
            </AppSessionProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}