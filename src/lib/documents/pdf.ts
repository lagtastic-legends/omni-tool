/**
 * OMNI TOOL — client-side PDF engine (pdf-lib fork with encryption).
 *
 * Every builder returns a Blob ready for download/output cards. No server,
 * no ffmpeg — pure JS in the browser context.
 */

import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
} from "@cantoo/pdf-lib";
import type { JobOutput } from "@/hooks/use-media-job";

/* ------------------------------------------------------------------ */
/* Shared types + constants                                            */
/* ------------------------------------------------------------------ */

/** Helper to robustly read Blobs/Files in all browser environments (especially Capacitor/Mobile). */
async function readAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    try {
      return await blob.arrayBuffer();
    } catch (err) {
      // Fallback for weird WebKit issues
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read as ArrayBuffer"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.readAsArrayBuffer(blob);
  });
}

export type PageSize = "a4" | "letter" | "fit";

export const PAGE_DIMS: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

export type Margin = "edge" | "normal" | "wide";
export const MARGIN_PTS: Record<Margin, number> = {
  edge: 24,
  normal: 50,
  wide: 72,
};

export type TextFont = "helvetica" | "times" | "courier";

const FONT_MAP: Record<TextFont, keyof typeof StandardFonts> = {
  helvetica: "Helvetica",
  times: "TimesRoman",
  courier: "Courier",
};

/* ------------------------------------------------------------------ */
/* Image → PDF                                                         */
/* ------------------------------------------------------------------ */

export interface ImagePdfOptions {
  pageSize: PageSize;
  margin: Margin;
}

/**
 * Embeds a queue of images, one per page. `fit` pages adopt each image's
 * pixel size as points; fixed page sizes letterbox images inside margins,
 * centered, preserving aspect ratio.
 */
