"use client";

/**
 * FILE VAULT — IndexedDB-backed manager for everything the suite produced.
 * Search, kind filters, sorting, lazy inline previews, download, delete,
 * clear-all with confirmation, and live storage quota telemetry.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownUp,
  Database,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Files,
  HardDrive,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/format";
import { useVault } from "@/lib/vault/vault-context";
import type { VaultItem, VaultKind } from "@/lib/vault/vault-db";

type KindFilter = "all" | VaultKind;
type SortMode = "recent" | "oldest" | "largest" | "smallest";

const KIND_ICON: Record<VaultKind, typeof FileVideo> = {
  video: FileVideo,
  audio: FileAudio,
  image: FileImage,
  pdf: FileText,
  file: Files,
};

const KIND_TONE: Record<VaultKind, string> = {
  video: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  audio: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
  image: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  pdf: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  file: "border-border/60 bg-muted text-muted-foreground",
};

function VaultRow({ item, onDelete }: { item: VaultItem; onDelete: (id: string) => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const togglePreview = () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (!urlRef.current) {
      urlRef.current = URL.createObjectURL(item.blob);
      setPreviewUrl(urlRef.current);
    }
    setOpen(true);
  };

  const Icon = KIND_ICON[item.kind];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-xl border border-border/60 bg-card/50 p-3"
    >
      <div className="flex items-center gap-3">
        <div className={`grid size-10 shrink-0 place-items-center rounded-lg border ${KIND_TONE[item.kind]}`}>
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-semibold text-foreground">
            {item.name}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {formatBytes(item.size)} · {item.mime} ·{" "}
            {new Date(item.createdAt).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={togglePreview}
            aria-label={open ? `Collapse preview of ${item.name}` : `Preview ${item.name}`}
            className="rounded-lg border border-border/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {open ? "hide" : "view"}
          </button>
          <button
            onClick={() => void import("@/lib/native-save").then(m => m.nativeSave(item.blob, item.name))}
            aria-label={`Download ${item.name}`}
            className="grid size-8 place-items-center rounded-lg border border-pulse/40 bg-pulse/10 text-pulse transition-colors hover:bg-pulse/20"
          >
            <HardDrive className="size-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            aria-label={`Delete ${item.name}`}
            className="grid size-8 place-items-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-red-400/50 hover:text-red-300"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && previewUrl && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {item.kind === "video" && (
                <video src={previewUrl} controls playsInline className="max-h-64 w-full rounded-lg border border-border/50 bg-black" />
              )}
              {item.kind === "audio" && <audio src={previewUrl} controls className="w-full" />}
              {item.kind === "image" && (
                 
                <img src={previewUrl} alt={item.name} className="max-h-64 w-full rounded-lg border border-border/50 bg-black object-contain" />
              )}
              {item.kind === "pdf" && (
                <object data={previewUrl} type="application/pdf" aria-label={`${item.name} preview`} className="h-64 w-full rounded-lg border border-border/50 bg-white" />
              )}
              {item.kind === "file" && (
                <p className="rounded-lg border border-border/50 bg-background/50 p-3 font-mono text-[10px] text-muted-foreground">
                  binary file · {formatBytes(item.size)} · no inline preview
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function VaultView() {
  const { items, ready, totalBytes, estimate, remove, clearAll } = useVault();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sort, setSort] = useState<SortMode>("recent");

  const filtered = useMemo(() => {
    let list = items;
    if (kind !== "all") list = list.filter((i) => i.kind === kind);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (sort) {
      case "recent":
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        sorted.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "largest":
        sorted.sort((a, b) => b.size - a.size);
        break;
      case "smallest":
        sorted.sort((a, b) => a.size - b.size);
        break;
    }
    return sorted;
  }, [items, kind, query, sort]);

  const handleDelete = async (id: string) => {
    await remove(id);
    toast({ title: "Removed from vault" });
  };

  const handleClear = async () => {
    await clearAll();
    toast({ title: "Vault cleared", description: "All stored files were erased from this device." });
  };

  const kindCounts = useMemo(() => {
    const map = new Map<KindFilter, number>([["all", items.length]]);
    for (const i of items) map.set(i.kind, (map.get(i.kind) ?? 0) + 1);
    return map;
  }, [items]);

  const filters: { id: KindFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "video", label: "Video" },
    { id: "audio", label: "Audio" },
    { id: "image", label: "Images" },
    { id: "pdf", label: "PDFs" },
    { id: "file", label: "Files" },
  ];

  const sortLabel: Record<SortMode, string> = {
    recent: "newest",
    oldest: "oldest",
    largest: "largest",
    smallest: "smallest",
  };
  const nextSort: Record<SortMode, SortMode> = {
    recent: "oldest",
    oldest: "largest",
    largest: "smallest",
    smallest: "recent",
  };

  return (
    <div className="space-y-5">
      {/* storage telemetry ------------------------------------------------ */}
      <div className="panel-hud grid gap-4 rounded-xl p-4 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-primary/30 bg-primary/10">
            <Database className="size-5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">stored files</p>
            <p className="font-mono text-sm font-semibold text-foreground">{items.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-neon/30 bg-neon/10">
            <HardDrive className="size-5 text-neon" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">vault size</p>
            <p className="font-mono text-sm font-semibold text-foreground">{formatBytes(totalBytes)}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>origin storage</span>
            {estimate && estimate.quota > 0 && (
              <span className="text-neon">{(estimate.percent * 100).toFixed(2)}%</span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-neon"
              animate={{ width: `${Math.max((estimate?.percent ?? 0) * 100, items.length > 0 ? 1.5 : 0)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {estimate && estimate.quota > 0 && (
            <p className="font-mono text-[9px] text-muted-foreground/70">
              {formatBytes(estimate.usage)} of {formatBytes(estimate.quota)}
            </p>
          )}
        </div>
      </div>

      {/* controls ---------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search the vault…"
            aria-label="Search vault files"
            className="min-h-11 pl-9 font-mono text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="scroll-hud flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by kind">
            {filters.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={kind === f.id}
                onClick={() => setKind(f.id)}
                className={`relative shrink-0 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  kind === f.id
                    ? "bg-gradient-to-r from-primary to-plasma text-white"
                    : "border border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span className="ml-1 text-[8px] opacity-70">{kindCounts.get(f.id) ?? 0}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setSort(nextSort[sort])}
            aria-label={`Sort by ${sortLabel[nextSort[sort]]}`}
            className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ArrowDownUp className="size-3" />
            {sortLabel[sort]}
          </button>
        </div>
      </div>

      {/* list --------------------------------------------------------------- */}
      {filtered.length > 0 ? (
        <>
          <ul className="scroll-hud grid max-h-[30rem] gap-2 overflow-y-auto pr-1" aria-label="Vault files">
            <AnimatePresence initial={false}>
              {filtered.map((item) => (
                <VaultRow key={item.id} item={item} onDelete={(id) => void handleDelete(id)} />
              ))}
            </AnimatePresence>
          </ul>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] text-muted-foreground">
              {filtered.length} of {items.length} shown · persists in this browser
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={items.length === 0}
                  className="flex min-h-9 items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                  clear vault
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Erase the entire vault?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All {items.length} file{items.length === 1 ? "" : "s"} ({formatBytes(totalBytes)}) will be
                    permanently deleted from this browser. Downloads you already saved to your device are untouched.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep files</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleClear()}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Erase everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      ) : ready ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 text-center">
          <Database className="size-8 text-muted-foreground/50" />
          <div>
            <p className="font-display text-sm font-bold text-foreground">vault empty</p>
            <p className="mt-1 max-w-xs font-mono text-[11px] leading-relaxed text-muted-foreground">
              Process anything in the suite, then hit <span className="text-primary">VAULT</span> on
              the output card — it lands here, stored on-device in IndexedDB.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid min-h-52 place-items-center rounded-xl border border-border/60">
          <p className="animate-pulse font-mono text-[11px] text-muted-foreground">opening vault…</p>
        </div>
      )}
    </div>
  );
}
