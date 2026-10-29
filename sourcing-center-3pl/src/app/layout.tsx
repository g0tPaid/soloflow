import type { Metadata } from "next";
import { Fraunces, Inter, Playfair_Display } from "next/font/google";
import { JsonLd } from "@/components/seo/json-ld";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { organizationJsonLd, siteUrl, defaultDescription, seoKeywords } from "@/lib/seo";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz", "WONK"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sourcing Center — China Sourcing, Ideation & 3PL in Xiamen and Dubai",
    template: "%s · Sourcing Center",
  },
  description: defaultDescription,
  keywords: seoKeywords,
  applicationName: "Sourcing Center",
  authors: [{ name: "Seven Color Trading Co Ltd", url: siteUrl }],
  creator: "Seven Color Trading Co Ltd",
  publisher: "Seven Color Trading Co Ltd",
  category: "business",
  openGraph: {
    title: "Sourcing Center — China Sourcing & Own 3PL Warehouses",
    description: defaultDescription,
    type: "website",
    locale: "en_US",
    siteName: "Sourcing Center",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sourcing Center — China Sourcing & Own 3PL Warehouses",
    description: defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${fraunces.variable} ${inter.variable} font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <JsonLd data={organizationJsonLd()} />
      </body>
    </html>
  );
}
