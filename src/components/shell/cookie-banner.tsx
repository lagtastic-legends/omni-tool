"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck, X } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "omni_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        // Delay slightly for smooth page entrance
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
      window.dispatchEvent(new CustomEvent("omni_analytics_consent", { detail: true }));
    } catch {}
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "declined");
      window.dispatchEvent(new CustomEvent("omni_analytics_consent", { detail: false }));
    } catch {}
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          role="region"
          aria-label="Cookie and Privacy Consent"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-border/80 bg-background/90 p-4 sm:p-5 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <Cookie className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-xs font-bold text-foreground">
                  Privacy & Cookie Preferences
                </p>
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  We use strictly essential local storage for authentication and offline WASM processing.
                  No intrusive tracking. Read our{" "}
                  <Link href="/privacy" className="text-primary underline hover:text-primary/80">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 sm:pt-0 sm:shrink-0">
              <button
                type="button"
                onClick={handleDecline}
                className="flex-1 sm:flex-initial rounded-xl border border-border/70 bg-card/60 px-3.5 py-2 font-mono text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Essential Only
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 sm:flex-initial rounded-xl bg-primary px-4 py-2 font-display text-[11px] font-bold text-primary-foreground shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                Accept All
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
