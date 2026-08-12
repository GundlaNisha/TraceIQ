import { AddRepositoryModal } from "@/features/repositories/components/AddRepositoryModal";
import { RepositoryList } from "@/features/repositories/components/RepositoryList";

export default function RepositoriesPage() {
  return (
    <div className="flex flex-col gap-10 pb-12">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-semibold font-serif text-foreground tracking-tight">Repositories</h1>
          <p className="text-muted mt-2 text-lg">
            Connect a repository to start analyzing your codebase.
          </p>
        </div>
        <AddRepositoryModal />
      </header>
      <RepositoryList />
    </div>
  );
}
