/**
 * OMNI TOOL — Client-Side Video Processing Engine
 * Main Thread Client Bridge (Phase 5)
 *
 * Provides a type-safe, promise-based interface to the dedicated Web Worker:
 * - Spawns and manages worker lifecycle
 * - Ingests local .mp4 files with zero memory duplication (SharedArrayBuffer or Transferable ArrayBuffer)
 * - Real-time GPU shader effect controls and zero-copy preview capture
 * - Full export pipeline coordination with progress telemetry
 * - Blob URL generation and Capacitor-compatible native downloads
 */

import {
  DecodeCompleteResponse,
  EngineCapabilities,
  EngineCommand,
  EngineMemoryMode,
  EngineResponse,
  ExportOutputPayload,
  ProgressResponse,
  VideoEffectConfig,
  VideoExportOptions,
  VideoFileMetadata,
} from "./types";

/**
 * Universal save helper supporting both Capacitor Native Filesystem and browser download
 */
async function saveBlob(blob: Blob, filename: string): Promise<void> {
  if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
      });
      return;
    } catch (err) {
      console.warn("Native filesystem save fallback:", err);
    }
  }

  // Browser download fallback
  if (typeof document !== "undefined") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }
}

export interface VideoEngineClientOptions {
  workerFactory?: () => Worker;
  workerUrl?: string | URL;
  preferredMemoryMode?: "auto" | "shared" | "transferable";
  hardwareAcceleration?: "prefer-hardware" | "prefer-software" | "no-preference";
  onProgress?: (progress: ProgressResponse) => void;
  onError?: (error: Error) => void;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  duration: number;
  width: number;
  height: number;
  size: number;
  buffer: ArrayBuffer;
}

export class VideoEngineClient {
  private worker: Worker | null = null;
  private options: VideoEngineClientOptions;
  private isInitialized = false;
  private capabilities: EngineCapabilities | null = null;
  private memoryMode: EngineMemoryMode = "transferable-array-buffer";
  private activeMetadata: VideoFileMetadata | null = null;

  // Promise resolution handlers for worker request-response flow
  private pendingInit: { resolve: (caps: EngineCapabilities) => void; reject: (err: Error) => void } | null = null;
  private pendingLoad: { resolve: (meta: VideoFileMetadata) => void; reject: (err: Error) => void } | null = null;
  private pendingEffect: { resolve: (effect: VideoEffectConfig) => void; reject: (err: Error) => void } | null = null;
  private pendingPreview: { resolve: (bitmap: ImageBitmap) => void; reject: (err: Error) => void } | null = null;
  private pendingDecode: { resolve: (res: DecodeCompleteResponse) => void; reject: (err: Error) => void } | null = null;
  private pendingExport: { resolve: (output: ExportOutputPayload) => void; reject: (err: Error) => void } | null = null;

  // Active progress listener callback for export / decode
  private activeProgressListener: ((progress: ProgressResponse) => void) | null = null;

  // Tracked object URLs to revoke upon disposal
  private createdBlobUrls: Set<string> = new Set();

  constructor(options: VideoEngineClientOptions = {}) {
    this.options = options;
  }

  /**
   * Spawn worker thread and perform initial capability negotiation
   */
  public async initialize(): Promise<EngineCapabilities> {
    if (this.isInitialized && this.capabilities) {
      return this.capabilities;
    }

    // Spawn dedicated worker
    if (!this.worker) {
      if (this.options.workerFactory) {
        this.worker = this.options.workerFactory();
      } else {
        const workerUrl = this.options.workerUrl || new URL("./video-engine.worker.ts", import.meta.url);
        this.worker = new Worker(workerUrl, { type: "module" });
      }
      this.attachWorkerListeners();
    }

    return new Promise<EngineCapabilities>((resolve, reject) => {
      this.pendingInit = { resolve, reject };

      const initCmd: EngineCommand = {
        type: "init",
        config: {
          preferredMemoryMode: this.options.preferredMemoryMode ?? "auto",
          hardwareAcceleration: this.options.hardwareAcceleration ?? "prefer-hardware",
        },
      };

      this.postToWorker(initCmd);
    });
  }

