import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ 
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://traceiqoffi.vercel.app";
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | TraceIQ",
    default: "TraceIQ — Autonomous Code Impact, AI Coding Agent & PR Review Intelligence",
  },
  description:
    "Enterprise AI platform for 2-hop AST code impact blast radius analysis, LangGraph AI coding agent, zero-click Jira OAuth 2.0 sync, and CI-correlated GitHub pull request reviews.",
  keywords: [
    "code impact analysis",
    "AST code graph",
    "LangGraph coding agent",
    "Jira OAuth 2.0 sync",
    "pull request code review",
    "CI blast radius correlation",
    "traceability matrix",
    "Tree-sitter indexing",
  ],
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": `${siteUrl}/rss.xml`,
    },
  },
  ...(googleSiteVerification
    ? {
        verification: {
          google: googleSiteVerification,
        },
      }
    : {}),
  authors: [{ name: "TraceIQ Engineering" }],
  creator: "TraceIQ",
  publisher: "TraceIQ",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "TraceIQ — Autonomous Code Impact, AI Coding Agent & PR Review Intelligence",
    description:
      "Enterprise AI platform for 2-hop AST code impact blast radius analysis, LangGraph AI coding agent, zero-click Jira OAuth 2.0 sync, and CI-correlated GitHub pull request reviews.",
    siteName: "TraceIQ",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 1200,
        alt: "TraceIQ Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TraceIQ — Autonomous Code Impact, AI Coding Agent & PR Review Intelligence",
    description:
      "Enterprise AI platform for 2-hop AST code impact blast radius analysis, LangGraph AI coding agent, zero-click Jira OAuth 2.0 sync, and CI-correlated GitHub pull request reviews.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full antialiased ${fraunces.variable} ${dmSans.variable}`}>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}