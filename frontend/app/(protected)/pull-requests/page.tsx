import { PullRequestList } from "@/features/github/components/PullRequestList";

export const metadata = {
  title: "Pull Requests",
  description: "Track and review open GitHub pull requests against project requirements.",
};

export default function PullRequestsPage() {
  return (
    <div className="flex flex-col gap-10 pb-12">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-semibold font-serif text-foreground tracking-tight">Pull Requests</h1>
          <p className="text-muted mt-2 text-lg">
            Track and manage open pull requests across all your connected repositories.
          </p>
        </div>
      </header>
      <PullRequestList />
    </div>
  );
}
