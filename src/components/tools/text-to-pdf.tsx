"use client";

/**
 * TEXT → PDF — typesets raw text with wrapping, font/size control, an
 * optional title block and page numbers. Standard-font safe (WinAnsi).
 */

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { ParamPanel, ParamSelect, ParamSlider } from "@/components/audio/param-controls";
import { PageOptions } from "@/components/documents/page-options";
import { OutputCard } from "@/components/media/output-card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { JobOutput } from "@/hooks/use-media-job";
import {
  buildPdfOutput,
  buildTextPdf,
  type Margin,
  type PageSize,
  type TextFont,
} from "@/lib/documents/pdf";

type Status = "idle" | "working" | "done" | "error";

export function TextToPdf() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [font, setFont] = useState<TextFont>("helvetica");
  const [fontSize, setFontSize] = useState(11);
  const [pageSize, setPageSize] = useState<Exclude<PageSize, "fit">>("a4");
  const [margin, setMargin] = useState<Margin>("normal");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<JobOutput | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const busy = status === "working";
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);

  const compile = async () => {
    if (!text.trim()) return;
    setStatus("working");
    setError(null);
    try {
      const { blob, pageCount: pages } = await buildTextPdf(text, {
        font,
        fontSize,
        pageSize,
        margin,
        title: title.trim() || undefined,
      });
      if (output) URL.revokeObjectURL(output.url);
      setOutput(buildPdfOutput(title.trim() ? `${title.trim().slice(0, 40)}.pdf` : "omni-document.pdf", blob));
      setPageCount(pages);
      setStatus("done");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "typeset failed");
      setError(message);
      setStatus("error");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ------------------------------------------------------- input column */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Document title <span className="text-muted-foreground/50">(optional)</span>
          </p>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Q3 Field Report"
            disabled={busy}
            className="min-h-11 font-mono text-sm"
            aria-label="Document title"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Body text
            </p>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {words} words · {text.length} chars
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type the document body…"
            disabled={busy}
            className="scroll-hud min-h-56 font-mono text-[13px] leading-relaxed"
            aria-label="Document body text"
          />
        </div>

        <ParamPanel title="typography">
          <ParamSelect
            label="Font"
            value={font}
            onChange={(v) => setFont(v as TextFont)}
            disabled={busy}
            options={[
              { value: "helvetica", label: "Helvetica · clean sans" },
              { value: "times", label: "Times · classic serif" },
              { value: "courier", label: "Courier · monospace" },
            ]}
          />
          <ParamSlider
            label="Size"
            value={fontSize}
            min={8}
            max={18}
            step={1}
            onChange={setFontSize}
            disabled={busy}
            display={(v) => `${v} pt`}
          />
          <PageOptions
            pageSize={pageSize}
            onPageSize={(v) => setPageSize(v === "fit" ? "a4" : v)}
            margin={margin}
            onMargin={setMargin}
            disabled={busy}
            fixedPageSize
          />
        </ParamPanel>

        <motion.button
          onClick={() => void compile()}
          disabled={!text.trim() || busy}
          whileHover={!text.trim() || busy ? undefined : { scale: 1.02 }}
          whileTap={!text.trim() || busy ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <FileText className="size-4" />
          {busy ? "TYPESETTING…" : "TYPESET → PDF"}
        </motion.button>
      </div>

      {/* ------------------------------------------------------ output column */}
      <div className="space-y-4">
        {status === "working" && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 font-mono text-[11px] text-primary">
            measuring glyphs · wrapping · paginating…
          </div>
        )}
        {status === "error" && error && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-300" role="alert">
            {error}
          </p>
        )}
        {output && (
          <OutputCard
            output={output}
            onClear={reset}
            badge={`${pageCount} page${pageCount === 1 ? "" : "s"} · ${words} words`}
            badgeTone="neon"
            extra={
              <object
                data={output.url}
                type="application/pdf"
                aria-label="PDF preview"
                className="h-64 w-full rounded-lg border border-border/50 bg-white"
              >
                <p className="p-3 font-mono text-[10px] text-muted-foreground">
                  inline preview unavailable — use the save button
                </p>
              </object>
            }
          />
        )}
        {!output && status === "idle" && (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60">
            <p className="font-mono text-[11px] text-muted-foreground/70">
              output lands here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
