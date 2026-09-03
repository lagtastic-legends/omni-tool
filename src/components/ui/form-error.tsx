"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormErrorProps {
  message?: string | null;
  id?: string;
  className?: string;
}

/**
 * Standardized, accessible Form Error State component.
 * Equipped with role="alert", aria-live="polite", and smooth entrance animation.
 */
export function FormError({ message, id, className }: FormErrorProps) {
  return (
    <AnimatePresence mode="wait">
      {message ? (
        <motion.div
          id={id}
          role="alert"
          aria-live="polite"
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive shadow-sm",
            className
          )}
        >
          <AlertCircle className="size-3.5 shrink-0 text-destructive" />
          <span className="leading-tight">{message}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
