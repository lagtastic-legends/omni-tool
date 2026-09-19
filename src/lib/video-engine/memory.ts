/**
 * OMNI TOOL — Client-Side Video Processing Engine
 * Memory Management & Dual-Mode Pipeline (SharedArrayBuffer + Transferable Fallback)
 *
 * Designed to prevent memory duplication OOM crashes when processing large videos
 * offline in browsers and Capacitor Android WebViews.
 */

import {
  ChunkDescriptor,
  EngineMemoryMode,
  SHARED_RING_BUFFER_HEADER_BYTES,
  SHARED_RING_BUFFER_HEADER_INTS,
  SHARED_RING_MAGIC,
} from "./types";

/**
 * Detect runtime memory capabilities
 */
export function detectMemoryCapabilities(): {
  supportedMode: EngineMemoryMode;
  isCrossOriginIsolated: boolean;
  hasSharedArrayBuffer: boolean;
} {
  const isCrossOriginIsolated =
    typeof self !== "undefined" && Boolean(self.crossOriginIsolated);

  const hasSharedArrayBuffer =
    typeof SharedArrayBuffer !== "undefined" && isCrossOriginIsolated;

  return {
    supportedMode: hasSharedArrayBuffer
      ? "shared-array-buffer"
      : "transferable-array-buffer",
    isCrossOriginIsolated,
    hasSharedArrayBuffer,
  };
}

/**
 * SharedArrayBuffer Circular Ring Buffer
 *
 * Memory Layout:
 * [Control Block: 32 bytes (8 x int32)]
 *   - index 0: MAGIC (0x56494445)
 *   - index 1: STATUS (0: IDLE, 1: ACTIVE, 2: FULL, 3: ERROR)
 *   - index 2: WRITE_HEAD (byte offset)
 *   - index 3: READ_HEAD (byte offset)
 *   - index 4: CAPACITY (byte size of data arena)
 *   - index 5: COMMITTED_CHUNKS (chunk count)
 *   - index 6: DROPPED_CHUNKS (overflow counter)
 *   - index 7: ATOMIC_LOCK (futex)
 * [Descriptor Arena: N x 24 bytes]
 *   - offset (int32), size (int32), timestamp (float64 = 2 x int32), duration (float64 = 2 x int32)
 * [Data Arena: Remaining bytes]
 *   - Raw encoded video chunks or byte stream
 */
export class SharedRingBuffer {
  private buffer: SharedArrayBuffer;
  private header: Int32Array;
  private dataArena: Uint8Array;
  private dataArenaOffset: number;
  private capacity: number;

  constructor(bufferOrSize: SharedArrayBuffer | number) {
    if (typeof bufferOrSize === "number") {
      if (typeof SharedArrayBuffer === "undefined") {
        throw new Error(
          "SharedArrayBuffer is not supported in this environment (missing crossOriginIsolated)."
        );
      }
      this.buffer = new SharedArrayBuffer(bufferOrSize);
      this.header = new Int32Array(this.buffer, 0, SHARED_RING_BUFFER_HEADER_INTS);
      this.dataArenaOffset = SHARED_RING_BUFFER_HEADER_BYTES;
      this.capacity = bufferOrSize - this.dataArenaOffset;
      this.dataArena = new Uint8Array(
        this.buffer,
        this.dataArenaOffset,
        this.capacity
      );
      this.initHeader();
    } else {
      this.buffer = bufferOrSize;
      this.header = new Int32Array(this.buffer, 0, SHARED_RING_BUFFER_HEADER_INTS);
      if (this.header[0] !== SHARED_RING_MAGIC) {
        throw new Error("Invalid SharedRingBuffer: magic number mismatch");
      }
      this.dataArenaOffset = SHARED_RING_BUFFER_HEADER_BYTES;
      this.capacity = this.header[4];
      this.dataArena = new Uint8Array(
        this.buffer,
        this.dataArenaOffset,
        this.capacity
      );
    }
  }

  private initHeader(): void {
    Atomics.store(this.header, 0, SHARED_RING_MAGIC);
    Atomics.store(this.header, 1, 0); // STATUS: IDLE
    Atomics.store(this.header, 2, 0); // WRITE_HEAD
    Atomics.store(this.header, 3, 0); // READ_HEAD
    Atomics.store(this.header, 4, this.capacity);
    Atomics.store(this.header, 5, 0); // COMMITTED_CHUNKS
    Atomics.store(this.header, 6, 0); // DROPPED_CHUNKS
    Atomics.store(this.header, 7, 0); // ATOMIC_LOCK
  }

