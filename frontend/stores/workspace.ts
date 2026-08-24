import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceState {
  activeRepositoryId: string | null;
  setActiveRepositoryId: (id: string | null) => void;
  /** null = personal workspace; string = team workspace ID */
  activeWorkspaceId: string | null;
  activeWorkspaceName: string | null;
  setActiveWorkspace: (id: string | null, name: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeRepositoryId: null,
      setActiveRepositoryId: (id) => set({ activeRepositoryId: id }),
      activeWorkspaceId: null,
      activeWorkspaceName: null,
      setActiveWorkspace: (id, name) =>
        set({ activeWorkspaceId: id, activeWorkspaceName: name }),
    }),
    {
      name: "traceiq-workspace",
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
        activeWorkspaceName: state.activeWorkspaceName,
      }),
    }
  )
);
