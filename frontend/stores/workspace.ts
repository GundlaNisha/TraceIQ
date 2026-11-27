import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceState {
  ownerUserId: string | null;
  syncOwnerUser: (userId: string) => void;
  activeRepositoryId: string | null;
  setActiveRepositoryId: (id: string | null) => void;
  /** null = personal workspace; string = team workspace ID */
  activeWorkspaceId: string | null;
  activeWorkspaceName: string | null;
  setActiveWorkspace: (id: string | null, name: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ownerUserId: null,
      syncOwnerUser: (userId) => {
        const prev = get().ownerUserId;
        if (prev && prev !== userId) {
          set({
            ownerUserId: userId,
            activeWorkspaceId: null,
            activeWorkspaceName: null,
            activeRepositoryId: null,
          });
        } else if (prev !== userId) {
          set({ ownerUserId: userId });
        }
      },
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
        ownerUserId: state.ownerUserId,
        activeWorkspaceId: state.activeWorkspaceId,
        activeWorkspaceName: state.activeWorkspaceName,
      }),
    }
  )
);
