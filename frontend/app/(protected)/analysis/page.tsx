import { AnalysisList } from "@/features/analysis/components/AnalysisList";

export const metadata = {
  title: "Analysis Jobs | TraceIQ",
};

export default function AnalysisPage() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Analysis Jobs
        </h1>
      </div>
      <AnalysisList />
    </div>
  );
}
