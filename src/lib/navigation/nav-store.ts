"use client";

/**
 * Client view router & hierarchical navigation engine for Omni Tool.
 *
 * Implements a 5-tier back navigation protocol:
 *  1. Overlays & drawers (AI chat, Search, Modals, Floating Toolbar).
 *  2. Multi-step sub-navigation (stepping back inside active tool flows).
 *  3. Unsaved work & active job guards (confirmation before data loss).
 *  4. In-app history stack (returning to previous tool/view).
 *  5. Direct-link safety & root fallback (safe return to Dashboard or native app exit).
 */

import { create } from "zustand";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

export const DASHBOARD_VIEW = "dashboard";

export interface OverlayEntry {
  id: string;
  close: () => boolean | void;
}

export type StepHandler = () => boolean;

export interface DirtyCheckResult {
  hasUnsaved: boolean;
  message?: string;
}

export type DirtyGuard = () => boolean | DirtyCheckResult;

export interface ConfirmDialogState {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface NavState {
  view: string;
  history: string[];
  overlays: OverlayEntry[];
  stepHandlers: StepHandler[];
  dirtyGuards: DirtyGuard[];
  confirmDialogState: ConfirmDialogState | null;

  // Actions
  navigate: (view: string, options?: { replace?: boolean }) => void;
  reset: () => void;
  forceReset: () => void;
  setConfirmDialog: (state: ConfirmDialogState | null) => void;
  registerOverlay: (id: string, close: () => boolean | void) => () => void;
  registerStepHandler: (handler: StepHandler) => () => void;
  registerDirtyGuard: (guard: DirtyGuard) => () => void;
  handleBack: () => Promise<boolean>;
  _executeHistoryPop: () => Promise<boolean>;
}

const getInitialView = (): string => {
  if (typeof window !== "undefined" && window.location.hash) {
    const raw = window.location.hash.replace(/^#/, "");
    if (raw && raw !== DASHBOARD_VIEW) {
      return raw;
    }
  }
  return DASHBOARD_VIEW;
};

export const useNavStore = create<NavState>((set, get) => ({
  view: getInitialView(),
  history: [],
  overlays: [],
  stepHandlers: [],
  dirtyGuards: [],
  confirmDialogState: null,

  navigate: (nextView, options) => {
    const currentView = get().view;
    if (currentView === nextView) return;

    const currentHistory = get().history;
    const newHistory = options?.replace
      ? currentHistory
      : [...currentHistory, currentView];

    set({
      view: nextView,
      history: newHistory,
      stepHandlers: [],
      dirtyGuards: [],
    });

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      try {
        const hash = nextView === DASHBOARD_VIEW ? "" : `#${nextView}`;
        const newUrl = window.location.pathname + hash;
        if (options?.replace) {
          window.history.replaceState({ view: nextView }, "", newUrl);
        } else {
          window.history.pushState({ view: nextView }, "", newUrl);
        }
      } catch {
        // ignore history state exceptions in sandboxed contexts
      }
    }
  },

  reset: () => {
    void get().handleBack();
  },

  forceReset: () => {
    set({
      view: DASHBOARD_VIEW,
      history: [],
      stepHandlers: [],
      dirtyGuards: [],
      confirmDialogState: null,
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      try {
        window.history.replaceState({ view: DASHBOARD_VIEW }, "", window.location.pathname);
      } catch {
        // ignore
      }
    }
  },

  setConfirmDialog: (state) => {
    set({ confirmDialogState: state });
  },

  registerOverlay: (id, close) => {
    set((state) => ({
      overlays: [...state.overlays.filter((o) => o.id !== id), { id, close }],
    }));
    return () => {
      set((state) => ({
        overlays: state.overlays.filter((o) => o.id !== id),
      }));
    };
  },

  registerStepHandler: (handler) => {
    set((state) => ({
      stepHandlers: [...state.stepHandlers, handler],
    }));
    return () => {
      set((state) => ({
        stepHandlers: state.stepHandlers.filter((h) => h !== handler),
      }));
    };
  },

  registerDirtyGuard: (guard) => {
    set((state) => ({
      dirtyGuards: [...state.dirtyGuards, guard],
    }));
    return () => {
      set((state) => ({
        dirtyGuards: state.dirtyGuards.filter((g) => g !== guard),
      }));
    };
  },

  _executeHistoryPop: async () => {
    const state = get();
    const history = [...state.history];

    // 4. In-App Navigation Stack: Return to previous visited view
    if (history.length > 0) {
      const prevView = history.pop()!;
      set({
        view: prevView,
        history,
        stepHandlers: [],
        dirtyGuards: [],
      });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        try {
          const hash = prevView === DASHBOARD_VIEW ? "" : `#${prevView}`;
          window.history.replaceState({ view: prevView }, "", window.location.pathname + hash);
        } catch {
          // ignore
        }
      }
      return true;
    }

    // 5. Direct Link / Fallback: If user entered directly with no history, return safely to dashboard
    if (state.view !== DASHBOARD_VIEW) {
      set({
        view: DASHBOARD_VIEW,
        history: [],
        stepHandlers: [],
        dirtyGuards: [],
      });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        try {
          window.history.replaceState({ view: DASHBOARD_VIEW }, "", window.location.pathname);
        } catch {
          // ignore
        }
      }
      return true;
    }

    // Already on dashboard with no prior history: Clean exit on native Android
    if (Capacitor.isNativePlatform()) {
      await CapacitorApp.exitApp();
      return true;
    }

    return false;
  },

  handleBack: async () => {
    const state = get();

    // TIER 1: Close topmost overlay or drawer first
    if (state.overlays.length > 0) {
      const overlaysCopy = [...state.overlays];
      const topOverlay = overlaysCopy.pop();
      if (topOverlay) {
        set({ overlays: overlaysCopy });
        try {
          const res = topOverlay.close();
          if (res !== false) return true;
        } catch {
          return true;
        }
      }
    }

    // TIER 2: Check if current active tool has a sub-step to step back into
    if (state.stepHandlers.length > 0) {
      const handlers = [...state.stepHandlers];
      for (let i = handlers.length - 1; i >= 0; i--) {
        try {
          const handled = handlers[i]();
          if (handled) return true;
        } catch {
          // continue
        }
      }
    }

    // TIER 3: Check for unsaved work or active media processing
    let hasUnsaved = false;
    let guardMessage =
      "You have an active operation or unsaved work in progress. Leaving will discard your current progress. Are you sure you want to go back?";

    for (const guard of state.dirtyGuards) {
      try {
        const res = guard();
        if (typeof res === "boolean" && res) {
          hasUnsaved = true;
          break;
        } else if (typeof res === "object" && res && res.hasUnsaved) {
          hasUnsaved = true;
          if (res.message) guardMessage = res.message;
          break;
        }
      } catch {
        // ignore
      }
    }

    if (hasUnsaved) {
      return new Promise<boolean>((resolve) => {
        set({
          confirmDialogState: {
            isOpen: true,
            title: "Discard Unsaved Work?",
            message: guardMessage,
            onConfirm: () => {
              set({ confirmDialogState: null, dirtyGuards: [], stepHandlers: [] });
              get()._executeHistoryPop().then(resolve);
            },
            onCancel: () => {
              set({ confirmDialogState: null });
              resolve(false);
            },
          },
        });
      });
    }

    // TIERS 4 & 5: Execute history pop or safe dashboard fallback
    return await get()._executeHistoryPop();
  },
}));
