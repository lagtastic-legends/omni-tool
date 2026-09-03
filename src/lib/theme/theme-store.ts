"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OmniTheme = "cyber" | "terracotta";

interface ThemeState {
  theme: OmniTheme;
  setTheme: (theme: OmniTheme) => void;
  toggleTheme: () => void;
}

function applyThemeToDom(theme: OmniTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  
  if (theme === "terracotta") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }

  // Update mobile status bar theme color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", theme === "terracotta" ? "#FAF5EE" : "#0a0813");
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "cyber",
      setTheme: (theme) => {
        applyThemeToDom(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === "cyber" ? "terracotta" : "cyber";
        applyThemeToDom(next);
        set({ theme: next });
      },
    }),
    {
      name: "omni_theme_preference",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyThemeToDom(state.theme);
        }
      },
    }
  )
);