export async function buildImagePdf(
  images: { file: File; bitmap: ImageBitmap }[],
  opts: ImagePdfOptions,
): Promise<{ blob: Blob; pageCount: number }> {
  const doc = await PDFDocument.create();
  const margin = MARGIN_PTS[opts.margin];

  for (const { file, bitmap } of images) {
    const bytes = new Uint8Array(await readAsArrayBuffer(file));
    const isJpg =
      file.type === "image/jpeg" ||
      /\.jpe?g$/i.test(file.name);
    const embedded = isJpg
      ? await doc.embedJpg(bytes)
      : await doc.embedPng(bytes);

    let pageW: number;
    let pageH: number;
    if (opts.pageSize === "fit") {
      pageW = bitmap.width;
      pageH = bitmap.height;
    } else {
      [pageW, pageH] = PAGE_DIMS[opts.pageSize];
    }

    const page = doc.addPage([pageW, pageH]);
    const boxW = pageW - margin * 2;
    const boxH = pageH - margin * 2;
    const scale = Math.min(boxW / embedded.width, boxH / embedded.height, 1);
    const drawW = embedded.width * scale;
    const drawH = embedded.height * scale;
    page.drawImage(embedded, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  const out = await doc.save();
  return {
    blob: new Blob([out as unknown as BlobPart], { type: "application/pdf" }),
    pageCount: doc.getPageCount(),
  };
}

/* ------------------------------------------------------------------ */
/* Text → PDF                                                          */
/* ------------------------------------------------------------------ */

/**
 * WinAnsi sanitizer — pdf-lib standard fonts cannot encode arbitrary
 * Unicode. Maps common typography to Latin-1 equivalents and replaces
 * anything else with "?" so typesetting never throws.
 */
export function sanitizeWinAnsi(text: string): string {
  const map: Record<string, string> = {
    "\u2018": "'", "\u2019": "'",
    "\u201c": '"', "\u201d": '"',
    "\u2013": "-", "\u2014": "--",
    "\u2026": "...",
    "\u00a0": " ", "\u2022": "-",
    "\u2192": "->", "\u2190": "<-",
  };
  let out = "";
  for (const ch of text.replace(/\r\n?/g, "\n")) {
    if (map[ch] !== undefined) out += map[ch];
    else if (ch === "\n" || ch === "\t") out += ch === "\t" ? "    " : ch;
    else if (ch.charCodeAt(0) <= 255) out += ch;
    else out += "?";
  }
  return out;
}

/** Greedy word wrap with hard-break for oversized words. */
export function wrapText(
  text: string,
  measure: (s: string) => number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (measure(word) <= maxWidth) {
        current = word;
      } else {
        // hard-break pathological long words
        let chunk = "";
        for (const ch of word) {
          if (measure(chunk + ch) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        current = chunk;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export interface TextPdfOptions {
  font: TextFont;
  fontSize: number;
  pageSize: Exclude<PageSize, "fit">;
  margin: Margin;
  title?: string;
}

export async function buildTextPdf(
  rawText: string,
  opts: TextPdfOptions,
): Promise<{ blob: Blob; pageCount: number }> {
  const doc = await PDFDocument.create();
  const standard = await doc.embedFont(StandardFonts[FONT_MAP[opts.font]]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = MARGIN_PTS[opts.margin];
  const [pageW, pageH] = PAGE_DIMS[opts.pageSize];
  const contentW = pageW - margin * 2;
  const lineHeight = opts.fontSize * 1.5;

  const text = sanitizeWinAnsi(rawText);
  const lines = wrapText(
    text,
    (s) => standard.widthOfTextAtSize(s, opts.fontSize),
    contentW,
  );

  let page = doc.addPage([pageW, pageH]);
  let y = pageH - margin;
  let pageCount = 1;

  // optional title block
  if (opts.title?.trim()) {
    const titleLines = wrapText(
      sanitizeWinAnsi(opts.title.trim()),
      (s) => bold.widthOfTextAtSize(s, opts.fontSize * 1.6),
      contentW,
    );
    for (const tl of titleLines) {
      page.drawText(tl, {
        x: margin,
        y: y - opts.fontSize * 1.6,
        size: opts.fontSize * 1.6,
        font: bold,
        color: rgb(0.12, 0.08, 0.25),
      });
      y -= opts.fontSize * 1.9;
    }
    // separator rule
    page.drawLine({
      start: { x: margin, y: y - 4 },
      end: { x: pageW - margin, y: y - 4 },
      thickness: 1.2,
      color: rgb(0.55, 0.4, 0.85),
    });
    y -= opts.fontSize * 1.2;
  }

  for (const line of lines) {
    if (y - lineHeight < margin) {
      page = doc.addPage([pageW, pageH]);
      pageCount += 1;
      y = pageH - margin;
    }
    if (line !== "") {
      page.drawText(line, {
        x: margin,
        y: y - opts.fontSize,
        size: opts.fontSize,
        font: standard,
        color: rgb(0.13, 0.13, 0.16),
      });
    }
    y -= lineHeight;
  }

  // page numbers, bottom-center
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `${i + 1} / ${pages.length}`;
    const w = bold.widthOfTextAtSize(label, 9);
    p.drawText(label, {
      x: (p.getWidth() - w) / 2,
      y: MARGIN_PTS.edge / 1.6,
      size: 9,
      font: bold,
      color: rgb(0.45, 0.45, 0.5),
      rotate: degrees(0),
    });
  });

  const out = await doc.save();
  return {
    blob: new Blob([out as unknown as BlobPart], { type: "application/pdf" }),
    pageCount,
  };
}

/* ------------------------------------------------------------------ */
/* Lock PDF                                                            */
/* ------------------------------------------------------------------ */

export interface LockOptions {
  userPassword: string;
  ownerPassword: string;
  allowPrinting: boolean;
  allowCopying: boolean;
}

export async function lockPdf(
  file: File,
  opts: LockOptions,
): Promise<{ blob: Blob; pageCount: number }> {
  const bytes = new Uint8Array(await readAsArrayBuffer(file));
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  await doc.encrypt({
    userPassword: opts.userPassword,
    ownerPassword: opts.ownerPassword || opts.userPassword,
    permissions: {
      printing: opts.allowPrinting ? "highResolution" : undefined,
      copying: opts.allowCopying,
      modifying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: false,
      documentAssembly: false,
    },
  });
  const out = await doc.save();
  return {
    blob: new Blob([out as unknown as BlobPart], { type: "application/pdf" }),
    pageCount: doc.getPageCount(),
  };
}

/** Quick client-side check: does this byte stream carry an /Encrypt dict? */
export async function pdfHasEncrypt(blob: Blob): Promise<boolean> {
  const buf = new Uint8Array(await readAsArrayBuffer(blob));
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    s += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return s.includes("/Encrypt");
}

/* ------------------------------------------------------------------ */
/* Scan enhancement (used by scan-to-pdf)                              */
/* ------------------------------------------------------------------ */

/** True pixel-level contrast/brightness lift for scanned pages. */
export async function enhanceImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const contrast = 1.18;
  const brightness = 10;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, Math.max(0, (d[i] - 128) * contrast + 128 + brightness));
    d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - 128) * contrast + 128 + brightness));
    d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - 128) * contrast + 128 + brightness));
  }
  ctx.putImageData(img, 0, 0);
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob((b) => res(b), "image/jpeg", 0.92),
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[a-z]+$/i, "") + "-enhanced.jpg", {
    type: "image/jpeg",
  });
}

/* ------------------------------------------------------------------ */
/* Output helper                                                       */
/* ------------------------------------------------------------------ */

export function buildPdfOutput(name: string, blob: Blob): JobOutput {
  return {
    name,
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    mime: "application/pdf",
  };
}
