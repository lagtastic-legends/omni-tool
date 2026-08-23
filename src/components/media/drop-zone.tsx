"use client";

/**
 * DropZone — drag & drop + click-to-browse file intake with inline preview.
 * Video files are probed natively (duration / dimensions) and reported up
 * via onProbed so tools can build time-range UIs without touching ffmpeg.
 */

import { AnimatePresence, motion } from "framer-motion";
import { FileVideo, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/format";
import { SIZE_BLOCK_BYTES, SIZE_WARN_BYTES } from "@/lib/media/ffmpeg-jobs";
import { probeAudioDuration, probeVideo, type VideoMeta } from "@/lib/media/probe";

interface DropZoneProps {
  /** MIME filter, e.g. "video/*" — also used to validate drops. */
  accept: string;
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
  /** "video" renders a <video> preview + metadata chips. */
  preview?: "video" | "audio" | "none";
  label?: string;
  hint?: string;
  disabled?: boolean;
  onProbed?: (meta: VideoMeta) => void;
}

export function DropZone({
  accept,
  file,
  onFile,
  onClear,
  preview = "none",
  label = "Drop your file here",
  hint,
  disabled = false,
  onProbed,
}: DropZoneProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [probed, setProbed] = useState<{ file: File; meta: VideoMeta } | null>(null);

  /* Preview URL is derived, not stored — creation in useMemo, revocation
   * handled by the effect cleanup whenever it (or unmount) goes stale. */
  const previewUrl = useMemo(
    () => (file && preview !== "none" ? URL.createObjectURL(file) : null),
    [file, preview],
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  /* Native metadata probe — setState lands inside the async callback,
   * never synchronously in the effect body. Audio probing reports duration
   * only (width/height zeroed) for range-slider UIs. */
  useEffect(() => {
    if (!file || preview === "none") return;
    let cancelled = false;
    const probing: Promise<VideoMeta> =
      preview === "video"
        ? probeVideo(file)
        : probeAudioDuration(file).then((d) => ({
            durationSec: d,
            width: 0,
            height: 0,
          }));
    probing
      .then((m) => {
        if (cancelled) return;
        setProbed({ file, meta: m });
        onProbed?.(m);
      })
      .catch(() => {
        /* metadata unreadable — preview still renders */
      });
    return () => {
      cancelled = true;
    };
  }, [file, preview]);

  /* Only trust probe results that belong to the current file. */
  const meta = probed && probed.file === file ? probed.meta : null;

  const kindPrefix = accept.endsWith("*") ? accept.slice(0, -1) : "";

  const acceptFile = (f: File | undefined) => {
    if (!f || disabled) return;
    const matchesKind =
      !kindPrefix ||
      f.type.startsWith(kindPrefix) ||
      (kindPrefix === "video/" && /\.(mp4|mov|avi|mkv|webm|m4v|mpg|mpeg|wmv|3gp|ts)$/i.test(f.name));
    if (!matchesKind) {
      toast({
        title: "Unsupported file",
        description: `This module accepts ${accept} files.`,
        variant: "destructive",
      });
      return;
    }
    if (f.size > SIZE_BLOCK_BYTES) {
      toast({
        title: "File too large",
        description:
          "The in-browser engine caps out near 900 MB. Try a smaller file.",
        variant: "destructive",
      });
      return;
    }
    if (f.size > SIZE_WARN_BYTES) {
      toast({
        title: "Large file ahead",
        description:
          "Over 300 MB — processing may take a while and use significant memory.",
      });
    }
    onFile(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="drop"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={() => !disabled && inputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              dragDepth.current += 1;
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              dragDepth.current = Math.max(dragDepth.current - 1, 0);
              if (dragDepth.current === 0) setDragging(false);
            }}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            aria-label={`${label} — click or drag to upload`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            className={`group flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              dragging
                ? "border-primary bg-primary/10 glow-box-violet"
                : "border-border/80 bg-card/40 hover:border-primary/50 hover:bg-card/60"
            } ${disabled ? "pointer-events-none opacity-50" : ""}`}
          >
            <motion.div
              animate={dragging ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
              className="grid size-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10"
            >
              <UploadCloud className="size-7 text-primary" strokeWidth={1.5} />
            </motion.div>
            <div>
              <p className="font-display text-sm font-bold tracking-wide text-foreground">
                {label}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {hint ?? "click to browse — or drag & drop"}
              </p>
            </div>
            <span className="rounded-full border border-border/60 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              {accept} · stays on device
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3 rounded-xl border border-border/70 bg-card/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10">
                <FileVideo className="size-5 text-primary" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-medium text-foreground">
                  {file.name}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {formatBytes(file.size)}
                  {file.type ? ` · ${file.type}` : ""}
                  {meta ? ` · ${meta.width}×${meta.height} · ${meta.durationSec.toFixed(1)}s` : ""}
                </p>
              </div>
              <button
                onClick={() => {
                  onClear();
                }}
                disabled={disabled}
                aria-label="Remove file"
                className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-red-400/50 hover:text-red-300"
              >
                <X className="size-4" />
              </button>
            </div>

            {preview === "video" && previewUrl && (
              <video
                src={previewUrl}
                controls
                muted
                playsInline
                className="max-h-64 w-full rounded-lg border border-border/50 bg-black"
              />
            )}
            {preview === "audio" && previewUrl && (
              <audio src={previewUrl} controls className="w-full" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label="Upload media file"
        onChange={(e) => {
          acceptFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
