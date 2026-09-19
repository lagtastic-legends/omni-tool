/**
 * OMNI TOOL — Client-Side Video Processing Engine
 * Dedicated Web Worker: Demuxing, Decoding, WebGL 2.0 Shaders & WebCodecs Muxing (Phase 1-4)
 *
 * Architecture:
 * - 100% Offline, Zero Server Processing
 * - ISO-BMFF Demuxing to extract EncodedVideoChunk streams
 * - Hardware-accelerated WebCodecs VideoDecoder pipeline
 * - OffscreenCanvas + WebGL 2.0 GLSL shader rendering in worker thread
 * - Real-time color grading (brightness, contrast, saturation, grayscale, sepia, invert, hue)
 * - Hardware-accelerated WebCodecs VideoEncoder pipeline (H.264/HEVC/VP9)
 * - Fast-Start ISO-BMFF MP4 Muxer (zero-copy ArrayBuffer transfer to main thread)
 * - Dual-mode memory pipeline: SharedArrayBuffer zero-copy ring buffer with
 *   automatic Transferable ArrayBuffer fallback for Capacitor Android WebView
 */

import {
  ApplyEffectCommand,
  CapturePreviewCommand,
  DecodeCommand,
  EngineCapabilities,
  EngineCommand,
  EngineMemoryMode,
  EnginePhase,
  EngineResponse,
  EngineState,
  ExportCommand,
  ExportOutputPayload,
  InitCommand,
  LoadFileCommand,
  VideoDataPayload,
  VideoEffectConfig,
  VideoExportOptions,
  VideoFileMetadata,
} from "./types";
import {
  detectMemoryCapabilities,
  SharedRingBuffer,
  TransferableChunkQueue,
} from "./memory";
import { WasmMP4Demuxer } from "./demuxer";
import { WebCodecsVideoDecoder } from "./decoder";
import { WebGLVideoRenderer } from "./renderer";
import { WebCodecsVideoEncoder } from "./encoder";
import { WasmMP4Muxer } from "./muxer";

// Worker global scope interface compatible with DOM lib
interface DedicatedWorkerScope {
  onmessage: ((this: DedicatedWorkerScope, ev: MessageEvent<EngineCommand>) => any) | null;
  postMessage(message: any, transfer?: Transferable[]): void;
  crossOriginIsolated?: boolean;
}

declare const self: DedicatedWorkerScope;

function toUint8Array(source?: any): Uint8Array | undefined {
  if (!source) return undefined;
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer || (typeof SharedArrayBuffer !== "undefined" && source instanceof SharedArrayBuffer)) {
    return new Uint8Array(source);
  }
  if (ArrayBuffer.isView(source)) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  }
  return undefined;
}

class VideoEngineWorker {
  private state: EngineState = "uninitialized";
  private memoryMode: EngineMemoryMode = "transferable-array-buffer";
  private sharedRingBuffer: SharedRingBuffer | null = null;
  private transferableQueue: TransferableChunkQueue = new TransferableChunkQueue();

  // Phase 2 Demuxer & Decoder Subsystems
  private demuxer: WasmMP4Demuxer = new WasmMP4Demuxer();
  private decoder: WebCodecsVideoDecoder = new WebCodecsVideoDecoder();
  private decodedFramesQueue: VideoFrame[] = [];

  // Phase 3 WebGL OffscreenCanvas Shader Pipeline
  private renderer: WebGLVideoRenderer | null = null;
  private processedFramesQueue: VideoFrame[] = [];

  // Phase 4 WebCodecs Encoder & Container Muxer
  private encoder: WebCodecsVideoEncoder = new WebCodecsVideoEncoder();
  private muxer: WasmMP4Muxer | null = null;

  private activeFileMetadata: VideoFileMetadata | null = null;
  private rawFileBuffer: ArrayBuffer | null = null;
  private currentEffect: VideoEffectConfig = {
    brightness: 0.0,
    contrast: 1.0,
    saturation: 1.0,
    grayscale: 0.0,
    sepia: 0.0,
    invert: 0.0,
    hueRotate: 0.0,
    blur: 0.0,
  };

  constructor() {
    this.setupMessageListener();
  }

