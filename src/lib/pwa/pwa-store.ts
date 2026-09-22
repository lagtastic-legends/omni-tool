"use client";

import { create } from "zustand";

interface PwaState {
  deferredPrompt: any | null;
  isInstallable: boolean;
  isInstalled: boolean;
  isDownloadModalOpen: boolean;
  setDeferredPrompt: (prompt: any) => void;
  setInstalled: (val: boolean) => void;
  setDownloadModalOpen: (open: boolean) => void;
  promptInstall: () => Promise<boolean>;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,
  isDownloadModalOpen: false,

  setDeferredPrompt: (prompt: any) => {
    set({ deferredPrompt: prompt, isInstallable: !!prompt });
  },

  setInstalled: (val: boolean) => {
    set({ isInstalled: val, isInstallable: !val && !!get().deferredPrompt });
  },

  setDownloadModalOpen: (open: boolean) => {
    set({ isDownloadModalOpen: open });
  },

  promptInstall: async () => {
    const prompt = get().deferredPrompt;
    if (!prompt) return false;
    try {
      await prompt.prompt();
      const choiceResult = await prompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        set({ isInstalled: true, isInstallable: false, deferredPrompt: null });
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  },
}));
