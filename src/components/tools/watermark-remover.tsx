"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Upload, Download, Eraser, Image as ImageIcon, MousePointer2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export function WatermarkRemover() {
  const { state: engineState, engine, boot } = useFFmpegEngine();
  const { toast } = useToast();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [resultSrc, setResultSrc] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Box selection state
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [imageScale, setImageScale] = useState({ scaleX: 1, scaleY: 1 });

  // Initialize engine if not ready
  useEffect(() => {
    if (engineState === "idle" || engineState === "standby") {
      boot().catch(console.error);
    }
  }, [engineState, boot]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }

    setImageFile(file);
    setResultSrc(null);
    setBox(null);
    
    const url = URL.createObjectURL(file);
    setImageSrc(url);
  };

  const drawCanvas = (imgSrc: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Fit to container width while maintaining aspect ratio
      const containerWidth = canvas.parentElement?.clientWidth || 800;
      const maxWidth = Math.min(containerWidth - 32, 800); 
      let drawWidth = img.width;
      let drawHeight = img.height;

      if (img.width > maxWidth) {
        drawWidth = maxWidth;
        drawHeight = (img.height / img.width) * maxWidth;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;

      // Track scale for FFmpeg coordinates mapping
      setImageScale({
        scaleX: img.width / drawWidth,
        scaleY: img.height / drawHeight
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

      if (box) {
        ctx.strokeStyle = "#ff0055"; // neon pink
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = "rgba(255, 0, 85, 0.2)";
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
    };
    img.src = imgSrc;
  };

  useEffect(() => {
    if (imageSrc && !resultSrc) {
      drawCanvas(imageSrc);
    }
  }, [imageSrc, box, resultSrc]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (resultSrc) return; // Prevent selection on result
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setBox({ x, y, w: 0, h: 0 });
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setBox({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      w: Math.abs(x - startPos.x),
      h: Math.abs(y - startPos.y)
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const processImage = async () => {
    if (!engine || !imageFile || !box) return;
    
    // FFmpeg requires w and h to be > 0 and usually even
    const realX = Math.floor(box.x * imageScale.scaleX);
    const realY = Math.floor(box.y * imageScale.scaleY);
    const realW = Math.max(2, Math.floor(box.w * imageScale.scaleX));
    const realH = Math.max(2, Math.floor(box.h * imageScale.scaleY));

    if (realW < 10 || realH < 10) {
      toast({ title: "Selection too small", description: "Please draw a larger box around the watermark." });
      return;
    }

    setIsProcessing(true);
    const inputName = `input_${imageFile.name}`;
    const outputName = `output_${imageFile.name}`;

    try {
      await engine.writeFile(inputName, await fetchFile(imageFile));
      
      // Use delogo filter
      // delogo=x=10:y=10:w=100:h=100
      await engine.exec([
        "-i", inputName,
        "-vf", `delogo=x=${realX}:y=${realY}:w=${realW}:h=${realH}`,
        "-c:a", "copy",
        outputName
      ]);

      const data = await engine.readFile(outputName);
      const blob = new Blob([data], { type: imageFile.type });
      const url = URL.createObjectURL(blob);
      
      setResultSrc(url);
      
      // Cleanup
      await engine.deleteFile(inputName);
      await engine.deleteFile(outputName);
      
      toast({ title: "Success", description: "Watermark erased using spatial interpolation." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to process image.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultSrc || !imageFile) return;
    const a = document.createElement("a");
    a.href = resultSrc;
    a.download = `cleaned_${imageFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 rounded-xl border border-outline-variant/60 bg-surface-container-low p-6 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-on-surface">
          <Eraser className="size-5 text-primary" /> Visual Watermark Eraser
        </h2>
        <p className="font-body text-sm text-on-surface-variant">
          Remove visible AI watermarks (like DALL-E logos) from images. Draw a box over the logo and erase it 100% on-device using FFmpeg spatial interpolation.
        </p>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-headline text-sm font-semibold tracking-wide text-on-primary transition-transform hover:scale-[1.02]"
          >
            <Upload className="size-4" /> UPLOAD IMAGE
          </button>
          
          {imageSrc && !resultSrc && (
            <button
              onClick={processImage}
              disabled={!box || box.w === 0 || isProcessing || engineState !== "ready"}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-surface-container-highest px-5 font-headline text-sm font-semibold tracking-wide text-on-surface transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="animate-pulse">ERASING...</span>
              ) : (
                <>
                  <Eraser className="size-4" /> ERASE SELECTION
                </>
              )}
            </button>
          )}

          {resultSrc && (
            <button
              onClick={handleDownload}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-headline text-sm font-semibold tracking-wide text-white transition-transform hover:scale-[1.02]"
            >
              <Download className="size-4" /> SAVE IMAGE
            </button>
          )}
        </div>
      </div>

      {(imageSrc || resultSrc) && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-headline text-sm font-semibold tracking-wide text-on-surface">
              {resultSrc ? "CLEANED RESULT" : "DRAW BOX OVER WATERMARK"}
            </h3>
            {!resultSrc && (
              <span className="flex items-center gap-2 font-mono text-[10px] text-on-surface-variant">
                <MousePointer2 className="size-3" /> CLICK & DRAG
              </span>
            )}
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-auto rounded-xl border border-outline-variant/60 bg-black/40 p-4 shadow-inner">
            {resultSrc ? (
              <img src={resultSrc} alt="Result" className="max-h-[60vh] max-w-full rounded border border-outline-variant/30" />
            ) : (
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="cursor-crosshair touch-none rounded border border-outline-variant/30 bg-surface-container-lowest"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
