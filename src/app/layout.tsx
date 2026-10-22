import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/env";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

const TITLE = "Into the Deets — dream it. plan it. deet-ail it.";
const DESCRIPTION =
  "Vendors, conversations, payments, tasks and every little detail of your event, organized in one place.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL || "https://intothedeets.com"),
  // What shows up when a link is pasted into texts, iMessage, WhatsApp, Slack, etc.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Into the Deets",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
