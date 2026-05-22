import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  token: string | null;
  user: { id?: string; name: string; email: string; role: "user" | "admin"; emailVerified?: boolean; avatarUrl?: string } | null;
  setSession: (token: string, user: AuthState["user"] | string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => {
        const normalizedUser =
          typeof user === "string"
            ? { name: user.split("@")[0], email: user, role: user.includes("admin") ? ("admin" as const) : ("user" as const) }
            : user;
        set({
          token,
          user: normalizedUser
        });
      },
      logout: () => set({ token: null, user: null })
    }),
    { name: "telestore-session" }
  )
);
