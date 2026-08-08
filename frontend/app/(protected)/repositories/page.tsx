import { AddRepositoryModal } from "@/features/repositories/components/AddRepositoryModal";
import { RepositoryList } from "@/features/repositories/components/RepositoryList";

export default function RepositoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Repositories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Connect a repository to start analyzing your codebase.
          </p>
        </div>
        <AddRepositoryModal />
      </div>
      <RepositoryList />
    </div>
  );
}
