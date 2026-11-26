import React from "react";
import { LandingNav } from "./LandingNav";
import { LandingFooter } from "./LandingFooter";

interface PublicPageShellProps {
  children: React.ReactNode;
}

/** Shared editorial shell for public informational, legal, and support pages. */
export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-[#F8F6F2] text-[#111111] flex flex-col relative selection:bg-[#1B2A4A] selection:text-[#F8F6F2]">
      <div className="fixed inset-0 noise-overlay pointer-events-none z-40 opacity-40" />
      <LandingNav />
      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>
      <LandingFooter />
    </div>
  );
}
