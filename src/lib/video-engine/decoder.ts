/**
 * OMNI TOOL — Client-Side Video Processing Engine
 * WebCodecs VideoDecoder Pipeline (Phase 2)
 *
 * Ingests EncodedVideoChunk instances, utilizes hardware-accelerated
 * decoding, manages memory backpressure, and yields raw VideoFrame objects.
 */

export interface DecoderCallbacks {
  onFrame: (frame: VideoFrame, index: number) => void | Promise<void>;
  onError?: (error: DOMException | Error) => void;
}

export class WebCodecsVideoDecoder {
  private decoder: VideoDecoder | null = null;
  private isConfigured = false;
  private frameCounter = 0;
  private maxQueueSize = 16;
  private callbacks: DecoderCallbacks | null = null;

  /**
   * Test if the user's browser/GPU supports the requested decoder configuration
   */
  public static async isSupported(config: VideoDecoderConfig): Promise<boolean> {
    if (typeof VideoDecoder === "undefined") {
      return false;
    }
    try {
      const support = await VideoDecoder.isConfigSupported(config);
      return Boolean(support.supported);
    } catch {
      return false;
    }
  }

  /**
   * Initialize and configure the WebCodecs VideoDecoder
   */
  public async initialize(
    config: VideoDecoderConfig,
    callbacks: DecoderCallbacks
  ): Promise<void> {
    if (typeof VideoDecoder === "undefined") {
      throw new Error("WebCodecs VideoDecoder is not supported in this environment");
    }

    this.callbacks = callbacks;
    this.frameCounter = 0;

    // Verify codec support
    const isSupported = await WebCodecsVideoDecoder.isSupported(config);
    if (!isSupported) {
      // If hardware acceleration failed, attempt fallback to no-preference or standard profile
      config.hardwareAcceleration = "no-preference";
    }

    this.decoder = new VideoDecoder({
      output: (frame: VideoFrame) => {
        const currentIndex = this.frameCounter++;
        try {
          if (this.callbacks?.onFrame) {
            this.callbacks.onFrame(frame, currentIndex);
          } else {
            // Safety: frame must be closed if not consumed to prevent GPU memory leak
            frame.close();
          }
        } catch (err) {
          frame.close();
          if (this.callbacks?.onError) {
            this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
          }
        }
      },
      error: (e: DOMException) => {
        if (this.callbacks?.onError) {
          this.callbacks.onError(e);
        }
      },
    });

    this.decoder.configure(config);
    this.isConfigured = true;
  }

  /**
   * Feed an EncodedVideoChunk into the hardware decoder
   * Includes backpressure throttle to prevent decoding queue memory exhaustion
   */
  public async decodeChunk(chunk: EncodedVideoChunk): Promise<void> {
    if (!this.decoder || !this.isConfigured) {
      throw new Error("VideoDecoder is not initialized or configured");
    }

    // Backpressure: If the decoder queue size exceeds threshold, yield control
    if (this.decoder.decodeQueueSize > this.maxQueueSize) {
      await new Promise<void>((resolve) => {
        const checkQueue = () => {
          if (!this.decoder || this.decoder.decodeQueueSize <= this.maxQueueSize / 2) {
            resolve();
          } else {
            setTimeout(checkQueue, 4);
          }
        };
        setTimeout(checkQueue, 4);
      });
    }

    this.decoder.decode(chunk);
  }

  /**
   * Flush the decoder to ensure all remaining frames are processed and emitted
   */
  public async flush(): Promise<void> {
    if (this.decoder && this.decoder.state === "configured") {
      await this.decoder.flush();
    }
  }

  /**
   * Reset decoder state
   */
  public reset(): void {
    if (this.decoder && this.decoder.state !== "closed") {
      this.decoder.reset();
      this.isConfigured = false;
      this.frameCounter = 0;
    }
  }

  /**
   * Release decoder and GPU resources
   */
  public close(): void {
    if (this.decoder && this.decoder.state !== "closed") {
      try {
        this.decoder.close();
      } catch {
        // Ignore already closed errors
      }
    }
    this.decoder = null;
    this.isConfigured = false;
    this.callbacks = null;
  }

  public get state(): CodecState | "closed" {
    return this.decoder ? this.decoder.state : "closed";
  }

  public get decodedFrames(): number {
    return this.frameCounter;
  }
}
