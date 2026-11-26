import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Developer documentation for TraceIQ: AST code graph indexing, hybrid RRF search, LangGraph AI coding agent, Jira OAuth 2.0 auto-webhooks, CI correlation, and REST API reference.",
  alternates: {
    canonical: "/docs",
  },
};

export default function DocsLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
