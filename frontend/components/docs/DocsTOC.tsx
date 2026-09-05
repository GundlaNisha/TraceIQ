"use client";

import React, { useEffect, useState } from "react";
import { AlignLeft, ArrowUpRight } from "lucide-react";

function GithubIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export interface TOCItem {
  id: string;
  label: string;
  level?: 2 | 3;
}

interface Props {
  items: TOCItem[];
}

export function DocsTOC({ items }: Props) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id || "");

  useEffect(() => {
    const handleScroll = () => {
      const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean);
      const scrollPos = window.scrollY + 140;

      for (let i = headings.length - 1; i >= 0; i--) {
        const el = headings[i];
        if (el && el.offsetTop <= scrollPos) {
          setActiveId(items[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="sticky top-28 w-64 pl-8 border-l border-[#1B2A4A]/10 text-xs hidden xl:block shrink-0 py-2">
      
      {/* Table of Contents Heading */}
      <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-[#1B2A4A] uppercase tracking-wider mb-4">
        <AlignLeft className="w-3.5 h-3.5 text-[#1B2A4A]/70" />
        <span>On this page</span>
      </div>

      {/* Navigation List with Generous Spacing */}
      <nav className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block px-3 py-2 rounded-lg text-xs transition-all leading-relaxed ${
                item.level === 3 ? "ml-3 text-[11px]" : ""
              } ${
                isActive
                  ? "font-semibold text-[#111111] bg-[#1B2A4A]/5 shadow-2xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#1B2A4A]/[0.03]"
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Community Links with Clean Spacing */}
      <div className="mt-8 pt-5 border-t border-[#1B2A4A]/10 space-y-2 text-xs text-[#6B7280]">
        <a
          href="https://github.com/GundlaNisha/TraceIQ"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-lg hover:text-[#111111] hover:bg-[#1B2A4A]/[0.03] transition-all group"
        >
          <span className="flex items-center gap-2 font-medium">
            <GithubIcon className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#111111]" />
            <span>Edit on GitHub</span>
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#6B7280]/60 group-hover:text-[#111111] transition-colors" />
        </a>
      </div>

    </div>
  );
}
