"use client";

/**
 * DashboardView — the master hub: hero, live suite stats, engine boot
 * console, system integrity probes, recent vault strip and the tool matrix.
 */

import { motion } from "framer-motion";
import { Activity, ArrowDown, Boxes, Database, FileAudio, FileImage, FileText, FileVideo, Files, Sparkles, Timer } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { OmniRecorder } from "@/lib/native-recorder";
import { EngineBootPanel } from "@/components/engine/engine-boot-panel";
import { ToolGrid } from "@/components/dashboard/tool-grid";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { formatBytes } from "@/lib/format";
import { useNavStore } from "@/lib/navigation/nav-store";
import { getOnlineTools, TOOL_REGISTRY } from "@/lib/tools/registry";
import { useVault } from "@/lib/vault/vault-context";
import { cn } from "@/lib/utils";
import type { VaultKind } from "@/lib/vault/vault-db";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const VAULT_ICON: Record<VaultKind, typeof FileVideo> = {
  video: FileVideo,
  audio: FileAudio,
  image: FileImage,
  pdf: FileText,
  file: Files,
};

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
  isNative,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone: string;
  isNative?: boolean;
}) {
  return (
    <div
      className={cn(
        "panel-hud flex items-center gap-2.5 sm:gap-3 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3",
        isNative && "gap-2 sm:gap-2.5 md:gap-3 px-2.5 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3"
      )}
    >
      <div
        className={cn(
          `grid size-8 sm:size-9 shrink-0 place-items-center rounded-lg border ${tone}`,
          isNative && "size-7 sm:size-8 md:size-9"
        )}
      >
        <Icon className="size-3.5 sm:size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-mono text-[8.5px] sm:text-[9px] uppercase tracking-[0.12em] sm:tracking-[0.18em] text-muted-foreground truncate",
            isNative && "tracking-[0.08em] sm:tracking-[0.12em]"
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "truncate font-mono text-xs sm:text-sm font-semibold text-foreground",
            isNative && "text-[11px] sm:text-xs md:text-sm font-bold"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function DashboardView() {
  const { state, bootMs } = useFFmpegEngine();
  const { items, totalBytes } = useVault();
  const navigate = useNavStore((s) => s.navigate);

  const [isNative, setIsNative] = useState(() => {
    if (process.env.NEXT_PUBLIC_MOBILE_EXPORT === "1") return true;
    if (typeof window !== "undefined") return Capacitor.isNativePlatform?.() === true;
    return false;
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform?.()) {
      setIsNative(true);
    }
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      OmniRecorder.requestPermissions().catch(console.warn);
    }
  }, []);

  const onlineCount = useMemo(
    () =>
      TOOL_REGISTRY.filter(
        (t) => t.status === "online" && (t.requiresEngine === false || state === "ready")
      ).length,
    [state]
  );
  const recent = items.slice(0, 4);

  return (
    <div className="flex flex-col gap-10">
      {/* hero ------------------------------------------------------------ */}
      <section className="space-y-5 text-center pt-2 sm:pt-4">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.05}
          className="mx-auto w-fit rounded-full border border-border/70 bg-card/50 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground backdrop-blur"
        >
          webassembly · zero-upload · cross-platform
        </motion.p>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.15}
          className="font-display text-3xl sm:text-5xl lg:text-6xl font-black uppercase leading-[1.05] tracking-tight text-foreground"
        >
          One toolkit.
          <br />
          <span className="bg-gradient-to-r from-primary via-plasma to-neon bg-clip-text text-transparent">
            Total control.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.25}
          className="mx-auto max-w-xl text-xs sm:text-sm md:text-base leading-relaxed text-muted-foreground px-2"
        >
          Convert video, engineer audio, forge documents, capture your screen and
          vault the results — all processed locally by a WebAssembly engine that
          never ships a byte to a server.
        </motion.p>

        {/* Above-the-fold Primary CTAs */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.28}
          className="mx-auto flex flex-wrap items-center justify-center gap-3 pt-2"
        >
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("tool-matrix");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 sm:px-8 font-display text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            <Sparkles className="size-4" />
            <span>Explore Toolkit</span>
            <ArrowDown className="size-3.5 opacity-70" />
          </button>

          <button
            type="button"
            onClick={() => navigate("vault")}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/60 px-5 sm:px-6 font-mono text-xs font-semibold text-foreground backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-card/80 active:scale-[0.98]"
          >
            <Database className="size-4 text-neon" />
            <span>Open Vault</span>
          </button>
        </motion.div>
      </section>

      {/* suite stats ------------------------------------------------------ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={0.3}
        className={cn(
          isNative
            ? "grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3"
            : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 lg:grid-cols-4"
        )}
      >
        <StatChip
          icon={Boxes}
          label="live modules"
          value={`${onlineCount} / ${TOOL_REGISTRY.length}`}
          tone="border-primary/30 bg-primary/10 text-primary"
          isNative={isNative}
        />
        <StatChip
          icon={Database}
          label="vaulted files"
          value={items.length === 0 ? "empty" : `${items.length} · ${formatBytes(totalBytes)}`}
          tone="border-neon/30 bg-neon/10 text-neon"
          isNative={isNative}
        />
        <StatChip
          icon={Activity}
          label="engine"
          value={state === "ready" ? "online" : state}
          tone={
            state === "ready"
              ? "border-pulse/30 bg-pulse/10 text-pulse"
              : "border-amber-400/30 bg-amber-500/10 text-amber-300"
          }
          isNative={isNative}
        />
        <StatChip
          icon={Timer}
          label="last boot"
          value={bootMs !== null ? `${(bootMs / 1000).toFixed(2)} s` : "—"}
          tone="border-plasma/30 bg-plasma/10 text-plasma"
          isNative={isNative}
        />
      </motion.div>

      {/* engine boot ----------------------------------------------------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.35}>
        <EngineBootPanel />
      </motion.div>

      

      {/* recent vault strip ----------------------------------------------- */}
      {recent.length > 0 && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.5}
          aria-labelledby="recent-vault-heading"
          className="space-y-3"
        >
          <div className="flex items-baseline justify-between">
            <h3
              id="recent-vault-heading"
              className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.28em] text-foreground/90"
            >
              <Database className="size-4 text-neon" />
              Fresh from the Vault
            </h3>
            <button
              onClick={() => navigate("vault")}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary hover:underline"
            >
              open vault →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((item, i) => {
              const Icon = VAULT_ICON[item.kind];
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -3 }}
                  onClick={() => navigate("vault")}
                  className="panel-hud flex items-center gap-3 rounded-xl p-3 text-left hover:border-neon/40"
                  aria-label={`Open vault — latest file ${item.name}`}
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-neon/30 bg-neon/10">
                    <Icon className="size-4 text-neon" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                      {formatBytes(item.size)} ·{" "}
                      {new Date(item.createdAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* tool matrix ------------------------------------------------------ */}
      <motion.div id="tool-matrix" variants={fadeUp} initial="hidden" animate="show" custom={0.55}>
        <ToolGrid />
      </motion.div>
    </div>
  );
}


