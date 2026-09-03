"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Database, Search } from "lucide-react";
import { useNavStore } from "@/lib/navigation/nav-store";
import { cn } from "@/lib/utils";

/**
 * Sticky Mobile CTA that docks to the bottom of the viewport on mobile devices.
 * Automatically conceals itself when a tool is active to prevent blocking tool interactions.
 */
export function StickyMobileCta() {
  const { view, navigate } = useNavStore();

  if (view !== "dashboard") return null;

  const scrollToTools = () => {
    const el = document.getElementById("tool-matrix");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openSearch = () => {
    // Trigger the existing global Cmd+K / Ctrl+K search palette listener
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        ctrlKey: true,
        bubbles: true,
      })
    );
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Mobile Quick Actions"
        className="fixed bottom-0 left-0 right-0 z-30 sm:hidden border-t border-border/80 bg-background/85 backdrop-blur-xl px-3 sm:px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pl-[calc(env(safe-area-inset-left)+0.75rem)] pr-[calc(env(safe-area-inset-right)+0.75rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          {/* Quick Tool Explorer CTA */}
          <button
            type="button"
            onClick={scrollToTools}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 px-3 font-display text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm active:scale-95 transition-transform"
          >
            <Wrench className="size-3.5 shrink-0" />
            <span>Tools</span>
          </button>

          {/* Quick Search */}
          <button
            type="button"
            onClick={openSearch}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card/60 py-2.5 px-3.5 font-mono text-[11px] font-medium text-muted-foreground active:scale-95 transition-all hover:text-foreground"
          >
            <Search className="size-3.5 shrink-0" />
            <span>Search</span>
          </button>

          {/* Quick Vault */}
          <button
            type="button"
            onClick={() => navigate("vault")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card/60 py-2.5 px-3.5 font-mono text-[11px] font-medium text-neon active:scale-95 transition-all hover:border-neon/40"
          >
            <Database className="size-3.5 shrink-0" />
            <span>Vault</span>
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
