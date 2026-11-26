"use client";

import React, { useEffect, useRef, useState } from "react";

const PHRASES = [
  "Every",
  "requirement",
  "traced",
  "through",
  "live",
  "code",
  "graphs,",
  "every",
  "pull",
  "request",
  "checked",
  "against",
  "real",
  "callers,",
  "and",
  "every",
  "Jira",
  "ticket",
  "kept",
  "aligned.",
];

export function TaglineRevealSection() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [litCount, setLitCount] = useState<number>(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setLitCount(PHRASES.length);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    let rafId = 0;
    const updateProgress = () => {
      rafId = 0;
      const rect = node.getBoundingClientRect();
      const viewportH = window.innerHeight || 800;
      const start = viewportH * 0.85;
      const end = viewportH * 0.25;
      const raw = (start - rect.top) / Math.max(1, start - end);
      const clamped = Math.max(0, Math.min(1, raw));
      setLitCount(Math.round(clamped * PHRASES.length));
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          updateProgress();
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    observer.observe(node);
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      aria-label="TraceIQ mission statement"
      className="py-20 md:py-28 bg-[#F8F6F2] border-t border-[#1B2A4A]/10"
    >
      <div
        ref={containerRef}
        className="max-w-[680px] mx-auto px-4 sm:px-6 text-center"
      >
        <p className="text-3xl sm:text-4xl font-semibold font-serif tracking-tight leading-snug text-balance">
          {PHRASES.map((word, index) => (
            <React.Fragment key={`${word}-${index}`}>
              <span
                className={`transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  index < litCount ? "text-[#111111]" : "text-[#111111]/25"
                }`}
              >
                {word}
              </span>{" "}
            </React.Fragment>
          ))}
        </p>
      </div>
    </section>
  );
}
