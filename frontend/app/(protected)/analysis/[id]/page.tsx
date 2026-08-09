import { ImpactDashboard } from "@/features/analysis/components/ImpactDashboard";

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default async function AnalysisPage({ params }: Props) {
  const resolvedParams = await params;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Impact Analysis</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Files and symbols likely affected by this requirement.
        </p>
      </div>
      <ImpactDashboard jobId={resolvedParams.id} />
    </div>
  );
}
