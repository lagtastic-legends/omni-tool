"use client";

/**
 * PermissionGate — Android runtime permission request dialog.
 *
 * On first launch (or when permissions haven't been granted), shows a styled
 * dialog explaining why each permission is needed, then requests them in batch.
 *
 * Rendered via createPortal to document.body to guarantee 100% dead-centered
 * viewport positioning without clipping from transformed parent containers.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Music, ImageIcon, Bell, Shield, X } from "lucide-react";
import { OmniRecorder } from "@/lib/native-recorder";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useHaptics } from "@/hooks/use-haptics";
import { useAuth } from "@/lib/auth/auth-context";

const PERMISSION_KEY = "zenodeck_permissions_v3";

interface PermissionCategory {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "pending" | "granted" | "denied";
}

export function PermissionGate() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const haptics = useHaptics();
  const { mode, user } = useAuth();

  const [categories, setCategories] = useState<PermissionCategory[]>([
    {
      icon: <Music className="size-5 text-violet-400" />,
      title: "Music & Audio",
      description: "Process, edit, and extract audio from your media files",
      status: "pending",
    },
    {
      icon: <ImageIcon className="size-5 text-emerald-400" />,
      title: "Photos & Videos",
      description: "Load videos and images for conversion, compression, and editing",
      status: "pending",
    },
    {
      icon: <Bell className="size-5 text-amber-400" />,
      title: "Notifications",
      description: "Alert you when long media processing jobs complete",
      status: "pending",
    },
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Expose global inspection & manual trigger
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__omni_show_permissions = () => setVisible(true);
    }
  }, []);

  // Back button closes dialog if open
  useEffect(() => {
    if (visible) {
      return useNavStore.getState().registerOverlay("permission-gate", () => {
        dismiss();
        return true;
      });
    }
  }, [visible]);

  // Initial trigger check on native Android
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const isGuest = typeof window !== "undefined" && sessionStorage.getItem("omni_guest_session") === "true";
    const isLocked = mode === "configured" && !user && !isGuest;
    if (isLocked) return;

    const alreadyRequested = localStorage.getItem(PERMISSION_KEY);
    if (alreadyRequested) return;

    // Check if notification permissions are already granted by the system
    LocalNotifications.checkPermissions()
      .then((perm) => {
        if (perm.display === "granted") {
          localStorage.setItem(PERMISSION_KEY, "granted");
          return;
        }
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      })
      .catch(() => {
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      });
  }, [mode, user]);

  const requestAll = async () => {
    void haptics.medium();
    setRequesting(true);

    const updated = [...categories];

    try {
      // 1. Storage / media permissions
      // On Android 13+, granular media access is granted via WebChromeClient & scoped storage.
      await Filesystem.requestPermissions();
      updated[0].status = "granted";
      updated[1].status = "granted";
    } catch {
      updated[0].status = "granted";
      updated[1].status = "granted";
    }

    try {
      // 2. Notification permission
      const notifPerm = await LocalNotifications.requestPermissions();
      updated[2].status = notifPerm.display === "granted" ? "granted" : "denied";
    } catch {
      updated[2].status = "granted";
    }

    try {
      // 3. Recorder permissions (microphone + screen capture)
      await OmniRecorder.requestPermissions();
    } catch {
      // Non-blocking
    }

    setCategories(updated);
    localStorage.setItem(PERMISSION_KEY, "granted");

    // Auto-dismiss after a brief delay to show results
    setTimeout(() => {
      setVisible(false);
      setRequesting(false);
    }, 700);
  };

  const dismiss = () => {
    void haptics.light();
    localStorage.setItem(PERMISSION_KEY, "granted");
    setVisible(false);
  };

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-permissions-title"
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 pointer-events-auto select-none"
        >
          {/* Full-screen Dark Backdrop covering 100% of viewport */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismiss}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container — Dead-Centered */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            className="relative w-full max-w-sm rounded-2xl border border-border/80 bg-card text-card-foreground p-6 shadow-2xl focus:outline-none"
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              aria-label="Skip permissions"
            >
              <X className="size-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20">
                <Shield className="size-5 text-primary" />
              </div>
              <div>
                <h2 id="app-permissions-title" className="font-display text-sm font-bold tracking-wide">
                  App Permissions
                </h2>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
                  Required for full functionality
                </p>
              </div>
            </div>

            {/* Permission categories */}
            <div className="space-y-3 mb-6">
              {categories.map((cat, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                    cat.status === "granted"
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : cat.status === "denied"
                        ? "border-red-500/40 bg-red-500/10"
                        : "border-border/60 bg-card/40"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{cat.icon}</div>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-bold tracking-wide">
                      {cat.title}
                      {cat.status === "granted" && (
                        <span className="ml-2 text-emerald-400 font-normal">✓</span>
                      )}
                    </p>
                    <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="flex-1 rounded-xl border border-border/60 bg-card/60 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted/40 cursor-pointer"
              >
                Skip
              </button>
              <motion.button
                onClick={() => void requestAll()}
                disabled={requesting}
                whileHover={requesting ? undefined : { scale: 1.02 }}
                whileTap={requesting ? undefined : { scale: 0.97 }}
                className="flex-[2] rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-opacity disabled:opacity-60 glow-box-violet cursor-pointer"
              >
                {requesting ? "Requesting…" : "Grant Access"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
