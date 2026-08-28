"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, Terminal, Shield, Network, Cpu, FileCode2, Layers } from "lucide-react";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Capabilities", href: "#capabilities" },
    { name: "Architecture", href: "#architecture" },
    { name: "Workflow", href: "#workflow" },
    { name: "Tech Stack", href: "#stack" },
    { name: "Docs", href: "http://localhost:8000/docs", external: true },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#F8F6F2]/85 backdrop-blur-md shadow-sm border-b border-[#1B2A4A]/10 py-3.5"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo with Bespoke AST Graph Mark */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-lg bg-[#1B2A4A] flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
            {/* Custom AST Graph SVG Mark */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-[#F8F6F2]"
            >
              {/* Nodes */}
              <circle cx="6" cy="6" r="2.5" fill="currentColor" fillOpacity="0.9" />
              <circle cx="18" cy="7" r="2.5" fill="currentColor" fillOpacity="0.9" />
              <circle cx="12" cy="14" r="2.8" fill="#10B981" />
              <circle cx="6" cy="19" r="2" fill="currentColor" fillOpacity="0.7" />
              <circle cx="18" cy="19" r="2" fill="currentColor" fillOpacity="0.7" />
              {/* Directed Edges */}
              <path
                d="M7.5 7.5L10.5 12M16.5 8.2L13.5 12M12 16.8V18M10.5 15.5L7.5 18M13.5 15.5L16.5 18"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#F8F6F2] animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-xl tracking-tight text-[#111111] group-hover:text-[#1B2A4A] transition-colors">
              Trace<span className="text-[#1B2A4A]">IQ</span>
            </span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-[#1B2A4A]/10 text-[#1B2A4A] border border-[#1B2A4A]/20">
              Beta
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/60 p-1.5 rounded-full border border-[#1B2A4A]/10 shadow-xs backdrop-blur-sm">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              className="px-3.5 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#111111] hover:bg-[#1B2A4A]/5 rounded-full transition-all"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Action CTAs */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/sign-in"
            className="px-4 py-2 text-xs font-medium text-[#1B2A4A] hover:text-[#111111] hover:bg-[#1B2A4A]/5 rounded-md transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#F8F6F2] bg-[#1B2A4A] hover:bg-[#16213E] rounded-md shadow-sm transition-all hover:shadow-md active:translate-y-px"
          >
            <span>Start Building</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/sign-up"
            className="px-3 py-1.5 text-xs font-semibold text-[#F8F6F2] bg-[#1B2A4A] rounded-md shadow-xs"
          >
            Start
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-[#1B2A4A] hover:bg-[#1B2A4A]/10 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 mx-4 p-5 bg-[#F8F6F2] border border-[#1B2A4A]/15 rounded-2xl shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-[#111111] hover:bg-[#1B2A4A]/10 rounded-lg transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-[#1B2A4A]/10 flex flex-col gap-2">
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center text-sm font-medium text-[#1B2A4A] bg-white border border-[#1B2A4A]/15 rounded-lg"
            >
              Sign In to Account
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center text-sm font-semibold text-[#F8F6F2] bg-[#1B2A4A] rounded-lg shadow-sm"
            >
              Start Building Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
