"use client";

/**
 * PermissionGate — Android runtime permission request dialog.
 *
 * On first launch (or when permissions haven't been granted), shows a styled
 * dialog explaining why each permission is needed, then requests them in batch.
 * Persisted to localStorage so it only shows once per install.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Music, ImageIcon, Bell, Shield, X } from "lucide-react";
import { OmniRecorder } from "@/lib/native-recorder";

const PERMISSION_KEY = "omni_permissions_requested_v1";

interface PermissionCategory {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "pending" | "granted" | "denied";
}

export function PermissionGate() {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
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
    if (!Capacitor.isNativePlatform()) return;
    const alreadyRequested = localStorage.getItem(PERMISSION_KEY);
    if (alreadyRequested) return;
    // Small delay to let the app settle before showing the dialog
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const requestAll = async () => {
    setRequesting(true);

    const updated = [...categories];

    try {
      // 1. Storage / media permissions (covers audio + photos + videos)
      const storagePerm = await Filesystem.requestPermissions();
      const storageGranted = storagePerm.publicStorage === "granted";
      updated[0].status = storageGranted ? "granted" : "denied";
      updated[1].status = storageGranted ? "granted" : "denied";
    } catch {
      updated[0].status = "denied";
      updated[1].status = "denied";
    }

    try {
      // 2. Notification permission
      const notifPerm = await LocalNotifications.requestPermissions();
      updated[2].status = notifPerm.display === "granted" ? "granted" : "denied";
    } catch {
      updated[2].status = "denied";
    }

    try {
      // 3. Recorder permissions (microphone + screen capture)
      await OmniRecorder.requestPermissions();
    } catch {
      // Non-blocking
    }

    setCategories(updated);
    localStorage.setItem(PERMISSION_KEY, Date.now().toString());

    // Auto-dismiss after a brief delay to show results
    setTimeout(() => setVisible(false), 800);
    setRequesting(false);
  };

  const dismiss = () => {
    localStorage.setItem(PERMISSION_KEY, Date.now().toString());
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
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
                <h2 className="font-display text-sm font-bold tracking-wide">
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
                className="flex-1 rounded-xl border border-border/60 bg-card/60 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted/40"
              >
                Skip
              </button>
              <motion.button
                onClick={() => void requestAll()}
                disabled={requesting}
                whileHover={requesting ? undefined : { scale: 1.02 }}
                whileTap={requesting ? undefined : { scale: 0.97 }}
                className="flex-[2] rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-opacity disabled:opacity-60 glow-box-violet"
              >
                {requesting ? "Requesting…" : "Grant Access"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
