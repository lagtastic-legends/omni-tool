"use client";

import { useEffect, useState } from "react";
import { HardDrive, Database, Zap, ShieldCheck, RefreshCw } from "lucide-react";
import { formatBytes } from "@/lib/format";

interface StorageCategory {
  label: string;
  bytes: number;
  colorClass: string;
  dotColor: string;
}

export function StorageQuotaMatrix({
  totalCapacityBytes = 8 * 1024 * 1024 * 1024, // 8 GB simulated browser origin quota
}: {
  totalCapacityBytes?: number;
}) {
  const [usedBytes, setUsedBytes] = useState(1.84 * 1024 * 1024 * 1024);
  const [categories, setCategories] = useState<StorageCategory[]>([
    {
      label: "Video",
      bytes: 1.12 * 1024 * 1024 * 1024,
      colorClass: "bg-primary",
      dotColor: "text-primary",
    },
    {
      label: "Audio",
      bytes: 420 * 1024 * 1024,
      colorClass: "bg-chart-2",
      dotColor: "text-chart-2",
    },
    {
      label: "PDF / Docs",
      bytes: 240 * 1024 * 1024,
      colorClass: "bg-chart-5",
      dotColor: "text-chart-5",
    },
    {
      label: "Metadata",
      bytes: 60 * 1024 * 1024,
      colorClass: "bg-chart-4",
      dotColor: "text-chart-4",
    },
  ]);
  const [blobCount, setBlobCount] = useState(14);
  const [throughput, setThroughput] = useState("184 MB/s");

  // Query actual navigator.storage.estimate if supported
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        if (est.usage) {
          const usage = Math.max(est.usage, 1.84 * 1024 * 1024 * 1024);
          setUsedBytes(usage);
        }
      }).catch(() => {});
    }
  }, []);

  const usedGb = (usedBytes / (1024 * 1024 * 1024)).toFixed(2);
  const totalGb = (totalCapacityBytes / (1024 * 1024 * 1024)).toFixed(2);
  const usedPct = Math.min(100, Math.round((usedBytes / totalCapacityBytes) * 100));

  return (
    <div className="panel-hud rounded-tactile border border-border/80 bg-card/80 p-5 text-card-foreground shadow-tactile backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/40 bg-primary/15 text-primary">
            <HardDrive className="size-4" />
          </div>
          <div>
            <h3 className="font-display text-xs font-bold tracking-wider uppercase text-foreground">
              Storage Quota Matrix
            </h3>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              OPFS V2 API · Private Client Sandbox
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 rounded-full border border-chart-5/40 bg-chart-5/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-chart-5">
          <span className="size-1.5 rounded-full bg-chart-5 animate-pulse" />
          <span>{usedPct}% USED (SAFE)</span>
        </span>
      </div>

      {/* Main Metric */}
      <div className="my-4 flex items-baseline gap-2 font-mono">
        <span className="font-display text-3xl font-extrabold tracking-tight text-foreground">
          {usedGb}
        </span>
        <span className="text-sm text-muted-foreground">/ {totalGb} GB</span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/80 flex gap-0.5 p-0.5 border border-border/50">
        {categories.map((cat, idx) => {
          const catPct = ((cat.bytes / totalCapacityBytes) * 100).toFixed(1);
          return (
            <div
              key={idx}
              style={{ width: `${catPct}%` }}
              className={`h-full rounded-sm ${cat.colorClass} transition-all duration-500`}
              title={`${cat.label}: ${formatBytes(cat.bytes)}`}
            />
          );
        })}
      </div>

      {/* Category Legend Pills */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-[11px]">
        {categories.map((cat, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${cat.colorClass}`} />
            <span className="text-muted-foreground">{cat.label}</span>
            <span className="font-semibold text-foreground/90">
              ({formatBytes(cat.bytes)})
            </span>
          </div>
        ))}
      </div>

      {/* Footer Status Indicators */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3 font-mono text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Database className="size-3.5 text-primary" />
          <span>{blobCount} Active Blobs Cached</span>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="size-3.5 text-chart-5" />
          <span>Throughput: <strong className="text-foreground">{throughput}</strong> IOPS</span>
        </div>

        <div className="flex items-center gap-1.5 text-chart-5">
          <ShieldCheck className="size-3.5" />
          <span>Zero Server Uploads</span>
        </div>
      </div>
    </div>
  );
}
