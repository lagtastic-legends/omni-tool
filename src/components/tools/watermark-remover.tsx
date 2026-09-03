"use client";

import { useState, useRef, useEffect, ChangeEvent, DragEvent, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  Eraser,
  Sparkles,
  Database,
  Check,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ImagePlus,
  ShieldCheck,
  Scan,
  Zap,
  Split,
  ChevronRight,
  Crosshair,
  Wand2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { useVault } from "@/lib/vault/vault-context";
import {
  detectAiWatermark,
  detectWatermarkAtPoint,
  generativeEraseWatermark,
  createRegionThumbnail,
  type WatermarkZone,
  type DetectedWatermark,
  type InpaintMode,
  type InpaintCoverage,
} from "@/lib/imaging/ai-watermark";

export function WatermarkRemover() {
  const { toast } = useToast();
  const { save } = useVault();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [cleanedSrc, setCleanedSrc] = useState<string | null>(null);
  const [cleanedBlob, setCleanedBlob] = useState<Blob | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);

  const [detection, setDetection] = useState<DetectedWatermark | null>(null);
  const [selectedZone, setSelectedZone] = useState<WatermarkZone>("auto");
  const [inpaintMode, setInpaintMode] = useState<InpaintMode>("generative");
  const [coverage, setCoverage] = useState<InpaintCoverage>("balanced");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);

  // Comparison & View State
  const [viewMode, setViewMode] = useState<"compare" | "cleaned" | "original">("compare");
  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100%
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Vault state
  const [vaultState, setVaultState] = useState<"idle" | "saved">("idle");
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  /**
   * Executes AI detection and Generative Background/Subject Inpainting
   */
  const processImageCore = useCallback(
    async (
      file: File,
      zone: WatermarkZone = "auto",
      customPoint?: { x: number; y: number },
      currentMode: InpaintMode = inpaintMode,
      currentCoverage: InpaintCoverage = coverage
    ) => {
      setIsProcessing(true);
      setIsScanning(true);
      setVaultState("idle");
      const startTime = performance.now();

      try {
        const url = URL.createObjectURL(file);
        setOriginalSrc(url);

        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load image into memory"));
          img.src = url;
        });

        setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });

        // 1. Target Detection
        let detected: DetectedWatermark;
        if (customPoint) {
          detected = detectWatermarkAtPoint(img, customPoint.x, customPoint.y, 40);
        } else {
          detected = detectAiWatermark(img, zone);
        }
        setDetection(detected);

        // Visual scan feedback
        await new Promise((r) => setTimeout(r, 180));
        setIsScanning(false);

        // 2. Generative Inpainting Engine (Samsung Galaxy S26 Ultra style)
        const workCanvas = document.createElement("canvas");
        workCanvas.width = img.naturalWidth;
        workCanvas.height = img.naturalHeight;
        const ctx = workCanvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Could not initialize 2D canvas");

        ctx.drawImage(img, 0, 0);

        // Capture original zoomed thumbnail
        const originalThumb = createRegionThumbnail(workCanvas, detected.box, 16);

        // Run Generative Background & Subject Inpainting
        generativeEraseWatermark(workCanvas, detected.box, {
          mode: currentMode,
          coverage: currentCoverage,
          grainMatch: true,
        });

        // Capture cleaned thumbnail
        const cleanedThumb = createRegionThumbnail(workCanvas, detected.box, 16);

        detected.originalThumbnail = originalThumb;
        detected.cleanedThumbnail = cleanedThumb;
        setDetection({ ...detected });

        // Export result
        const blob = await new Promise<Blob | null>((resolve) => {
          workCanvas.toBlob(
            (b) => resolve(b),
            file.type === "image/png" ? "image/png" : "image/jpeg",
            0.96
          );
        });

        if (!blob) throw new Error("Failed to generate image blob");

        const resultUrl = URL.createObjectURL(blob);
        setCleanedSrc(resultUrl);
        setCleanedBlob(blob);

        const elapsed = Math.round(performance.now() - startTime);
        setProcessingTimeMs(elapsed);

        toast({
          title: "Generative Eraser Complete",
          description: `${detected.label} erased and background matching photo generated in ${elapsed}ms.`,
        });
      } catch (err: any) {
        console.error("AI Watermark error:", err);
        toast({
          title: "Processing Failed",
          description: err?.message || "Could not process image.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setIsScanning(false);
      }
    },
    [toast, inpaintMode, coverage]
  );

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }
    setImageFile(file);
    processImageCore(file, selectedZone);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleZoneChange = (zone: WatermarkZone) => {
    setSelectedZone(zone);
    if (imageFile) {
      processImageCore(imageFile, zone, undefined, inpaintMode, coverage);
    }
  };

  const handleCoverageChange = (cov: InpaintCoverage) => {
    setCoverage(cov);
    if (imageFile) {
      processImageCore(imageFile, selectedZone, undefined, inpaintMode, cov);
    }
  };

  /**
   * Tap-To-Erase (Samsung Galaxy Object Eraser interaction)
   * Allows user to click/tap anywhere on the image to pinpoint custom watermark/logo
   */
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode === "compare") return; // Keep comparison slider active in compare mode
    if (!imageFile || !imageDimensions || !imageElementRef.current) return;

    const rect = imageElementRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) return;

    const naturalX = Math.round((clickX / rect.width) * imageDimensions.w);
    const naturalY = Math.round((clickY / rect.height) * imageDimensions.h);

    setSelectedZone("custom");
    processImageCore(imageFile, "custom", { x: naturalX, y: naturalY }, inpaintMode, coverage);
  };

  const handleDownload = () => {
    if (!cleanedBlob || !imageFile) return;
    const cleanName = `cleaned_${imageFile.name.replace(/\.[^/.]+$/, "")}.png`;
    void import("@/lib/native-save").then((m) => m.nativeSave(cleanedBlob, cleanName));
  };

  const saveToVault = async () => {
    if (!cleanedBlob || !imageFile) return;
    const cleanName = `cleaned_${imageFile.name.replace(/\.[^/.]+$/, "")}.png`;
    const item = await save({
      name: cleanName,
      blob: cleanedBlob,
      mime: cleanedBlob.type,
      size: cleanedBlob.size,
    });
    if (item) setVaultState("saved");
  };

  const resetAll = () => {
    setImageFile(null);
    setOriginalSrc(null);
    setCleanedSrc(null);
    setCleanedBlob(null);
    setDetection(null);
    setVaultState("idle");
    setProcessingTimeMs(null);
    setSelectedZone("auto");
  };

  // Slider events for Before/After split
  const updateSliderFromEvent = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = (x / rect.width) * 100;
    setSliderPos(Math.max(2, Math.min(98, pct)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingSlider(true);
    updateSliderFromEvent(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSlider) return;
    updateSliderFromEvent(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDraggingSlider(false);
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-6 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors duration-300",
        isDragOver ? "bg-fuchsia-500/5" : ""
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Top Header Card */}
      <div
        className={cn(
          "flex flex-col gap-4 rounded-2xl border p-6 shadow-[0_2px_24px_rgba(217,70,239,0.06)] transition-all duration-200",
          isDragOver
            ? "border-fuchsia-500 border-dashed bg-fuchsia-500/10"
            : "border-outline-variant/60 bg-surface-container-low"
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400 shadow-sm">
              <Wand2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-on-surface">
                  Generative AI Watermark Eraser
                </h2>
                <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-fuchsia-300">
                  Galaxy S26 Ultra Logic
                </span>
              </div>
              <p className="font-body text-xs text-on-surface-variant">
                Auto-detects watermarks and generatively reconstructs photo-matching background & subject texture.
              </p>
            </div>
          </div>

          {detection && (
            <div className="flex items-center gap-2 self-start rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 font-mono text-[11px] font-semibold text-fuchsia-300 sm:self-auto">
              <Zap className="size-3.5 animate-pulse text-fuchsia-400" />
              <span>{detection.label}</span>
              {processingTimeMs && (
                <span className="opacity-60">· {processingTimeMs}ms</span>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-5 font-headline text-sm font-semibold tracking-wide text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="size-4" />
            {imageFile ? "UPLOAD ANOTHER" : "SELECT IMAGE"}
          </button>

          {cleanedSrc && (
            <>
              <button
                onClick={handleDownload}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-pulse/40 bg-pulse/15 px-5 font-display text-xs font-bold tracking-[0.18em] text-pulse transition-colors hover:bg-pulse/25 sm:flex-none"
              >
                <Download className="size-4" /> SAVE TO DEVICE
              </button>

              <button
                onClick={() => void saveToVault()}
                disabled={vaultState === "saved"}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 font-display text-xs font-bold tracking-[0.18em] transition-colors",
                  vaultState === "saved"
                    ? "border-pulse/40 bg-pulse/10 text-pulse"
                    : "border-outline-variant/70 bg-surface-container-low text-on-surface-variant hover:border-fuchsia-400/40 hover:text-fuchsia-300"
                )}
              >
                {vaultState === "saved" ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  <Database className="size-4" />
                )}
                <span>{vaultState === "saved" ? "VAULTED" : "VAULT"}</span>
              </button>

              <button
                onClick={resetAll}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant/70 bg-surface-container-highest px-4 font-headline text-xs font-bold tracking-wide text-on-surface transition-transform hover:scale-[1.02]"
                title="Reset Image"
              >
                <RefreshCw className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty Drop Zone State */}
      {!imageFile && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "group flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer min-h-[340px]",
            isDragOver
              ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300 scale-[0.99]"
              : "border-outline-variant/60 bg-surface-container-lowest/40 text-on-surface-variant hover:border-fuchsia-500/40 hover:bg-surface-container-lowest"
          )}
        >
          <div className="grid size-16 place-items-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400 shadow-inner transition-transform group-hover:scale-110">
            <Sparkles className="size-8" />
          </div>
          <div className="space-y-1">
            <p className="font-headline text-base font-bold text-on-surface">
              {isDragOver ? "Drop image here to erase" : "Drag & drop image here"}
            </p>
            <p className="font-body text-xs text-on-surface-variant/80">
              Drop any DALL-E, Midjourney, Bing, Meta AI, or AI image to auto-detect & generatively reconstruct
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fuchsia-300">
              Generative Subject Synthesis
            </span>
            <span className="rounded-full border border-outline-variant/50 bg-surface-container-highest px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
              100% On-Device · Works in Web & APK
            </span>
          </div>
        </div>
      )}

      {/* Active Processing / Preview View */}
      {imageFile && (originalSrc || cleanedSrc) && (
        <div className="flex flex-1 flex-col gap-4">
          {/* Controls Bar & View Switcher */}
          <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
            {/* View Mode Selector */}
            <div className="flex items-center gap-1 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-1 text-xs">
              <button
                onClick={() => setViewMode("compare")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-headline font-semibold transition-colors",
                  viewMode === "compare"
                    ? "bg-fuchsia-500/20 text-fuchsia-300"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <Split className="size-3.5" /> Split Compare
              </button>
              <button
                onClick={() => setViewMode("cleaned")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-headline font-semibold transition-colors",
                  viewMode === "cleaned"
                    ? "bg-fuchsia-500/20 text-fuchsia-300"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <Eye className="size-3.5" /> Cleaned Result
              </button>
              <button
                onClick={() => setViewMode("original")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-headline font-semibold transition-colors",
                  viewMode === "original"
                    ? "bg-fuchsia-500/20 text-fuchsia-300"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                Original
              </button>
            </div>

            {/* Generative Coverage & AI Zone Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase text-on-surface-variant">Zone:</span>
                <div className="flex items-center gap-1 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-1 text-xs">
                  {(
                    [
                      { id: "auto", label: "✨ Auto" },
                      { id: "bottom-right", label: "↘ BR" },
                      { id: "bottom-left", label: "↙ BL" },
                      { id: "top-right", label: "↗ TR" },
                      { id: "bottom-banner", label: "Banner" },
                    ] as const
                  ).map((z) => (
                    <button
                      key={z.id}
                      disabled={isProcessing}
                      onClick={() => handleZoneChange(z.id)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 font-mono text-[11px] transition-colors disabled:opacity-50",
                        selectedZone === z.id
                          ? "bg-fuchsia-600 text-white font-semibold shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase text-on-surface-variant">Coverage:</span>
                <div className="flex items-center gap-1 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-1 text-xs">
                  {(
                    [
                      { id: "tight", label: "Tight" },
                      { id: "balanced", label: "Balanced" },
                      { id: "expand", label: "Expand" },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      disabled={isProcessing}
                      onClick={() => handleCoverageChange(c.id)}
                      className={cn(
                        "rounded-lg px-2 py-1 font-mono text-[10px] transition-colors disabled:opacity-50",
                        coverage === c.id
                          ? "bg-fuchsia-500/30 text-fuchsia-300 font-semibold"
                          : "text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Tap Hint */}
          <div className="flex items-center justify-between px-2 text-[11px] text-on-surface-variant font-mono">
            <span className="flex items-center gap-1.5">
              <Crosshair className="size-3.5 text-fuchsia-400" />
              Tip: Tap or click anywhere on the photo to pinpoint & erase custom watermarks/objects
            </span>
            {imageDimensions && (
              <span className="opacity-70">
                {imageDimensions.w} × {imageDimensions.h} px
              </span>
            )}
          </div>

          {/* Main Visual Display */}
          <div
            ref={containerRef}
            onClick={handleImageClick}
            onPointerDown={viewMode === "compare" ? handlePointerDown : undefined}
            className={cn(
              "relative flex flex-1 select-none items-center justify-center overflow-hidden rounded-2xl border border-outline-variant/60 bg-black/70 p-2 shadow-2xl min-h-[440px]",
              viewMode === "compare" ? "cursor-ew-resize" : "cursor-crosshair"
            )}
          >
            {/* AI Radar / Scanner Overlay when processing */}
            <AnimatePresence>
              {(isScanning || isProcessing) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/75 backdrop-blur-md"
                >
                  <div className="relative grid size-16 place-items-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-fuchsia-500/20" />
                    <Scan className="size-8 animate-pulse text-fuchsia-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-headline text-sm font-bold text-white tracking-wide">
                      GENERATIVE AI RECONSTRUCTING BACKGROUND…
                    </p>
                    <p className="mt-1 font-mono text-xs text-fuchsia-300">
                      Analyzing surrounding photo texture, structural lines & gradient continuity
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 1. Cleaned Mode */}
            {viewMode === "cleaned" && cleanedSrc && (
              <img
                ref={imageElementRef}
                src={cleanedSrc}
                alt="Cleaned Result"
                className="max-h-[68vh] max-w-full rounded-xl border border-outline-variant/30 object-contain shadow-2xl"
              />
            )}

            {/* 2. Original Mode */}
            {viewMode === "original" && originalSrc && (
              <div className="relative">
                <img
                  ref={imageElementRef}
                  src={originalSrc}
                  alt="Original Image"
                  className="max-h-[68vh] max-w-full rounded-xl border border-outline-variant/30 object-contain shadow-2xl"
                />
                {detection && (
                  <div className="absolute bottom-4 right-4 rounded-lg border border-fuchsia-500/80 bg-fuchsia-500/20 px-3 py-1 font-mono text-[11px] font-bold text-fuchsia-200 backdrop-blur-md">
                    WATERMARK DETECTED
                  </div>
                )}
              </div>
            )}

            {/* 3. Interactive Split Comparison Mode */}
            {viewMode === "compare" && originalSrc && cleanedSrc && (
              <div className="relative max-h-[68vh] max-w-full overflow-hidden rounded-xl border border-outline-variant/30 shadow-2xl">
                {/* Cleaned Image (Base Layer) */}
                <img
                  ref={imageElementRef}
                  src={cleanedSrc}
                  alt="Cleaned"
                  className="max-h-[68vh] w-auto max-w-full object-contain pointer-events-none"
                />

                {/* Original Image (Clipped Left Layer) */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={originalSrc}
                    alt="Original"
                    className="max-h-[68vh] w-auto max-w-none object-contain"
                  />
                  <div className="absolute top-3 left-3 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                    BEFORE (ORIGINAL)
                  </div>
                </div>

                <div className="absolute top-3 right-3 rounded-md bg-fuchsia-600/85 px-2 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur-sm pointer-events-none">
                  AFTER (GENERATIVE ERASED)
                </div>

                {/* Slider Handle Line */}
                <div
                  className="absolute top-0 bottom-0 z-20 w-0.5 bg-gradient-to-b from-fuchsia-400 via-white to-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.8)]"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-full border-2 border-white bg-fuchsia-600 text-white shadow-xl transition-transform hover:scale-110 active:scale-95">
                    <Split className="size-3.5" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Watermark Zoom Inspection Card */}
          {detection && detection.originalThumbnail && detection.cleanedThumbnail && (
            <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  <span className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
                    Area Inspection: {detection.label}
                  </span>
                </div>
                <p className="font-body text-[11px] text-on-surface-variant">
                  Close-up view of the photo-matching generative background synthesis.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="size-14 overflow-hidden rounded-lg border border-red-500/40 bg-black shadow-inner">
                    <img
                      src={detection.originalThumbnail}
                      alt="Watermark Before"
                      className="size-full object-cover"
                    />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-red-400">
                    Watermark
                  </span>
                </div>

                <ChevronRight className="size-4 text-on-surface-variant/40" />

                <div className="flex flex-col items-center gap-1">
                  <div className="size-14 overflow-hidden rounded-lg border border-emerald-500/50 bg-black shadow-inner">
                    <img
                      src={detection.cleanedThumbnail}
                      alt="Watermark After"
                      className="size-full object-cover"
                    />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400 font-semibold">
                    Synthesized
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
