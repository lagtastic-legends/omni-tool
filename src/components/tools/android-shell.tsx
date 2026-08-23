"use client";

/**
 * ANDROID SHELL — native build status surface for the Capacitor wrapper.
 * Renders the actual scaffold state (appId, scripts, manifest grants) so a
 * developer can verify the mobile pipeline at a glance before opening
 * Android Studio.
 */

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Smartphone,
  TerminalSquare,
} from "lucide-react";

const PIPELINE = [
  {
    title: "Web export",
    detail: "MOBILE_EXPORT=1 bun run build → static out/ bundle",
    done: true,
  },
  {
    title: "Capacitor sync",
    detail: "bunx cap sync android → copies out/ into the native assets",
    done: true,
  },
  {
    title: "Native permissions",
    detail: "CAMERA + RECORD_AUDIO granted in AndroidManifest.xml",
    done: true,
  },
  {
    title: "Gradle build",
    detail: "cd android && ./gradlew assembleDebug — on your machine",
    done: false,
  },
  {
    title: "Store release",
    detail: "keystore signing via gradlew bundleRelease (phase 7)",
    done: false,
  },
];

const COMMANDS = [
  { label: "export + sync", cmd: "./scripts/build-mobile.sh" },
  { label: "open studio", cmd: "bunx cap open android" },
  { label: "debug apk", cmd: "cd android && ./gradlew assembleDebug" },
  { label: "live reload (dev)", cmd: "bunx cap run android --livereload --external" },
];

export function AndroidShell() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* identity + pipeline ------------------------------------------------ */}
      <div className="space-y-5">
        <div className="panel-hud flex items-center gap-4 rounded-xl p-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
            <Smartphone className="size-6 text-emerald-300" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-foreground">Omni Tool · Android</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              app.omnitool.suite · Capacitor 8 · WebView shell
            </p>
          </div>
        </div>

        <ol className="space-y-2.5" aria-label="Build pipeline status">
          {PIPELINE.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3"
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pulse" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
              )}
              <div>
                <p className="font-mono text-[11px] font-semibold text-foreground/90">
                  {step.title}
                </p>
                <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
              </div>
              <span
                className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] ${
                  step.done
                    ? "border-pulse/40 bg-pulse/10 text-pulse"
                    : "border-border/60 text-muted-foreground/70"
                }`}
              >
                {step.done ? "ready" : "your machine"}
              </span>
            </motion.li>
          ))}
        </ol>
      </div>

      {/* commands ------------------------------------------------------------ */}
      <div className="space-y-4">
        <div className="panel-hud scanlines space-y-3 rounded-xl p-4">
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-neon/90">
            <TerminalSquare className="size-3.5" />
            build console
          </p>
          <ul className="space-y-3">
            {COMMANDS.map((c) => (
              <li key={c.cmd} className="space-y-1">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  {c.label}
                </p>
                <code className="scroll-hud block overflow-x-auto whitespace-nowrap rounded-lg border border-border/60 bg-background/80 px-3 py-2 font-mono text-[11px] text-neon">
                  {c.cmd}
                </code>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            what ships inside
          </p>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
            The whole suite — wasm engine, 22 tools, vault — runs inside the
            Android WebView exactly as in the browser. The QR scanner and
            Studio Recorder use the manifest CAMERA / RECORD_AUDIO grants;
            the FFmpeg core loads from bundled assets, so the app is fully
            offline-capable once installed.
          </p>
        </div>
      </div>
    </div>
  );
}
