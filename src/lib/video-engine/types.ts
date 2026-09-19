/**
 * OMNI TOOL — Client-Side Video Processing Engine
 * Core TypeScript Type Definitions & Messaging Contracts
 *
 * Designed for 100% offline WebCodecs + WebGL 2.0 pipeline
 * with Capacitor Android WebView & Desktop Browser compatibility.
 */

export type EngineMemoryMode = "shared-array-buffer" | "transferable-array-buffer";

export type EngineState =
  | "uninitialized"
  | "idle"
  | "loading"
  | "ready"
  | "processing"
  | "exporting"
  | "error";

export type EnginePhase =
  | "idle"
  | "demuxing"
  | "decoding"
  | "rendering"
  | "encoding"
  | "muxing"
  | "complete";

/**
 * Capability matrix detected by the engine worker
 */
export interface EngineCapabilities {
  webCodecsDecoder: boolean;
  webCodecsEncoder: boolean;
  webGL2: boolean;
  offscreenCanvas: boolean;
  sharedArrayBuffer: boolean;
  crossOriginIsolated: boolean;
  hardwareAcceleration: "prefer-hardware" | "prefer-software" | "no-preference";
}

/**
 * Configuration supplied when initializing the worker engine
 */
export interface EngineInitConfig {
  preferredMemoryMode?: "auto" | "shared" | "transferable";
  offscreenWidth?: number;
  offscreenHeight?: number;
  hardwareAcceleration?: "prefer-hardware" | "prefer-software" | "no-preference";
  ringBufferSize?: number; // Size in bytes for SharedArrayBuffer ring buffer (default: 64MB)
}

/**
 * Payload describing incoming video file data
 */
export type VideoDataPayload =
  | {
      mode: "shared-array-buffer";
      sharedBuffer: SharedArrayBuffer;
      fileSize: number;
      fileName: string;
      mimeType: string;
    }
  | {
      mode: "transferable-array-buffer";
      buffer: ArrayBuffer;
      fileSize: number;
      fileName: string;
      mimeType: string;
      chunkIndex?: number;
      totalChunks?: number;
    }
  | {
      mode: "file-stream-chunk";
      chunk: ArrayBuffer;
      offset: number;
      totalSize: number;
      isLast: boolean;
      fileName: string;
    };

/**
 * Extracted metadata from demuxed container
 */
export interface VideoFileMetadata {
  name: string;
  size: number;
  duration: number; // in seconds
  width: number;
  height: number;
  codec: string;
  fps: number;
  estimatedFrames: number;
  hasAudio: boolean;
  bitrate?: number;
}

/**
 * Color grading and video processing shader effect parameters
 */
export interface VideoEffectConfig {
  brightness: number; // -1.0 to 1.0 (default: 0.0)
  contrast: number;   // 0.0 to 3.0 (default: 1.0)
  saturation: number; // 0.0 to 3.0 (default: 1.0)
  grayscale: number;  // 0.0 to 1.0 (default: 0.0)
  sepia: number;      // 0.0 to 1.0 (default: 0.0)
  invert: number;     // 0.0 to 1.0 (default: 0.0)
  hueRotate: number;  // 0 to 360 degrees (default: 0)
  blur: number;       // blur radius in pixels (default: 0)
  customUniforms?: Record<string, number | number[]>;
}

/**
 * Export encoding and muxing parameters
 */
export interface VideoExportOptions {
  codec: "avc1.42E01E" | "avc1.4D401F" | "avc1.640028" | "vp09.00.10.08" | "av01.0.04M.08" | string;
  container: "mp4" | "webm";
  width?: number;
  height?: number;
  bitrate?: number; // target bits per second
  framerate?: number;
  keyFrameInterval?: number; // every N frames
  crf?: number; // constant rate factor (if supported)
}

/**
 * Export output delivered to main thread
 */
export interface ExportOutputPayload {
  buffer: ArrayBuffer;
  blobType: string;
  duration: number;
  width: number;
  height: number;
  size: number;
}

