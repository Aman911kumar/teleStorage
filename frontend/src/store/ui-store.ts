import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  theme: "dark" | "light";
  commandOpen: boolean;
  sidebarOpen: boolean;
  setTheme: (theme: "dark" | "light") => void;
  setCommandOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "dark",
      commandOpen: false,
      sidebarOpen: false,
      setTheme: (theme) => set({ theme }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen })
    }),
    { name: "telestore-ui" }
  )
);
