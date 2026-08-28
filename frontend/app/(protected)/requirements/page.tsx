import { Suspense } from "react";
import { RequirementsView } from "@/features/requirements/components/RequirementsView";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Requirements",
  description: "Create, version, and manage engineering requirements for code impact analysis and PR reviews.",
};

export default function RequirementsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-muted">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading requirements...
        </div>
      }
    >
      <RequirementsView />
    </Suspense>
  );
}