  /**
   * Main incoming message router
   */
  private setupMessageListener(): void {
    self.onmessage = async (e: MessageEvent<EngineCommand>) => {
      const command = e.data;
      if (!command || !command.type) {
        this.sendError("Invalid or empty command received", "INVALID_COMMAND");
        return;
      }

      try {
        switch (command.type) {
          case "init":
            await this.handleInit(command);
            break;
          case "load_file":
            await this.handleLoadFile(command);
            break;
          case "decode":
            await this.handleDecode(command);
            break;
          case "apply_effect":
            await this.handleApplyEffect(command);
            break;
          case "capture_preview":
            await this.handleCapturePreview(command);
            break;
          case "export":
            await this.handleExport(command);
            break;
          default:
            this.sendError(
              `Unknown command type: ${(command as { type: string }).type}`,
              "UNKNOWN_COMMAND"
            );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.state = "error";
        this.sendError(message, "EXECUTION_EXCEPTION", err);
      }
    };
  }

  /**
   * PHASE 1 & 3: Handle 'init' command
   * Inspects capabilities and initializes memory pipeline + WebGL 2.0 OffscreenCanvas
   */
  private async handleInit(cmd: InitCommand): Promise<void> {
    const memoryCaps = detectMemoryCapabilities();

    // Check WebCodecs and WebGL2 availability
    const webCodecsDecoder = typeof VideoDecoder !== "undefined";
    const webCodecsEncoder = typeof VideoEncoder !== "undefined";
    const offscreenCanvas = typeof OffscreenCanvas !== "undefined";

    // Test and initialize WebGL2 on OffscreenCanvas
    let webGL2 = false;
    if (offscreenCanvas) {
      try {
        const width = cmd.config?.offscreenWidth || 1920;
        const height = cmd.config?.offscreenHeight || 1080;
        this.renderer = new WebGLVideoRenderer(width, height);
        webGL2 = true;
      } catch {
        webGL2 = false;
        this.renderer = null;
      }
    }

    const capabilities: EngineCapabilities = {
      webCodecsDecoder,
      webCodecsEncoder,
      webGL2,
      offscreenCanvas,
      sharedArrayBuffer: memoryCaps.hasSharedArrayBuffer,
      crossOriginIsolated: memoryCaps.isCrossOriginIsolated,
      hardwareAcceleration: cmd.config?.hardwareAcceleration ?? "prefer-hardware",
    };

    // Determine memory mode
    if (cmd.config?.preferredMemoryMode === "transferable") {
      this.memoryMode = "transferable-array-buffer";
    } else if (
      (cmd.config?.preferredMemoryMode === "shared" || !cmd.config?.preferredMemoryMode || cmd.config?.preferredMemoryMode === "auto") &&
      memoryCaps.hasSharedArrayBuffer
    ) {
      this.memoryMode = "shared-array-buffer";
      const ringSize = cmd.config?.ringBufferSize ?? 64 * 1024 * 1024; // 64 MB default arena
      this.sharedRingBuffer = new SharedRingBuffer(ringSize);
    } else {
      // Capacitor fallback: transfer ArrayBuffer ownership zero-copy
      this.memoryMode = "transferable-array-buffer";
    }

    this.state = "idle";

    this.sendResponse({
      type: "ready",
      memoryMode: this.memoryMode,
      capabilities,
    });
  }

  /**
   * PHASE 1 & 2: Handle 'load_file' command
   * Ingests video data and executes WASM container demuxing
   */
  private async handleLoadFile(cmd: LoadFileCommand): Promise<void> {
    if (this.state === "uninitialized") {
      this.sendError("Engine must be initialized before loading files", "NOT_INITIALIZED");
      return;
    }

    this.cleanupFrames();
    this.state = "loading";
    const payload: VideoDataPayload = cmd.payload;
    let fileBuffer: ArrayBufferLike | null = null;

    if (payload.mode === "shared-array-buffer") {
      this.sharedRingBuffer = new SharedRingBuffer(payload.sharedBuffer);
      fileBuffer = payload.sharedBuffer.slice(0, payload.fileSize);
    } else if (payload.mode === "transferable-array-buffer") {
      this.rawFileBuffer = payload.buffer;
      this.transferableQueue.clear();
      this.transferableQueue.enqueue(payload.buffer);
      fileBuffer = payload.buffer;
    } else if (payload.mode === "file-stream-chunk") {
      this.transferableQueue.enqueue(payload.chunk);
      if (payload.isLast) {
        fileBuffer = this.transferableQueue.peek() || null;
      }
    }

    if (!fileBuffer) {
      this.state = "ready";
      return;
    }

    // Phase 2: Run WASM Demuxer on ingested binary
    this.sendProgress("demuxing", 5, 0, 100);
    await this.demuxer.load(fileBuffer);
    this.sendProgress("demuxing", 100, 0, 100);

    const track = this.demuxer.getVideoTrack();
    if (track) {
      const estimatedFps = track.duration > 0 && track.sampleCount > 0
        ? Math.round(track.sampleCount / track.duration)
        : 30;

      this.activeFileMetadata = {
        name: "fileName" in payload ? payload.fileName : "video.mp4",
        size: "fileSize" in payload ? payload.fileSize : fileBuffer.byteLength,
        duration: track.duration,
        width: track.codedWidth,
        height: track.codedHeight,
        codec: track.codec,
        fps: estimatedFps > 0 ? estimatedFps : 30,
        estimatedFrames: track.sampleCount || Math.round(track.duration * (estimatedFps || 30)),
        hasAudio: true,
      };
    } else {
      this.activeFileMetadata = this.probeContainerHeader(
        new Uint8Array(fileBuffer, 0, Math.min(65536, fileBuffer.byteLength)),
        "fileName" in payload ? payload.fileName : "video.mp4",
        fileBuffer.byteLength
      );
    }

    this.state = "ready";

    if (this.activeFileMetadata) {
      this.sendResponse({
        type: "file_loaded",
        metadata: this.activeFileMetadata,
      });
    }
  }

  /**
   * PHASE 2 & 3: Handle 'decode' command
   * Demuxes -> Decodes via WebCodecs -> Renders via WebGL 2.0 Shaders -> Captures Processed Frames
   */
  private async handleDecode(cmd: DecodeCommand): Promise<void> {
    if (this.state !== "ready" && this.state !== "idle") {
      this.sendError(
        `Cannot start decode in state: ${this.state}. A file must be loaded first.`,
        "INVALID_STATE"
      );
      return;
    }

    const decoderConfig = this.demuxer.getDecoderConfig();
    if (!decoderConfig) {
      this.sendError("No valid video track configuration found for decoding", "NO_CODEC_CONFIG");
      return;
    }

    this.state = "processing";
    this.cleanupFrames();

    const totalExpected = cmd.maxFrames || this.activeFileMetadata?.estimatedFrames || this.demuxer.getSampleCount() || 30;
    let decodedCount = 0;
    const startTime = performance.now();

    // Initialize WebCodecs Hardware VideoDecoder
    await this.decoder.initialize(decoderConfig, {
      onFrame: (sourceFrame: VideoFrame, index: number) => {
        decodedCount++;
        const elapsedSec = (performance.now() - startTime) / 1000;
        const currentFps = elapsedSec > 0 ? Math.round(decodedCount / elapsedSec) : 0;
        const percent = Math.min(100, Math.round((decodedCount / totalExpected) * 100));

        let outputFrame: VideoFrame = sourceFrame;

        // PHASE 3: WebGL 2.0 Shader Rendering
        if (this.renderer) {
          try {
            outputFrame = this.renderer.renderFrame(sourceFrame, this.currentEffect);
            this.sendResponse({
              type: "frame_rendered",
              frameIndex: index,
              timestamp: outputFrame.timestamp,
              width: outputFrame.displayWidth,
              height: outputFrame.displayHeight,
            });
          } catch (renderErr) {
            console.error("WebGL render frame error:", renderErr);
            outputFrame = sourceFrame;
          }
        }

        // Progress telemetry
        this.sendProgress(
          this.renderer ? "rendering" : "decoding",
          percent,
          decodedCount,
          totalExpected,
          currentFps
        );

        // Stage processed frame
        if (this.processedFramesQueue.length < 5) {
          this.processedFramesQueue.push(outputFrame);
        } else {
          outputFrame.close();
        }
      },
      onError: (err: DOMException | Error) => {
        this.sendError(`VideoDecoder runtime error: ${err.message}`, "DECODER_ERROR", err);
      },
    });

    // Extract EncodedVideoChunk stream from WASM demuxer and feed into decoder
    let fedChunks = 0;
    await this.demuxer.extractChunks(async (chunk: EncodedVideoChunk) => {
      if (cmd.maxFrames && fedChunks >= cmd.maxFrames) return;
      fedChunks++;
      await this.decoder.decodeChunk(chunk);
    });

    // Flush remaining frames from decoder queue
    await this.decoder.flush();

    this.state = "ready";

    this.sendResponse({
      type: "decode_complete",
      totalFrames: decodedCount,
      duration: this.activeFileMetadata?.duration || 0,
    });
  }

  /**
   * PHASE 3: Handle 'apply_effect' command
   * Updates real-time GLSL shader uniform parameters
   */
  private async handleApplyEffect(cmd: ApplyEffectCommand): Promise<void> {
    this.currentEffect = {
      ...this.currentEffect,
      ...cmd.effect,
    };

    if (this.renderer) {
      this.renderer.setEffects(this.currentEffect);
    }

    this.sendResponse({
      type: "effect_applied",
      effect: this.currentEffect,
    });
  }

  /**
   * PHASE 3: Handle 'capture_preview' command
   * Transfers current OffscreenCanvas WebGL render as an ImageBitmap to main thread
   */
  private async handleCapturePreview(cmd: CapturePreviewCommand): Promise<void> {
    if (!this.renderer) {
      this.sendError("Renderer is not initialized", "RENDERER_NOT_READY");
      return;
    }

    try {
      const bitmap = await this.renderer.captureImageBitmap();
      this.sendResponse(
        {
          type: "preview_captured",
          bitmap,
          timestamp: cmd.timestamp || 0,
        },
        [bitmap] // Zero-copy Transferable ImageBitmap
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.sendError(`Failed to capture preview: ${message}`, "CAPTURE_ERROR", err);
    }
  }

  /**
   * PHASE 4: Handle 'export' command
   * Executes complete hardware-accelerated Demux -> Decode -> WebGL Render -> Encode -> Mux pipeline
   */
  private async handleExport(cmd: ExportCommand): Promise<void> {
    if (this.state !== "ready" && this.state !== "idle") {
      this.sendError(
        `Cannot start export in state: ${this.state}. Engine must be ready with a loaded file.`,
        "INVALID_STATE"
      );
      return;
    }

    if (!this.activeFileMetadata && !this.rawFileBuffer && !this.sharedRingBuffer) {
      this.sendError("No video file loaded for export", "NO_FILE_LOADED");
      return;
    }

    const decoderConfig = this.demuxer.getDecoderConfig();
    if (!decoderConfig) {
      this.sendError("No valid video track configuration found for export", "NO_CODEC_CONFIG");
      return;
    }

    this.state = "exporting";
    this.cleanupFrames();

    const targetWidth = cmd.options?.width || this.activeFileMetadata?.width || 1920;
    const targetHeight = cmd.options?.height || this.activeFileMetadata?.height || 1080;
    const targetFps = cmd.options?.framerate || this.activeFileMetadata?.fps || 30;
    const targetBitrate = cmd.options?.bitrate || 5_000_000;
    const targetCodec = cmd.options?.codec || "avc1.42E01E";
    const keyFrameInterval = cmd.options?.keyFrameInterval || targetFps * 2;

    const totalExpected = this.activeFileMetadata?.estimatedFrames || this.demuxer.getSampleCount() || 30;

    this.sendProgress("demuxing", 100, 0, totalExpected);

    // 1. Initialize Muxer
    this.muxer = new WasmMP4Muxer({
      width: targetWidth,
      height: targetHeight,
      codec: targetCodec,
      timescale: 90000,
      description: toUint8Array(decoderConfig.description),
    });

    // 2. Negotiate and Initialize WebCodecs VideoEncoder
    const encoderConfig = await WebCodecsVideoEncoder.getSupportedConfig(
      targetCodec,
      targetWidth,
      targetHeight,
      targetBitrate,
      targetFps
    );

    await this.encoder.initialize(encoderConfig, {
      onChunk: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => {
        if (metadata?.decoderConfig?.description && this.muxer) {
          const extradata = toUint8Array(metadata.decoderConfig.description);
          if (extradata) {
            this.muxer.setExtradata(extradata);
          }
        }
        this.muxer?.addVideoChunk(chunk);
      },
      onError: (err: DOMException | Error) => {
        this.sendError(`VideoEncoder runtime error: ${err.message}`, "ENCODER_ERROR", err);
      },
    });

    // 3. Initialize Decoder for Export Pass
    let encodedCount = 0;
    const startTime = performance.now();

    await this.decoder.initialize(decoderConfig, {
      onFrame: async (sourceFrame: VideoFrame) => {
        encodedCount++;

        // Phase 3: Apply WebGL Shaders
        let renderedFrame: VideoFrame;
        if (this.renderer) {
          try {
            renderedFrame = this.renderer.renderFrame(sourceFrame, this.currentEffect);
          } catch (renderErr) {
            console.error("WebGL render error during export:", renderErr);
            renderedFrame = sourceFrame;
          }
        } else {
          renderedFrame = sourceFrame;
        }

        // Phase 4: Feed into VideoEncoder
        const isKeyFrame = (encodedCount - 1) % keyFrameInterval === 0;
        await this.encoder.encodeFrame(renderedFrame, isKeyFrame);

        // Telemetry
        const elapsedSec = (performance.now() - startTime) / 1000;
        const currentFps = elapsedSec > 0 ? Math.round(encodedCount / elapsedSec) : 0;
        const percent = Math.min(92, Math.round((encodedCount / totalExpected) * 92));

        this.sendProgress("encoding", percent, encodedCount, totalExpected, currentFps);
      },
      onError: (err: DOMException | Error) => {
        this.sendError(`VideoDecoder runtime error: ${err.message}`, "DECODER_ERROR", err);
      },
    });

    // 4. Stream demuxed chunks through decoder pipeline
    await this.demuxer.extractChunks(async (chunk: EncodedVideoChunk) => {
      await this.decoder.decodeChunk(chunk);
    });

    // 5. Flush Decoder & Encoder
    await this.decoder.flush();
    await this.encoder.flush();

    // 6. Muxing Phase
    this.sendProgress("muxing", 96, encodedCount, totalExpected);

    const mp4ArrayBuffer = this.muxer.finalize();
    const duration = this.activeFileMetadata?.duration || (encodedCount / targetFps);

    this.sendProgress("complete", 100, encodedCount, totalExpected);

    // 7. Deliver export complete response with zero-copy Transferable ArrayBuffer
    const output: ExportOutputPayload = {
      buffer: mp4ArrayBuffer,
      blobType: "video/mp4",
      duration,
      width: targetWidth,
      height: targetHeight,
      size: mp4ArrayBuffer.byteLength,
    };

    this.state = "ready";

    this.sendResponse(
      {
        type: "export_complete",
        output,
      },
      [mp4ArrayBuffer] // Zero-copy ArrayBuffer hand-off
    );
  }

  /**
   * Fast header probe for MP4 / WebM containers (validates container signature)
   */
  private probeContainerHeader(
    headerBytes: Uint8Array,
    fileName: string,
    fileSize: number
  ): VideoFileMetadata {
    let codec = "unknown";
    let isMp4 = false;

    if (headerBytes.byteLength >= 12) {
      const tag = String.fromCharCode(
        headerBytes[4],
        headerBytes[5],
        headerBytes[6],
        headerBytes[7]
      );
      if (tag === "ftyp") {
        isMp4 = true;
        const brand = String.fromCharCode(
          headerBytes[8],
          headerBytes[9],
          headerBytes[10],
          headerBytes[11]
        );
        codec = `mp4 (${brand.trim()})`;
      }
    }

    return {
      name: fileName,
      size: fileSize,
      duration: 0,
      width: 1920,
      height: 1080,
      codec: isMp4 ? "avc1.4D401F" : codec,
      fps: 30,
      estimatedFrames: 0,
      hasAudio: true,
    };
  }

  /**
   * Safely release all queued raw & processed VideoFrame handles
   */
  private cleanupFrames(): void {
    while (this.decodedFramesQueue.length > 0) {
      const frame = this.decodedFramesQueue.shift();
      if (frame) {
        try { frame.close(); } catch {}
      }
    }
    while (this.processedFramesQueue.length > 0) {
      const frame = this.processedFramesQueue.shift();
      if (frame) {
        try { frame.close(); } catch {}
      }
    }
  }

  /**
   * Dispatch response to main thread
   */
  private sendResponse(response: EngineResponse, transferables?: Transferable[]): void {
    if (transferables && transferables.length > 0) {
      self.postMessage(response, transferables);
    } else {
      self.postMessage(response);
    }
  }

  /**
   * Send progress telemetry
   */
  private sendProgress(
    phase: EnginePhase,
    percent: number,
    currentFrame: number,
    totalFrames: number,
    fps?: number
  ): void {
    this.sendResponse({
      type: "progress",
      phase,
      percent,
      currentFrame,
      totalFrames,
      fps,
    });
  }

  /**
   * Send error notification
   */
  private sendError(message: string, code: string, details?: unknown): void {
    this.sendResponse({
      type: "error",
      message,
      code,
      details,
    });
  }
}

// Instantiate worker singleton
new VideoEngineWorker();
