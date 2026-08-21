import { RequirementsView } from "@/features/requirements/components/RequirementsView";

export const metadata = {
  title: "Requirements",
  description: "Create, version, and manage engineering requirements for code impact analysis and PR reviews.",
};

export default function RequirementsPage() {
  return <RequirementsView />;
}
