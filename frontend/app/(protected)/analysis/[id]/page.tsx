import { ImpactDashboard } from "@/features/analysis/components/ImpactDashboard";

export const metadata = {
  title: "Impact Analysis Report",
  description: "Interactive dependency graph, blast radius estimation, and predicted code change scope.",
};

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default async function AnalysisDetailPage({ params }: Props) {
  const resolvedParams = await params;
  return <ImpactDashboard jobId={resolvedParams.id} />;
}
