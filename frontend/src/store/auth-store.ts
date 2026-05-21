import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  token: string | null;
  user: { name: string; email: string; role: "user" | "admin" } | null;
  setSession: (token: string, email: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, email) =>
        set({
          token,
          user: {
            name: email.split("@")[0],
            email,
            role: email.includes("admin") ? "admin" : "user"
          }
        }),
      logout: () => set({ token: null, user: null })
    }),
    { name: "telestore-session" }
  )
);