  /**
   * Ingest a local video file with zero memory duplication
   * (Uses SharedArrayBuffer or Transferable ArrayBuffer depending on environment)
   */
  public async loadFile(file: File): Promise<VideoFileMetadata> {
    await this.ensureInitialized();

    const isCrossOriginIsolated = typeof window !== "undefined" && Boolean(window.crossOriginIsolated);
    const hasSAB = typeof SharedArrayBuffer !== "undefined" && isCrossOriginIsolated;

    return new Promise<VideoFileMetadata>(async (resolve, reject) => {
      this.pendingLoad = { resolve, reject };

      try {
        if (this.memoryMode === "shared-array-buffer" && hasSAB) {
          // Zero-copy SharedArrayBuffer ingestion
          const arrayBuf = await file.arrayBuffer();
          const sharedBuf = new SharedArrayBuffer(arrayBuf.byteLength);
          new Uint8Array(sharedBuf).set(new Uint8Array(arrayBuf));

          const cmd: EngineCommand = {
            type: "load_file",
            payload: {
              mode: "shared-array-buffer",
              sharedBuffer: sharedBuf,
              fileSize: file.size,
              fileName: file.name,
              mimeType: file.type || "video/mp4",
            },
          };
          this.postToWorker(cmd);
        } else {
          // Transferable ArrayBuffer ownership transfer (Capacitor / non-isolated fallback)
          const arrayBuf = await file.arrayBuffer();
          const cmd: EngineCommand = {
            type: "load_file",
            payload: {
              mode: "transferable-array-buffer",
              buffer: arrayBuf,
              fileSize: file.size,
              fileName: file.name,
              mimeType: file.type || "video/mp4",
            },
          };
          // Transfer arrayBuf ownership zero-copy
          this.postToWorker(cmd, [arrayBuf]);
        }
      } catch (err) {
        this.pendingLoad = null;
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  /**
   * Update real-time GLSL shader uniform values (brightness, contrast, saturation, etc.)
   */
  public async applyEffect(effect: Partial<VideoEffectConfig>): Promise<VideoEffectConfig> {
    await this.ensureInitialized();

    return new Promise<VideoEffectConfig>((resolve, reject) => {
      this.pendingEffect = { resolve, reject };
      const cmd: EngineCommand = {
        type: "apply_effect",
        effect: {
          brightness: 0.0,
          contrast: 1.0,
          saturation: 1.0,
          grayscale: 0.0,
          sepia: 0.0,
          invert: 0.0,
          hueRotate: 0.0,
          blur: 0.0,
          ...effect,
        },
      };
      this.postToWorker(cmd);
    });
  }

  /**
   * Request a rendered frame preview from the worker's WebGL OffscreenCanvas
   */
  public async capturePreview(timestamp?: number): Promise<ImageBitmap> {
    await this.ensureInitialized();

    return new Promise<ImageBitmap>((resolve, reject) => {
      this.pendingPreview = { resolve, reject };
      const cmd: EngineCommand = {
        type: "capture_preview",
        timestamp,
      };
      this.postToWorker(cmd);
    });
  }

  /**
   * Execute demuxing and decoding pass with real-time frame telemetry
   */
  public async decode(
    maxFrames?: number,
    onProgress?: (progress: ProgressResponse) => void
  ): Promise<DecodeCompleteResponse> {
    await this.ensureInitialized();

    return new Promise<DecodeCompleteResponse>((resolve, reject) => {
      this.pendingDecode = { resolve, reject };
      this.activeProgressListener = onProgress || null;

      const cmd: EngineCommand = {
        type: "decode",
        maxFrames,
      };
      this.postToWorker(cmd);
    });
  }

  /**
   * Execute the full Demux -> Decode -> Render -> Encode -> Mux export pipeline
   * Generates a web-optimized MP4 Blob and Blob URL
   */
  public async export(
    options?: VideoExportOptions,
    onProgress?: (progress: ProgressResponse) => void
  ): Promise<ExportResult> {
    await this.ensureInitialized();

    return new Promise<ExportResult>((resolve, reject) => {
      this.activeProgressListener = onProgress || null;

      this.pendingExport = {
        resolve: (output: ExportOutputPayload) => {
          this.activeProgressListener = null;
          const blob = new Blob([output.buffer], { type: output.blobType });
          const url = URL.createObjectURL(blob);
          this.createdBlobUrls.add(url);

          resolve({
            blob,
            url,
            duration: output.duration,
            width: output.width,
            height: output.height,
            size: output.size,
            buffer: output.buffer,
          });
        },
        reject: (err: Error) => {
          this.activeProgressListener = null;
          reject(err);
        },
      };

      const cmd: EngineCommand = {
        type: "export",
        options,
      };
      this.postToWorker(cmd);
    });
  }

  /**
   * Download or save the exported video file
   * Automatically bridges to Capacitor Native Filesystem on Android / iOS
   */
  public async download(resultOrUrl: ExportResult | string, filename = "processed-video.mp4"): Promise<void> {
    if (typeof resultOrUrl === "string") {
      const resp = await fetch(resultOrUrl);
      const blob = await resp.blob();
      await saveBlob(blob, filename);
    } else {
      await saveBlob(resultOrUrl.blob, filename);
    }
  }

  /**
   * Listen to worker inbound responses and dispatch callbacks
   */
  private attachWorkerListeners(): void {
    if (!this.worker) return;

    this.worker.onmessage = (e: MessageEvent<EngineResponse>) => {
      const response = e.data;
      if (!response || !response.type) return;

      switch (response.type) {
        case "ready":
          this.isInitialized = true;
          this.capabilities = response.capabilities;
          this.memoryMode = response.memoryMode;
          if (this.pendingInit) {
            this.pendingInit.resolve(response.capabilities);
            this.pendingInit = null;
          }
          break;

        case "file_loaded":
          this.activeMetadata = response.metadata;
          if (this.pendingLoad) {
            this.pendingLoad.resolve(response.metadata);
            this.pendingLoad = null;
          }
          break;

        case "effect_applied":
          if (this.pendingEffect) {
            this.pendingEffect.resolve(response.effect);
            this.pendingEffect = null;
          }
          break;

        case "preview_captured":
          if (this.pendingPreview && response.bitmap) {
            this.pendingPreview.resolve(response.bitmap);
            this.pendingPreview = null;
          }
          break;

        case "decode_complete":
          if (this.pendingDecode) {
            this.pendingDecode.resolve(response);
            this.pendingDecode = null;
          }
          break;

        case "export_complete":
          if (this.pendingExport) {
            this.pendingExport.resolve(response.output);
            this.pendingExport = null;
          }
          break;

        case "progress":
          if (this.activeProgressListener) {
            this.activeProgressListener(response);
          }
          if (this.options.onProgress) {
            this.options.onProgress(response);
          }
          break;

        case "error":
          const errorObj = new Error(`Worker Error [${response.code}]: ${response.message}`);
          this.handleWorkerError(errorObj);
          break;
      }
    };

    this.worker.onerror = (e: ErrorEvent) => {
      const err = new Error(`Worker Uncaught Error: ${e.message}`);
      this.handleWorkerError(err);
    };
  }

  private handleWorkerError(err: Error): void {
    if (this.pendingInit) {
      this.pendingInit.reject(err);
      this.pendingInit = null;
    }
    if (this.pendingLoad) {
      this.pendingLoad.reject(err);
      this.pendingLoad = null;
    }
    if (this.pendingEffect) {
      this.pendingEffect.reject(err);
      this.pendingEffect = null;
    }
    if (this.pendingPreview) {
      this.pendingPreview.reject(err);
      this.pendingPreview = null;
    }
    if (this.pendingDecode) {
      this.pendingDecode.reject(err);
      this.pendingDecode = null;
    }
    if (this.pendingExport) {
      this.pendingExport.reject(err);
      this.pendingExport = null;
    }

    if (this.options.onError) {
      this.options.onError(err);
    }
  }

  private postToWorker(cmd: EngineCommand, transfer?: Transferable[]): void {
    if (!this.worker) {
      throw new Error("Worker is not running");
    }
    if (transfer && transfer.length > 0) {
      this.worker.postMessage(cmd, transfer);
    } else {
      this.worker.postMessage(cmd);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  public getCapabilities(): EngineCapabilities | null {
    return this.capabilities;
  }

  public getMemoryMode(): EngineMemoryMode {
    return this.memoryMode;
  }

  public getMetadata(): VideoFileMetadata | null {
    return this.activeMetadata;
  }

  /**
   * Clean up all memory, object URLs, and terminate worker thread
   */
  public dispose(): void {
    this.createdBlobUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    this.createdBlobUrls.clear();

    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }

    this.isInitialized = false;
    this.capabilities = null;
    this.activeMetadata = null;
  }
}
