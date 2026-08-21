import { DashboardView } from "@/features/dashboard/components/DashboardView";

export const metadata = {
  title: "Dashboard",
  description: "Overview of your workspace, synced repositories, impact analyses, and PR reviews.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
