/**
 * OMNI TOOL — Client-Side Video Processing Engine
 * ISO-BMFF / MP4 Container Muxer (Phase 4)
 *
 * Rebuilds a valid, standards-compliant .mp4 container from EncodedVideoChunk streams.
 * Produces Fast-Start MP4s (moov before mdat) for immediate streaming and playback.
 */

export interface MuxerConfig {
  width: number;
  height: number;
  codec: string;
  timescale?: number; // default: 90000
  description?: Uint8Array; // SPS/PPS avcC extradata
}

interface MuxerSample {
  data: Uint8Array;
  size: number;
  timestampUs: number;
  durationUs: number;
  isKeyFrame: boolean;
}

export class WasmMP4Muxer {
  private config: MuxerConfig;
  private samples: MuxerSample[] = [];
  private totalMdatSize = 0;
  private timescale: number;
  private extradata: Uint8Array | null = null;

  constructor(config: MuxerConfig) {
    this.config = config;
    this.timescale = config.timescale || 90000;
    if (config.description) {
      this.extradata = config.description;
    }
  }

  public setExtradata(extradata: Uint8Array): void {
    this.extradata = extradata;
  }

  /**
   * Append an EncodedVideoChunk into the muxer pipeline
   */
  public addVideoChunk(chunk: EncodedVideoChunk, isKeyFrame?: boolean): void {
    const size = chunk.byteLength;
    const data = new Uint8Array(size);
    chunk.copyTo(data);

    const sample: MuxerSample = {
      data,
      size,
      timestampUs: chunk.timestamp,
      durationUs: chunk.duration || 33333,
      isKeyFrame: isKeyFrame ?? (chunk.type === "key"),
    };

    this.samples.push(sample);
    this.totalMdatSize += size;
  }

  /**
   * Finalize container and assemble MP4 file binary
   */
  public finalize(): ArrayBuffer {
    if (this.samples.length === 0) {
      throw new Error("Cannot finalize MP4: No video samples were added");
    }

    // 1. Calculate total duration in timescale units
    const lastSample = this.samples[this.samples.length - 1];
    const totalDurationUs = lastSample.timestampUs + lastSample.durationUs;
    const durationInTimescale = Math.round((totalDurationUs * this.timescale) / 1_000_000);

    // 2. Build ftyp box
    const ftypBox = this.buildFtypBox();

    // 3. Prepare sample table descriptors
    const sampleSizes = this.samples.map((s) => s.size);
    const syncSamples: number[] = []; // 1-indexed keyframe positions
    this.samples.forEach((s, idx) => {
      if (s.isKeyFrame) syncSamples.push(idx + 1);
    });
    if (syncSamples.length === 0) syncSamples.push(1); // At least first frame is key

    // Convert microsecond durations into timescale deltas for stts
    const sampleDeltas = this.samples.map((s) =>
      Math.max(1, Math.round((s.durationUs * this.timescale) / 1_000_000))
    );

    // 4. Build moov box (with dummy chunk offsets initially to measure moov size)
    const dummyMoov = this.buildMoovBox(
      durationInTimescale,
      sampleSizes,
      syncSamples,
      sampleDeltas,
      [0]
    );

    // Fast-start layout: [ftyp] [moov] [mdat]
    // Calculate final byte offset to start of mdat sample payload
    const mdatHeaderSize = 8;
    const mdatPayloadOffset = ftypBox.byteLength + dummyMoov.byteLength + mdatHeaderSize;

    // Reconstruct chunk offsets for each sample
    const realChunkOffsets: number[] = [];
    let currentOffset = mdatPayloadOffset;
    for (const size of sampleSizes) {
      realChunkOffsets.push(currentOffset);
      currentOffset += size;
    }

    // Build final moov box with exact chunk offsets
    const finalMoov = this.buildMoovBox(
      durationInTimescale,
      sampleSizes,
      syncSamples,
      sampleDeltas,
      realChunkOffsets
    );

    // 5. Build mdat box
    const mdatBox = this.buildMdatBox();

    // 6. Concatenate into single contiguous MP4 ArrayBuffer
    const totalFileSize = ftypBox.byteLength + finalMoov.byteLength + mdatBox.byteLength;
    const finalBuffer = new Uint8Array(totalFileSize);

    finalBuffer.set(ftypBox, 0);
    finalBuffer.set(finalMoov, ftypBox.byteLength);
    finalBuffer.set(mdatBox, ftypBox.byteLength + finalMoov.byteLength);

    return finalBuffer.buffer;
  }

