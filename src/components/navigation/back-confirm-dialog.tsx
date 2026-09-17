"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  FileAudio,
  FileVideo,
  FileImage,
  FileText,
  Files,
  Trash2,
  X,
} from "lucide-react";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useHaptics } from "@/hooks/use-haptics";

function getCategoryConfig(category?: string, filename?: string) {
  const ext = filename?.split(".").pop()?.toLowerCase() || "";
  let resolvedCat = category;
  if (!resolvedCat) {
    if (["mp3", "wav", "aac", "m4a", "flac", "ogg", "opus", "aiff"].includes(ext)) resolvedCat = "audio";
    else if (["mp4", "webm", "mkv", "mov", "avi", "flv"].includes(ext)) resolvedCat = "video";
    else if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext)) resolvedCat = "image";
    else if (["pdf"].includes(ext)) resolvedCat = "pdf";
    else resolvedCat = "file";
  }

  switch (resolvedCat) {
    case "audio":
      return {
        Icon: FileAudio,
        color: "text-cyan-500 dark:text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/30",
        badge: "AUDIO MEDIA",
      };
    case "video":
      return {
        Icon: FileVideo,
        color: "text-violet-500 dark:text-violet-400",
        bg: "bg-violet-500/10",
        border: "border-violet-500/30",
        badge: "VIDEO MEDIA",
      };
    case "image":
      return {
        Icon: FileImage,
        color: "text-emerald-500 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        badge: "IMAGE ASSET",
      };
    case "pdf":
      return {
        Icon: FileText,
        color: "text-amber-500 dark:text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        badge: "DOCUMENT",
      };
    default:
      return {
        Icon: Files,
        color: "text-muted-foreground",
        bg: "bg-muted/30",
        border: "border-border/50",
        badge: "ACTIVE FILE",
      };
  }
}

export function BackConfirmDialog() {
  const confirmDialogState = useNavStore((s) => s.confirmDialogState);
  const haptics = useHaptics();

  if (!confirmDialogState) return null;

  const rawFileName =
    confirmDialogState.fileName ||
    confirmDialogState.message?.match(/"([^"]+)"/)?.[1] ||
    null;

  const catConfig = getCategoryConfig(confirmDialogState.category, rawFileName || undefined);

  return (
    <AlertDialog
      open={confirmDialogState.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          haptics.impact("light");
          confirmDialogState.onCancel();
        }
      }}
    >
      <AlertDialogContent className="relative max-w-[420px] w-full p-0 overflow-hidden rounded-2xl border border-amber-500/35 bg-card/95 text-card-foreground shadow-[0_12px_45px_rgba(0,0,0,0.5),0_0_35px_rgba(245,158,11,0.14)] backdrop-blur-2xl focus:outline-none">
        {/* Ambient Top Laser Edge Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-amber-500/90 dark:via-amber-400 to-transparent opacity-95" />

        {/* Top-right Quick Dismiss Button */}
        <button
          type="button"
          onClick={() => {
            haptics.impact("light");
            confirmDialogState.onCancel();
          }}
          aria-label="Close dialog"
          className="absolute right-3.5 top-4 rounded-xl border border-border/60 bg-card/60 p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95 focus:outline-none"
        >
          <X className="size-4" />
        </button>

        <div className="p-5 sm:p-6 space-y-4">
          <AlertDialogHeader className="space-y-3.5 text-left">
            {/* Status Header */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/35 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.22)]">
                <AlertTriangle className="size-6 animate-pulse" />
                <span className="absolute -inset-1 rounded-2xl border border-amber-500/20 animate-ping pointer-events-none opacity-40" />
              </div>

              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
                    <span className="size-1.5 rounded-full bg-current animate-pulse" />
                    UNSAVED WORKSPACE
                  </span>
                </div>
                <AlertDialogTitle className="font-display text-base sm:text-lg font-bold tracking-wide text-foreground leading-tight">
                  {confirmDialogState.title || "Discard Unsaved Work?"}
                </AlertDialogTitle>
              </div>
            </div>

            {/* Inset File Detail Card */}
            {rawFileName ? (
              <div className="rounded-xl border border-border/70 bg-secondary/40 p-3.5 space-y-2 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${catConfig.border} ${catConfig.bg} ${catConfig.color}`}
                  >
                    <catConfig.Icon className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p
                      title={rawFileName}
                      className="font-mono text-xs font-semibold text-foreground truncate select-all leading-snug"
                    >
                      {rawFileName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                      <span className="inline-flex items-center gap-1 uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">
                        <span className="size-1 rounded-full bg-current" />
                        {catConfig.badge}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <AlertDialogDescription className="font-mono text-xs leading-relaxed text-muted-foreground">
              {rawFileName
                ? "Going back will unload this file and discard any in-memory adjustments, configurations, or operations. Are you sure you want to proceed?"
                : confirmDialogState.message}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 grid grid-cols-2 gap-2.5 sm:space-x-0">
            <AlertDialogCancel
              onClick={() => {
                haptics.impact("light");
                confirmDialogState.onCancel();
              }}
              className="min-h-11 rounded-tactile border border-border/80 bg-secondary/50 hover:bg-secondary text-secondary-foreground font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              Keep Working
              <kbd className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-muted-foreground font-mono">
                ESC
              </kbd>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                haptics.impact("medium");
                confirmDialogState.onConfirm();
              }}
              className="min-h-11 rounded-tactile bg-destructive hover:bg-destructive/90 text-destructive-foreground font-mono text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.35)] transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Trash2 className="size-3.5" />
              Discard & Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
