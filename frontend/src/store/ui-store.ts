import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  theme: "dark" | "light";
  commandOpen: boolean;
  sidebarOpen: boolean;
  uploadRequestId: number;
  setTheme: (theme: "dark" | "light") => void;
  setCommandOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  requestUpload: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "dark",
      commandOpen: false,
      sidebarOpen: false,
      uploadRequestId: 0,
      setTheme: (theme) => set({ theme }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      requestUpload: () => set((state) => ({ uploadRequestId: state.uploadRequestId + 1 }))
    }),
    {
      name: "telestore-ui",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<UiState> | undefined;
        return {
          theme: state?.theme ?? "dark",
          commandOpen: false,
          sidebarOpen: false,
          uploadRequestId: 0
        };
      },
      partialize: (state) => ({
        theme: state.theme,
        commandOpen: false,
        sidebarOpen: false,
        uploadRequestId: 0
      })
    }
  )
);
