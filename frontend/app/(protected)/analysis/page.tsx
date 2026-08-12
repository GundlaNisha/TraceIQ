import { AnalysisList } from "@/features/analysis/components/AnalysisList";

export const metadata = {
  title: "Analysis Jobs | TraceIQ",
};

export default function AnalysisPage() {
  return (
    <div className="flex flex-col gap-10 pb-12 w-full">
      <header className="mb-2">
        <h1 className="text-4xl font-semibold font-serif text-foreground tracking-tight">Analysis Jobs</h1>
        <p className="text-lg text-muted mt-2">
          Track the blast radius and impact of your requirements.
        </p>
      </header>
      <AnalysisList />
    </div>
  );
}
