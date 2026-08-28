import { Suspense } from "react";
import { AnalysisList } from "@/features/analysis/components/AnalysisList";
import { Loader2 } from "lucide-react";

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
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-muted">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading analysis jobs...
          </div>
        }
      >
        <AnalysisList />
      </Suspense>
    </div>
  );
}
