"use client";

/**
 * PageOptions — shared page-size / margin selects for the PDF tools.
 */

import { ParamSelect } from "@/components/audio/param-controls";
import type { Margin, PageSize } from "@/lib/documents/pdf";

interface PageOptionsProps {
  pageSize: PageSize;
  onPageSize: (v: PageSize) => void;
  margin: Margin;
  onMargin: (v: Margin) => void;
  disabled?: boolean;
  /** Lock the page-size select (text tool has no fit-to-image mode). */
  fixedPageSize?: boolean;
}

export function PageOptions({
  pageSize,
  onPageSize,
  margin,
  onMargin,
  disabled,
  fixedPageSize,
}: PageOptionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ParamSelect
        label="Page size"
        value={pageSize}
        onChange={(v) => onPageSize(v as PageSize)}
        disabled={disabled}
        options={
          fixedPageSize
            ? [
                { value: "a4", label: "A4" },
                { value: "letter", label: "Letter" },
              ]
            : [
                { value: "a4", label: "A4 · 210×297" },
                { value: "letter", label: "Letter · 8.5×11" },
                { value: "fit", label: "Fit to image" },
              ]
        }
      />
      <ParamSelect
        label="Margins"
        value={margin}
        onChange={(v) => onMargin(v as Margin)}
        disabled={disabled}
        options={[
          { value: "edge", label: "Edge · 24pt" },
          { value: "normal", label: "Normal · 50pt" },
          { value: "wide", label: "Wide · 72pt" },
        ]}
      />
    </div>
  );
}
