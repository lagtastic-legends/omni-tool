"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Upload, Copy, Download, Image as ImageIcon, Library, ArrowLeft, TerminalSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ASCII_ARCHIVE, type AsciiCategory, type AsciiArt } from "@/lib/ascii/data";

const ASCII_CHARS = ["@", "%", "#", "*", "+", "=", "-", ":", ".", " "];

export function AsciiGenerator() {
  const [activeTab, setActiveTab] = useState<"generator" | "archive">("generator");
  const [activeCategory, setActiveCategory] = useState<AsciiCategory | null>(null);
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [asciiArt, setAsciiArt] = useState<string>("");
  const [resolution, setResolution] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateAscii = (img: HTMLImageElement, res: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = res;
    const aspectRatio = img.height / img.width;
    const height = Math.floor(width * aspectRatio * 0.55);

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    // Create inline web worker
    const workerCode = `
      self.onmessage = function(e) {
        const { imageData, width, height, chars } = e.data;
        const data = imageData.data;
        let ascii = "";
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const offset = (y * width + x) * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            const charIndex = Math.floor((luminance / 255) * (chars.length - 1));
            ascii += chars[charIndex];
          }
          ascii += "\\n";
        }
        self.postMessage(ascii);
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      setAsciiArt(e.data);
      setIsProcessing(false);
      worker.terminate();
    };

    worker.postMessage({
      imageData,
      width,
      height,
      chars: ASCII_CHARS
    });
  };

  useEffect(() => {
    if (!imageSrc) return;
    setIsProcessing(true);
    const img = new Image();
    img.onload = () => generateAscii(img, resolution);
    img.src = imageSrc;
  }, [imageSrc, resolution]);

  const handleCopy = async () => {
    if (!asciiArt) return;
    try {
      await navigator.clipboard.writeText(asciiArt);
      toast({ title: "Copied!", description: "ASCII art copied to clipboard." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to copy.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!asciiArt) return;
    const blob = new Blob([asciiArt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "omni-ascii.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Tabs */}
      <div className="flex w-full items-center gap-2 border-b border-outline-variant/60 bg-surface-container-low px-4 py-3 sm:px-8">
        <button
          onClick={() => setActiveTab("generator")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 font-headline text-sm font-semibold tracking-wide transition-colors",
            activeTab === "generator" ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container"
          )}
        >
          <ImageIcon className="size-4" /> GENERATOR
        </button>
        <button
          onClick={() => {
            setActiveTab("archive");
            setActiveCategory(null);
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 font-headline text-sm font-semibold tracking-wide transition-colors",
            activeTab === "archive" ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container"
          )}
        >
          <Library className="size-4" /> ARCHIVE
        </button>
      </div>

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {activeTab === "generator" && (
          <div className="flex h-full flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-xl border border-outline-variant/60 bg-surface-container-low p-6 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-on-surface">
                <ImageIcon className="size-5 text-primary" /> Image to ASCII
              </h2>
              <p className="font-body text-sm text-on-surface-variant">
                Convert any image into pure text art. Runs entirely on-device using Canvas APIs.
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
                
                <div className="flex flex-1 flex-col gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 sm:max-w-[200px]">
                  <label className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                    <span>Resolution</span>
                    <span className="font-bold text-primary">{resolution}</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={resolution}
                    onChange={(e) => setResolution(Number(e.target.value))}
                    disabled={!imageSrc || isProcessing}
                    className="accent-primary"
                  />
                </div>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {asciiArt && (
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-headline text-sm font-semibold tracking-wide text-on-surface">OUTPUT PREVIEW</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest text-on-surface transition-colors hover:bg-surface-container-high"
                    >
                      <Copy className="size-3.5" /> COPY
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest text-on-surface transition-colors hover:bg-surface-container-high"
                    >
                      <Download className="size-3.5" /> SAVE
                    </button>
                  </div>
                </div>

                <div className="relative flex-1 overflow-auto rounded-xl border border-outline-variant/60 bg-black p-4 shadow-inner">
                  <pre className={cn(
                    "font-mono text-[8px] leading-[8px] text-white/90",
                    isProcessing && "opacity-50"
                  )}>
                    {asciiArt}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "archive" && (
          <div className="flex h-full flex-col gap-6">
            {!activeCategory ? (
              <>
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-on-surface">
                  <Library className="size-5 text-primary" /> ASCII Art Gallery
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {ASCII_ARCHIVE.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat)}
                      className="group flex flex-col items-center justify-between rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 transition-colors hover:border-primary/50 hover:bg-surface-container-high"
                    >
                      <div className="flex h-24 w-full items-center justify-center overflow-hidden">
                        <pre className="font-mono text-[8px] leading-[8px] text-on-surface-variant transition-colors group-hover:text-primary">
                          {cat.thumbnail}
                        </pre>
                      </div>
                      <span className="mt-4 font-headline text-xs font-semibold tracking-wide text-on-surface">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 border-b border-outline-variant/40 pb-4">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="flex items-center gap-2 rounded-lg bg-surface-container p-2 text-on-surface hover:bg-surface-container-high"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <h2 className="font-display text-lg font-bold text-on-surface">
                    {activeCategory.name}
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {activeCategory.items.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-headline text-sm font-semibold text-on-surface flex items-center gap-2">
                          <TerminalSquare className="size-4 text-primary" />
                          {item.name}
                        </h4>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.art);
                            toast({ title: "Copied!", description: "ASCII art copied to clipboard." });
                          }}
                          className="rounded-lg bg-surface-container p-1.5 text-on-surface hover:bg-surface-container-high"
                          title="Copy to clipboard"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-1 items-center justify-center overflow-auto rounded-lg bg-black p-4">
                        <pre className="font-mono text-[10px] leading-[10px] text-white/90">
                          {item.art}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