  /* =========================================================================
   * BOX BUILDERS
   * ========================================================================= */

  private buildFtypBox(): Uint8Array {
    const brands = ["isom", "iso2", "avc1", "mp41"];
    const payload = new Uint8Array(8 + brands.length * 4);
    const view = new DataView(payload.buffer);
    this.writeString(payload, 0, "isom"); // major_brand
    view.setUint32(4, 0x00000200);        // minor_version
    brands.forEach((b, i) => this.writeString(payload, 8 + i * 4, b));
    return this.createBox("ftyp", payload);
  }

  private buildMdatBox(): Uint8Array {
    const totalSize = 8 + this.totalMdatSize;
    const mdat = new Uint8Array(totalSize);
    const view = new DataView(mdat.buffer);
    view.setUint32(0, totalSize);
    this.writeString(mdat, 4, "mdat");

    let cursor = 8;
    for (const s of this.samples) {
      mdat.set(s.data, cursor);
      cursor += s.size;
    }
    return mdat;
  }

  private buildMoovBox(
    duration: number,
    sampleSizes: number[],
    syncSamples: number[],
    sampleDeltas: number[],
    chunkOffsets: number[]
  ): Uint8Array {
    // mvhd
    const mvhd = this.buildMvhdBox(duration);
    // trak
    const trak = this.buildTrakBox(duration, sampleSizes, syncSamples, sampleDeltas, chunkOffsets);
    return this.createBox("moov", this.concatBuffers([mvhd, trak]));
  }

  private buildMvhdBox(duration: number): Uint8Array {
    const payload = new Uint8Array(100);
    const view = new DataView(payload.buffer);
    // version = 0, flags = 0
    view.setUint32(0, 0);
    view.setUint32(4, 0); // creation_time
    view.setUint32(8, 0); // modification_time
    view.setUint32(12, this.timescale);
    view.setUint32(16, duration);
    view.setUint32(20, 0x00010000); // rate = 1.0
    view.setUint16(24, 0x0100);     // volume = 1.0
    // unity matrix (36 bytes at offset 36)
    view.setUint32(36, 0x00010000);
    view.setUint32(52, 0x00010000);
    view.setUint32(80, 0x40000000);
    view.setUint32(96, 2); // next_track_ID
    return this.createBox("mvhd", payload);
  }

  private buildTrakBox(
    duration: number,
    sampleSizes: number[],
    syncSamples: number[],
    sampleDeltas: number[],
    chunkOffsets: number[]
  ): Uint8Array {
    const tkhd = this.buildTkhdBox(duration);
    const mdia = this.buildMdiaBox(duration, sampleSizes, syncSamples, sampleDeltas, chunkOffsets);
    return this.createBox("trak", this.concatBuffers([tkhd, mdia]));
  }

  private buildTkhdBox(duration: number): Uint8Array {
    const payload = new Uint8Array(84);
    const view = new DataView(payload.buffer);
    view.setUint32(0, 0x00000007); // version 0, flags: Track_Enabled | Track_In_Movie | Track_In_Preview
    view.setUint32(4, 0);          // creation_time
    view.setUint32(8, 0);          // modification_time
    view.setUint32(12, 1);         // track_ID = 1
    view.setUint32(20, duration);
    // unity matrix
    view.setUint32(36, 0x00010000);
    view.setUint32(52, 0x00010000);
    view.setUint32(80, 0x40000000);
    // dimensions (fixed-point 16.16)
    view.setUint32(76, (this.config.width || 1920) << 16);
    view.setUint32(80, (this.config.height || 1080) << 16);
    return this.createBox("tkhd", payload);
  }

