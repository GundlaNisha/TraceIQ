import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — TraceIQ",
  description:
    "Comprehensive developer documentation, architecture guides, API reference, and setup instructions for TraceIQ.",
};

export default function DocsLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
