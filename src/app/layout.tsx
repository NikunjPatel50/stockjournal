import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { MicrosoftClarity } from "@/components/microsoft-clarity";
import { Providers } from "@/components/providers";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import {
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  HOME_TITLE,
  openGraphImages,
  SITE_NAME,
} from "@/lib/site";
import "./globals.css";

/** Single typeface for the whole product — body copy, headings, and figures. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: HOME_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: openGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh w-full overflow-x-hidden bg-background text-foreground">
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
        <MicrosoftClarity />
        <SiteJsonLd />
      </body>
    </html>
  );
}
