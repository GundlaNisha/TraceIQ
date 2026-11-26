import { NextResponse } from "next/server";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://traceiqoffi.vercel.app").replace(/\/+$/, "");

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface FeedEntry {
  title: string;
  path: string;
  description: string;
  category: string;
}

const FEED_ITEMS: FeedEntry[] = [
  {
    title: "TraceIQ — Autonomous Code Impact, AI Agent & PR Review Platform",
    path: "/",
    description:
      "2-hop AST code graph traversal, sub-15ms hybrid RRF search, LangGraph AI coding agent, zero-click Jira OAuth 2.0 auto-webhooks, and CI blast-radius correlation.",
    category: "Platform",
  },
  {
    title: "Autonomous LangGraph AI Coding Agent & Multi-Provider Failover",
    path: "/docs?section=ai-agent",
    description:
      "Converse with indexed repositories using inline @repo, @req, and @pr mentions, inspect live GitHub PR diffs, and run with Gemini, Groq, and OpenCode Zen failover.",
    category: "AI Agent",
  },
  {
    title: "Zero-Click Jira OAuth 2.0 (3LO) & Auto-Registered Webhooks",
    path: "/docs?section=jira-integration",
    description:
      "Connect Jira Cloud in one click with Fernet enc:v1 encryption, Redis single-flight token locks, auto-registered HTTPS webhooks, ADF parsing, and drift detection.",
    category: "Integrations",
  },
  {
    title: "Core Concepts: Hybrid RRF Search, 2-Hop Blast Radius & CI Correlation",
    path: "/docs?section=core-concepts",
    description:
      "How TraceIQ fuses pgvector cosine similarity, tsvector full-text search, and AST symbols in under 15ms and correlates GitHub Actions failures to impacted modules.",
    category: "Documentation",
  },
  {
    title: "TraceIQ REST API Reference",
    path: "/docs?section=api-reference",
    description:
      "OpenAPI endpoint reference covering Agent SSE streaming, Jira OAuth 2.0 3LO, GitHub CI checks & reliability, and traceability compliance routes.",
    category: "API Reference",
  },
  {
    title: "Customer Support & Engineering Contact",
    path: "/contact",
    description:
      "Reach TraceIQ support for workspace access, Atlassian OAuth app assistance, security disclosures, or bug reports.",
    category: "Support",
  },
  {
    title: "Privacy Policy & Data Handling",
    path: "/privacy",
    description:
      "Details on Fernet encryption at rest, Clerk authentication, Atlassian OAuth 2.0 (3LO) scopes, and multi-tenant data isolation.",
    category: "Legal",
  },
  {
    title: "Terms of Service",
    path: "/terms",
    description:
      "Terms governing use of TraceIQ repositories, requirements traceability, AI agent recommendations, and integrations.",
    category: "Legal",
  },
];

export async function GET() {
  const pubDate = new Date().toUTCString();
  const itemsXml = FEED_ITEMS.map((item) => {
    const url = `${SITE_URL}${item.path}`;
    return [
      "    <item>",
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <pubDate>${pubDate}</pubDate>`,
      `      <category>${escapeXml(item.category)}</category>`,
      `      <description>${escapeXml(item.description)}</description>`,
      "    </item>",
    ].join("\n");
  }).join("\n");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TraceIQ — Platform Updates &amp; Documentation</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>Autonomous Code Impact Blast Radius Analysis, LangGraph AI Coding Agent, Zero-Click Jira OAuth 2.0 Sync, and Pull Request Review Intelligence.</description>
    <language>en-us</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`;

  return new NextResponse(rssXml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
