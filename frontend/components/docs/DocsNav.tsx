"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowRight, Menu, X } from "lucide-react";
import { DOCS_NAV_GROUPS } from "./DocsSidebar";

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

interface Props {
  onOpenSearch: () => void;
  activeSection: string;
  onSelectSection: (id: string) => void;
}

export function DocsNav({ onOpenSearch, activeSection, onSelectSection }: Props) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F8F6F2]/90 backdrop-blur-md border-b border-[#1B2A4A]/10 h-16 flex items-center">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Brand & Docs Badge */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="TraceIQ Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain drop-shadow-xs transition-transform group-hover:scale-105"
              />
            </div>
            <span className="font-serif font-bold text-lg text-[#111111] group-hover:text-accent transition-colors">
              Trace<span className="text-accent">IQ</span>
            </span>
          </Link>

          <span className="text-muted">•</span>
          
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm text-[#1B2A4A]">Docs</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1B2A4A]/10 text-[#1B2A4A]">
              v0.1.0-beta
            </span>
          </div>
        </div>

        {/* Middle Search Bar (Tablet & Desktop) */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center justify-between w-64 lg:w-80 px-3.5 py-1.5 rounded-full bg-white border border-[#1B2A4A]/15 text-xs text-muted hover:text-foreground hover:border-[#1B2A4A]/40 transition-all shadow-2xs group"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
            <span>Search docs (Ctrl+K)...</span>
          </span>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F8F6F2] border border-[#1B2A4A]/15 text-[#1B2A4A] font-semibold">
            ⌘K
          </kbd>
        </button>

        {/* Right Action Links */}
        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com/GundlaNisha/TraceIQ"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-[#1B2A4A]/5 transition-colors hidden sm:inline-flex"
            title="GitHub Repository"
          >
            <GithubIcon className="w-4 h-4" />
          </a>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1B2A4A] text-white font-semibold text-xs hover:bg-[#16213E] transition-all shadow-2xs"
          >
            <span>Open App</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 rounded-lg text-muted hover:text-foreground lg:hidden"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bg-white border-b border-[#1B2A4A]/15 shadow-xl max-h-[80vh] overflow-y-auto p-4 space-y-4">
          <button
            onClick={() => {
              setMobileDrawerOpen(false);
              onOpenSearch();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#F8F6F2] border border-[#1B2A4A]/10 text-xs text-muted"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span>Search docs...</span>
            </span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border">⌘K</kbd>
          </button>

          <div className="space-y-4">
            {DOCS_NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                <h5 className="font-mono text-[10px] font-bold uppercase text-muted px-2">
                  {group.title}
                </h5>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectSection(item.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left ${
                        activeSection === item.id
                          ? "bg-accent text-white font-semibold"
                          : "text-[#111111] hover:bg-[#F8F6F2]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                      {item.badge && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/20">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
