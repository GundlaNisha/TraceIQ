import { TraceabilityMatrix } from "@/features/traceability/components/TraceabilityMatrix";

export const metadata = {
  title: "Traceability Matrix | TraceIQ",
  description: "End-to-end requirement traceability and compliance matrix for code changes and AI PR reviews.",
};

export default function TraceabilityPage() {
  return <TraceabilityMatrix />;
}
