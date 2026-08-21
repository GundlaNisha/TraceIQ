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

export const metadata: Metadata = {
  title: {
    template: "%s | TraceIQ",
    default: "TraceIQ — Autonomous Code Impact & PR Review Intelligence",
  },
  description: "AI-powered requirement traceability, impact blast radius analysis, and automated GitHub PR code reviews.",
  icons: {
    icon: "/favicon.ico",
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