  public getRawBuffer(): SharedArrayBuffer {
    return this.buffer;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getAvailableWriteBytes(): number {
    const writeHead = Atomics.load(this.header, 2);
    const readHead = Atomics.load(this.header, 3);
    if (writeHead >= readHead) {
      return this.capacity - (writeHead - readHead) - 1;
    }
    return readHead - writeHead - 1;
  }

  public getAvailableReadBytes(): number {
    const writeHead = Atomics.load(this.header, 2);
    const readHead = Atomics.load(this.header, 3);
    if (writeHead >= readHead) {
      return writeHead - readHead;
    }
    return this.capacity - (readHead - writeHead);
  }

  /**
   * Write raw bytes directly into the shared ring buffer (Zero-copy producer)
   */
  public writeChunk(chunkData: Uint8Array): { offset: number; size: number } | null {
    const size = chunkData.byteLength;
    if (size > this.capacity) {
      throw new Error(`Chunk size (${size}) exceeds ring buffer capacity (${this.capacity})`);
    }

    if (this.getAvailableWriteBytes() < size) {
      Atomics.add(this.header, 6, 1); // increment DROPPED_CHUNKS
      return null;
    }

    let writeHead = Atomics.load(this.header, 2);
    const startOffset = writeHead;

    const remainingToEnd = this.capacity - writeHead;
    if (remainingToEnd >= size) {
      this.dataArena.set(chunkData, writeHead);
      writeHead = (writeHead + size) % this.capacity;
    } else {
      // Split write across circular boundary
      const firstPart = chunkData.subarray(0, remainingToEnd);
      const secondPart = chunkData.subarray(remainingToEnd);
      this.dataArena.set(firstPart, writeHead);
      this.dataArena.set(secondPart, 0);
      writeHead = secondPart.byteLength;
    }

    Atomics.store(this.header, 2, writeHead);
    Atomics.add(this.header, 5, 1); // increment COMMITTED_CHUNKS
    return { offset: startOffset, size };
  }

  /**
   * Read raw bytes from the ring buffer into an output buffer (Consumer)
   */
  public readChunk(size: number): Uint8Array | null {
    if (this.getAvailableReadBytes() < size) {
      return null;
    }

    let readHead = Atomics.load(this.header, 3);
    const out = new Uint8Array(size);

    const remainingToEnd = this.capacity - readHead;
    if (remainingToEnd >= size) {
      out.set(this.dataArena.subarray(readHead, readHead + size));
      readHead = (readHead + size) % this.capacity;
    } else {
      // Read across circular boundary
      out.set(this.dataArena.subarray(readHead, this.capacity), 0);
      const remainingBytes = size - remainingToEnd;
      out.set(this.dataArena.subarray(0, remainingBytes), remainingToEnd);
      readHead = remainingBytes;
    }

    Atomics.store(this.header, 3, readHead);
    Atomics.sub(this.header, 5, 1); // decrement COMMITTED_CHUNKS
    return out;
  }

  public reset(): void {
    this.initHeader();
  }
}

/**
 * Transferable Chunk Pipeline (Zero-Copy Fallback for Capacitor WebView)
 *
 * When SharedArrayBuffer is unavailable, this manager handles ArrayBuffer ownership
 * transfers via postMessage(data, [transferable]) to avoid memory cloning.
 */
export class TransferableChunkQueue {
  private queue: ArrayBuffer[] = [];
  private totalBytesQueued = 0;

  public enqueue(buffer: ArrayBuffer): void {
    this.queue.push(buffer);
    this.totalBytesQueued += buffer.byteLength;
  }

  public dequeue(): ArrayBuffer | undefined {
    const buf = this.queue.shift();
    if (buf) {
      this.totalBytesQueued -= buf.byteLength;
    }
    return buf;
  }

  public peek(): ArrayBuffer | undefined {
    return this.queue[0];
  }

  public get size(): number {
    return this.queue.length;
  }

  public get bytesQueued(): number {
    return this.totalBytesQueued;
  }

  public clear(): void {
    this.queue = [];
    this.totalBytesQueued = 0;
  }
}
