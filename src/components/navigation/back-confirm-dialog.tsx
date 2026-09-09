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
import { AlertTriangle } from "lucide-react";
import { useNavStore } from "@/lib/navigation/nav-store";

export function BackConfirmDialog() {
  const confirmDialogState = useNavStore((s) => s.confirmDialogState);

  if (!confirmDialogState) return null;

  return (
    <AlertDialog
      open={confirmDialogState.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          confirmDialogState.onCancel();
        }
      }}
    >
      <AlertDialogContent className="border border-warning/40 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-2.5 text-warning">
            <div className="rounded-full bg-warning/15 p-2 ring-1 ring-warning/30">
              <AlertTriangle className="size-5" />
            </div>
            <AlertDialogTitle className="font-display text-base font-bold tracking-wide text-foreground">
              {confirmDialogState.title || "Unsaved Work in Progress"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="font-mono text-xs leading-relaxed text-muted-foreground">
            {confirmDialogState.message}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
          <AlertDialogCancel
            onClick={confirmDialogState.onCancel}
            className="border-border/80 bg-card/60 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-card hover:text-foreground"
          >
            Keep Working
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDialogState.onConfirm}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-mono text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.4)]"
          >
            Discard & Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
