import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { MicrosoftClarity } from "@/components/microsoft-clarity";
import {
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  HOME_TITLE,
  openGraphImages,
  SITE_NAME,
} from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/** Monospace for tickers, codes, and compact tables (`font-mono`). */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full min-h-screen bg-background text-foreground">
        <MicrosoftClarity />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
