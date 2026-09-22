"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Smartphone,
  Globe,
  Apple,
  CheckCircle2,
  X,
  ShieldCheck,
  Cpu,
  Layers,
  ExternalLink,
} from "lucide-react";
import { usePwaStore } from "@/lib/pwa/pwa-store";
import { useHaptics } from "@/hooks/use-haptics";

export function AppDownloadModal() {
  const { isDownloadModalOpen, setDownloadModalOpen, isInstallable, promptInstall, isInstalled } =
    usePwaStore();
  const haptics = useHaptics();
  const [mounted, setMounted] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isDownloadModalOpen) return null;

  const handleInstallPwa = async () => {
    haptics.light();
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            haptics.light();
            setDownloadModalOpen(false);
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="relative w-full max-w-lg rounded-2xl border border-primary/40 bg-card/95 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
                <Smartphone className="size-6" />
              </div>
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-foreground">
                  Get ZenoDeck
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  v3.1.1 · Web, Android APK & PWA
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                haptics.light();
                setDownloadModalOpen(false);
              }}
              className="grid size-8 place-items-center rounded-lg border border-border/70 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
              aria-label="Close download modal"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Options Grid */}
          <div className="mt-5 space-y-3.5">
            {/* 1. Android APK Direct Download */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:border-primary/50">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                      Android Native APK
                    </span>
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                      Signed Release
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    Direct installation bundle (24.5 MB). 100% on-device WebAssembly, no account needed.
                  </p>
                </div>

                <a
                  href="/zenodeck.apk"
                  download="zenodeck.apk"
                  onClick={() => haptics.medium()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  <Download className="size-3.5" />
                  <span>Download</span>
                </a>
              </div>
              <div className="mt-2.5 flex items-center gap-3 border-t border-border/40 pt-2 font-mono text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3 text-emerald-400" /> Target SDK 36 (Android 15+)
                </span>
                <span>·</span>
                <span>SHA1 Keystore Signed</span>
              </div>
            </div>

            {/* 2. Web App (PWA) Install */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:border-neon/50">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                      Web App / PWA
                    </span>
                    <span className="rounded-full border border-neon/40 bg-neon/10 px-2 py-0.5 font-mono text-[9px] font-bold text-neon">
                      Instant Install
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    Install as desktop or phone home-screen app. Fast offline caching via Service Worker.
                  </p>
                </div>

                {isInstalled ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    <span>Installed</span>
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={handleInstallPwa}
                    disabled={installing}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neon/50 bg-neon/20 px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-neon hover:bg-neon/30 active:scale-95 transition-all"
                  >
                    <Layers className="size-3.5" />
                    <span>{installing ? "Installing…" : "Install"}</span>
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-1 text-[11px] font-mono text-muted-foreground">
                    <span>Use browser &quot;Install&quot;</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. iOS Configuration Profile */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:border-purple-500/50">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                      iOS Web Clip Profile
                    </span>
                    <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-400">
                      iPhone & iPad
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    Standard Apple mobileconfig file to launch ZenoDeck in full-screen standalone mode.
                  </p>
                </div>

                <a
                  href="/api/ios-profile"
                  download="zenodeck.mobileconfig"
                  onClick={() => haptics.light()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-3.5 py-2 font-mono text-xs font-medium text-foreground hover:border-purple-400/50 hover:text-purple-300 active:scale-95 transition-all"
                >
                  <Apple className="size-3.5" />
                  <span>Get Profile</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer Security Guarantee */}
          <div className="mt-5 rounded-xl border border-border/60 bg-background/30 p-3 text-center">
            <p className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Cpu className="size-3.5 text-neon" />
              <span>All versions run 100% on-device WebAssembly. Zero telemetry, zero uploads.</span>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
