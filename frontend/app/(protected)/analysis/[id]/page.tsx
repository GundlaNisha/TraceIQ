import { ImpactDashboard } from "@/features/analysis/components/ImpactDashboard";

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default async function AnalysisDetailPage({ params }: Props) {
  const resolvedParams = await params;
  return <ImpactDashboard jobId={resolvedParams.id} />;
}
