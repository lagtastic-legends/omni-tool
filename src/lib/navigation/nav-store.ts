"use client";

/**
 * Client view router for the single-canvas architecture.
 * The sandbox exposes one route ("/") — and Capacitor static exports
 * prefer SPA routing anyway — so tools are views, not routes.
 */

import { create } from "zustand";

export const DASHBOARD_VIEW = "dashboard";

interface NavState {
  view: string;
  navigate: (view: string) => void;
  reset: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  view: DASHBOARD_VIEW,
  navigate: (view) => {
    set({ view });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  },
  reset: () => {
    set({ view: DASHBOARD_VIEW });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  },
}));