  private buildMdiaBox(
    duration: number,
    sampleSizes: number[],
    syncSamples: number[],
    sampleDeltas: number[],
    chunkOffsets: number[]
  ): Uint8Array {
    const mdhd = this.buildMdhdBox(duration);
    const hdlr = this.buildHdlrBox();
    const minf = this.buildMinfBox(sampleSizes, syncSamples, sampleDeltas, chunkOffsets);
    return this.createBox("mdia", this.concatBuffers([mdhd, hdlr, minf]));
  }

  private buildMdhdBox(duration: number): Uint8Array {
    const payload = new Uint8Array(24);
    const view = new DataView(payload.buffer);
    view.setUint32(0, 0); // version 0, flags 0
    view.setUint32(4, 0); // creation_time
    view.setUint32(8, 0); // modification_time
    view.setUint32(12, this.timescale);
    view.setUint32(16, duration);
    view.setUint16(20, 0x55c4); // language 'und'
    return this.createBox("mdhd", payload);
  }

  private buildHdlrBox(): Uint8Array {
    const payload = new Uint8Array(25);
    const view = new DataView(payload.buffer);
    view.setUint32(0, 0); // version/flags
    this.writeString(payload, 8, "vide");
    this.writeString(payload, 12, "VideoHandler");
    return this.createBox("hdlr", payload);
  }

  private buildMinfBox(
    sampleSizes: number[],
    syncSamples: number[],
    sampleDeltas: number[],
    chunkOffsets: number[]
  ): Uint8Array {
    // vmhd
    const vmhdPayload = new Uint8Array(12);
    const vmhdView = new DataView(vmhdPayload.buffer);
    vmhdView.setUint32(0, 0x00000001); // flags = 1
    const vmhd = this.createBox("vmhd", vmhdPayload);

    // dinf -> dref -> url
    const url = this.createBox("url ", new Uint8Array([0, 0, 0, 1])); // flag = 1 (in-file)
    const drefPayload = new Uint8Array(8 + url.byteLength);
    const drefView = new DataView(drefPayload.buffer);
    drefView.setUint32(0, 0);
    drefView.setUint32(4, 1); // 1 entry
    drefPayload.set(url, 8);
    const dinf = this.createBox("dinf", this.createBox("dref", drefPayload));

    // stbl
    const stbl = this.buildStblBox(sampleSizes, syncSamples, sampleDeltas, chunkOffsets);
    return this.createBox("minf", this.concatBuffers([vmhd, dinf, stbl]));
  }

  private buildStblBox(
    sampleSizes: number[],
    syncSamples: number[],
    sampleDeltas: number[],
    chunkOffsets: number[]
  ): Uint8Array {
    // 1. stsd (Sample Description)
    const stsd = this.buildStsdBox();

    // 2. stts (Time-to-Sample)
    // Run-length compress deltas
    const sttsEntries: { count: number; delta: number }[] = [];
    for (const d of sampleDeltas) {
      const last = sttsEntries[sttsEntries.length - 1];
      if (last && last.delta === d) {
        last.count++;
      } else {
        sttsEntries.push({ count: 1, delta: d });
      }
    }
    const sttsPayload = new Uint8Array(8 + sttsEntries.length * 8);
    const sttsView = new DataView(sttsPayload.buffer);
    sttsView.setUint32(4, sttsEntries.length);
    sttsEntries.forEach((e, i) => {
      sttsView.setUint32(8 + i * 8, e.count);
      sttsView.setUint32(12 + i * 8, e.delta);
    });
    const stts = this.createBox("stts", sttsPayload);

    // 3. stss (Sync Samples / Keyframes)
    const stssPayload = new Uint8Array(8 + syncSamples.length * 4);
    const stssView = new DataView(stssPayload.buffer);
    stssView.setUint32(4, syncSamples.length);
    syncSamples.forEach((s, i) => stssView.setUint32(8 + i * 4, s));
    const stss = this.createBox("stss", stssPayload);

    // 4. stsc (Sample to Chunk - 1 sample per chunk)
    const stscPayload = new Uint8Array(8 + 12);
    const stscView = new DataView(stscPayload.buffer);
    stscView.setUint32(4, 1);      // 1 entry
    stscView.setUint32(8, 1);      // first_chunk
    stscView.setUint32(12, 1);     // samples_per_chunk = 1
    stscView.setUint32(16, 1);     // sample_description_index = 1
    const stsc = this.createBox("stsc", stscPayload);

    // 5. stsz (Sample Sizes)
    const stszPayload = new Uint8Array(12 + sampleSizes.length * 4);
    const stszView = new DataView(stszPayload.buffer);
    stszView.setUint32(4, 0); // sample_size (0 = variable)
    stszView.setUint32(8, sampleSizes.length);
    sampleSizes.forEach((s, i) => stszView.setUint32(12 + i * 4, s));
    const stsz = this.createBox("stsz", stszPayload);

    // 6. stco (Chunk Offsets - 32-bit offsets)
    const stcoPayload = new Uint8Array(8 + chunkOffsets.length * 4);
    const stcoView = new DataView(stcoPayload.buffer);
    stcoView.setUint32(4, chunkOffsets.length);
    chunkOffsets.forEach((o, i) => stcoView.setUint32(8 + i * 4, o));
    const stco = this.createBox("stco", stcoPayload);

    return this.createBox("stbl", this.concatBuffers([stsd, stts, stss, stsc, stsz, stco]));
  }

