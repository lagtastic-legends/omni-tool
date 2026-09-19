/**
 * OMNI TOOL — Client-Side Video Processing Engine
 * WebCodecs VideoEncoder Pipeline (Phase 4)
 *
 * Implements hardware-accelerated encoding of WebGL-rendered VideoFrames
 * into EncodedVideoChunk streams with automated profile negotiation.
 */

export interface EncoderCallbacks {
  onChunk: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => void;
  onError?: (error: DOMException | Error) => void;
}

export class WebCodecsVideoEncoder {
  private encoder: VideoEncoder | null = null;
  private isConfigured = false;
  private frameCount = 0;
  private maxQueueSize = 16;
  private extradata: Uint8Array | null = null;
  private callbacks: EncoderCallbacks | null = null;

  /**
   * Check whether the device/GPU supports the given encoder configuration
   */
  public static async isSupported(config: VideoEncoderConfig): Promise<boolean> {
    if (typeof VideoEncoder === "undefined") {
      return false;
    }
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      return Boolean(support.supported);
    } catch {
      return false;
    }
  }

  /**
   * Negotiate best supported codec configuration with automatic fallbacks
   */
  public static async getSupportedConfig(
    preferredCodec = "avc1.42E01E",
    width = 1920,
    height = 1080,
    bitrate = 5_000_000,
    framerate = 30
  ): Promise<VideoEncoderConfig> {
    const candidateCodecs = [
      preferredCodec,
      "avc1.42E01E", // H.264 Baseline Profile Level 3.0
      "avc1.4D401F", // H.264 Main Profile Level 3.1
      "avc1.640028", // H.264 High Profile Level 4.0
      "vp09.00.10.08", // VP9 Profile 0
      "vp8",
    ];

    // Deduplicate candidates
    const uniqueCandidates = Array.from(new Set(candidateCodecs));

    for (const codec of uniqueCandidates) {
      const config: VideoEncoderConfig = {
        codec,
        width,
        height,
        bitrate,
        framerate,
        hardwareAcceleration: "prefer-hardware",
        avc: codec.startsWith("avc1") ? { format: "avc" } : undefined,
      };

      if (await WebCodecsVideoEncoder.isSupported(config)) {
        return config;
      }

      // Try with no-preference hardware acceleration
      config.hardwareAcceleration = "no-preference";
      if (await WebCodecsVideoEncoder.isSupported(config)) {
        return config;
      }
    }

    // Default fallback
    return {
      codec: "avc1.42E01E",
      width,
      height,
      bitrate,
      framerate,
      hardwareAcceleration: "no-preference",
    };
  }

  /**
   * Initialize and configure the WebCodecs VideoEncoder
   */
  public async initialize(
    config: VideoEncoderConfig,
    callbacks: EncoderCallbacks
  ): Promise<void> {
    if (typeof VideoEncoder === "undefined") {
      throw new Error("WebCodecs VideoEncoder is not supported in this environment");
    }

    this.callbacks = callbacks;
    this.frameCount = 0;
    this.extradata = null;

    this.encoder = new VideoEncoder({
      output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => {
        // Cache SPS/PPS extradata description emitted with first keyframe
        if (metadata?.decoderConfig?.description) {
          const desc = metadata.decoderConfig.description as any;
          if (desc instanceof Uint8Array) {
            this.extradata = desc;
          } else if (desc instanceof ArrayBuffer || (typeof SharedArrayBuffer !== "undefined" && desc instanceof SharedArrayBuffer)) {
            this.extradata = new Uint8Array(desc);
          } else if (ArrayBuffer.isView(desc)) {
            this.extradata = new Uint8Array(desc.buffer, desc.byteOffset, desc.byteLength);
          }
        }

        if (this.callbacks?.onChunk) {
          this.callbacks.onChunk(chunk, metadata);
        }
      },
      error: (e: DOMException) => {
        if (this.callbacks?.onError) {
          this.callbacks.onError(e);
        }
      },
    });

    this.encoder.configure(config);
    this.isConfigured = true;
  }

  /**
   * Feed a processed VideoFrame into the hardware encoder
   * Manages backpressure and closes frame upon ingestion
   */
  public async encodeFrame(frame: VideoFrame, isKeyFrame = false): Promise<void> {
    if (!this.encoder || !this.isConfigured) {
      frame.close();
      throw new Error("VideoEncoder is not configured");
    }

    // Backpressure: If encoder queue is busy, yield to allow worker event loop to drain
    if (this.encoder.encodeQueueSize > this.maxQueueSize) {
      await new Promise<void>((resolve) => {
        const checkQueue = () => {
          if (!this.encoder || this.encoder.encodeQueueSize <= this.maxQueueSize / 2) {
            resolve();
          } else {
            setTimeout(checkQueue, 4);
          }
        };
        setTimeout(checkQueue, 4);
      });
    }

    try {
      this.encoder.encode(frame, { keyFrame: isKeyFrame });
      this.frameCount++;
    } finally {
      frame.close();
    }
  }

  /**
   * Flush pending encoded chunks from the encoder pipeline
   */
  public async flush(): Promise<void> {
    if (this.encoder && this.encoder.state === "configured") {
      await this.encoder.flush();
    }
  }

  /**
   * Reset encoder
   */
  public reset(): void {
    if (this.encoder && this.encoder.state !== "closed") {
      this.encoder.reset();
      this.isConfigured = false;
      this.frameCount = 0;
    }
  }

  /**
   * Release encoder resources
   */
  public close(): void {
    if (this.encoder && this.encoder.state !== "closed") {
      try {
        this.encoder.close();
      } catch {}
    }
    this.encoder = null;
    this.isConfigured = false;
    this.callbacks = null;
  }

  public getExtradata(): Uint8Array | null {
    return this.extradata;
  }

  public get encodedFrames(): number {
    return this.frameCount;
  }
}