/* =========================================================================
 * WORKER INBOUND COMMANDS (Main -> Worker)
 * ========================================================================= */

export interface InitCommand {
  type: "init";
  config?: EngineInitConfig;
}

export interface LoadFileCommand {
  type: "load_file";
  payload: VideoDataPayload;
}

export interface ApplyEffectCommand {
  type: "apply_effect";
  effect: VideoEffectConfig;
}

export interface ExportCommand {
  type: "export";
  options?: VideoExportOptions;
}

export interface DecodeCommand {
  type: "decode";
  maxFrames?: number;
}

export interface CapturePreviewCommand {
  type: "capture_preview";
  timestamp?: number;
}

export type EngineCommand =
  | InitCommand
  | LoadFileCommand
  | ApplyEffectCommand
  | ExportCommand
  | DecodeCommand
  | CapturePreviewCommand;

/* =========================================================================
 * WORKER OUTBOUND RESPONSES (Worker -> Main)
 * ========================================================================= */

export interface ReadyResponse {
  type: "ready";
  memoryMode: EngineMemoryMode;
  capabilities: EngineCapabilities;
}

export interface FileLoadedResponse {
  type: "file_loaded";
  metadata: VideoFileMetadata;
}

export interface EffectAppliedResponse {
  type: "effect_applied";
  effect: VideoEffectConfig;
}

export interface FrameDecodedResponse {
  type: "frame_decoded";
  frameIndex: number;
  timestamp: number;
  width: number;
  height: number;
}

export interface FrameRenderedResponse {
  type: "frame_rendered";
  frameIndex: number;
  timestamp: number;
  width: number;
  height: number;
}

export interface PreviewCapturedResponse {
  type: "preview_captured";
  bitmap?: ImageBitmap;
  timestamp: number;
}

export interface DecodeCompleteResponse {
  type: "decode_complete";
  totalFrames: number;
  duration: number;
}

export interface ProgressResponse {
  type: "progress";
  phase: EnginePhase;
  percent: number;
  currentFrame: number;
  totalFrames: number;
  fps?: number;
  etaSeconds?: number;
}

export interface ExportCompleteResponse {
  type: "export_complete";
  output: ExportOutputPayload;
}

export interface ErrorResponse {
  type: "error";
  message: string;
  code: string;
  phase?: EnginePhase;
  details?: unknown;
}

export type EngineResponse =
  | ReadyResponse
  | FileLoadedResponse
  | EffectAppliedResponse
  | FrameDecodedResponse
  | FrameRenderedResponse
  | PreviewCapturedResponse
  | DecodeCompleteResponse
  | ProgressResponse
  | ExportCompleteResponse
  | ErrorResponse;

/* =========================================================================
 * SHARED MEMORY RING BUFFER LAYOUT (Phase 1)
 * ========================================================================= */

/**
 * SharedArrayBuffer Control Block Layout (32-bit Integers at buffer start)
 * Offsets in 4-byte words (Int32Array):
 * [0]: MAGIC NUMBER (0x56494445 = 'VIDE')
 * [1]: ENGINE_STATUS (0: Idle, 1: Active, 2: Buffer Full, 3: Error)
 * [2]: WRITE_HEAD (Byte offset in data arena where producer writes)
 * [3]: READ_HEAD (Byte offset in data arena where consumer reads)
 * [4]: ARENA_CAPACITY (Total byte capacity of data arena)
 * [5]: COMMITTED_CHUNKS (Number of completed chunks ready for reading)
 * [6]: DROPPED_CHUNKS (Overflow counter)
 * [7]: ATOMIC_MUTEX (0: Unlocked, 1: Locked)
 */
export const SHARED_RING_BUFFER_HEADER_INTS = 8;
export const SHARED_RING_BUFFER_HEADER_BYTES = SHARED_RING_BUFFER_HEADER_INTS * 4;
export const SHARED_RING_MAGIC = 0x56494445;

export interface ChunkDescriptor {
  offset: number;
  size: number;
  timestamp: number; // microsecond timestamp (WebCodecs format)
  duration: number;
  isKeyFrame: boolean;
}