  private buildStsdBox(): Uint8Array {
    // VisualSampleEntry avc1
    const avcCBox = this.buildAvcCBox();
    const avc1Payload = new Uint8Array(78 + avcCBox.byteLength);
    const avc1View = new DataView(avc1Payload.buffer);
    avc1View.setUint16(6, 1); // data_reference_index = 1
    avc1View.setUint16(24, this.config.width || 1920);
    avc1View.setUint16(26, this.config.height || 1080);
    avc1View.setUint32(28, 0x00480000); // 72 dpi
    avc1View.setUint32(32, 0x00480000); // 72 dpi
    avc1View.setUint16(40, 1);          // frame_count = 1
    avc1View.setUint16(74, 0x0018);     // depth = 24
    avc1View.setInt16(76, -1);          // pre_defined = -1
    avc1Payload.set(avcCBox, 78);
    const avc1 = this.createBox("avc1", avc1Payload);

    const stsdPayload = new Uint8Array(8 + avc1.byteLength);
    const stsdView = new DataView(stsdPayload.buffer);
    stsdView.setUint32(4, 1); // entry_count = 1
    stsdPayload.set(avc1, 8);
    return this.createBox("stsd", stsdPayload);
  }

  private buildAvcCBox(): Uint8Array {
    if (this.extradata && this.extradata.byteLength >= 7) {
      return this.createBox("avcC", this.extradata);
    }

    // Default Baseline SPS/PPS fallback
    const fallbackAvcC = new Uint8Array([
      0x01, // configurationVersion
      0x42, // AVCProfileIndication (Baseline = 0x42)
      0x00, // profile_compatibility
      0x1e, // AVCLevelIndication (3.0 = 0x1E)
      0xff, // lengthSizeMinusOne = 3 (4-byte NAL lengths)
      0xe1, // numOfSequenceParameterSets = 1
      0x00, 0x0a, 0x27, 0x42, 0x00, 0x1e, 0x89, 0x8b, 0x60, 0x50, 0x1e, 0xa8, // SPS
      0x01, // numOfPictureParameterSets = 1
      0x00, 0x04, 0x28, 0xce, 0x38, 0x80, // PPS
    ]);
    return this.createBox("avcC", fallbackAvcC);
  }

  /* =========================================================================
   * UTILITIES
   * ========================================================================= */

  private createBox(type: string, payload: Uint8Array): Uint8Array {
    const box = new Uint8Array(8 + payload.byteLength);
    const view = new DataView(box.buffer);
    view.setUint32(0, box.byteLength);
    this.writeString(box, 4, type);
    box.set(payload, 8);
    return box;
  }

  private concatBuffers(buffers: Uint8Array[]): Uint8Array {
    const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
      result.set(b, offset);
      offset += b.byteLength;
    }
    return result;
  }

  private writeString(target: Uint8Array, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      target[offset + i] = str.charCodeAt(i);
    }
  }

  public dispose(): void {
    this.samples = [];
    this.totalMdatSize = 0;
    this.extradata = null;
  }
}
