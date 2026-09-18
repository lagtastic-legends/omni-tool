import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, HardDrive, Cpu, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Omni Tool enforces a zero-upload architecture. Learn how your files remain 100% on your device with WebAssembly.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | OMNI TOOL",
    description: "Zero uploads. Zero servers. Total data privacy.",
    url: "https://omnitool.app/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Top back button */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-3.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Return to Toolkit
      </Link>

      <div className="panel-hud rounded-2xl p-6 sm:p-10 shadow-xl border border-border/80 space-y-8">
        {/* Header */}
        <header className="border-b border-border/60 pb-6">
          <div className="flex items-center gap-2 text-pulse font-mono text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="size-4" /> Compliance & Zero-Upload Guarantee
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Effective Date: September 3, 2026 · Version 2.4
          </p>
        </header>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold">
              <Cpu className="size-4" /> 100% On-Device
            </div>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              All audio, video, image and document transformations execute in your browser via WebAssembly.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-pulse font-mono text-xs font-bold">
              <Lock className="size-4" /> Zero File Uploads
            </div>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              We never upload, inspect, transmit, or retain your raw files on any external server.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-neon font-mono text-xs font-bold">
              <HardDrive className="size-4" /> Local Vault
            </div>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              Your vaulted outputs reside purely within your device IndexedDB and localStorage storage.
            </p>
          </div>
        </div>

        {/* Section 1 */}
        <section className="space-y-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            1. Overview of Data Architecture
          </h2>
          <p>
            OMNI TOOL was engineered from the ground up to guarantee absolute file sovereignty.
            Traditional web utilities upload your private media to cloud clusters for processing.
            In contrast, OMNI TOOL compiles native binaries (including FFmpeg, PDF engines, and AI vision
            models) into WebAssembly (WASM) bytecode that executes strictly on your local device CPU/GPU.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            2. Information We Collect & Why
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-foreground">Authentication Credentials:</strong> When signing in with
              Google OAuth via Firebase, your basic profile info (display name, email, avatar URL) is used
              only to authenticate your active session.
            </li>
            <li>
              <strong className="text-foreground">Telemetry & Analytics:</strong> Aggregate, anonymized performance
              metrics (such as engine load status and tool error codes) may be collected to identify broken
              WASM instructions without ever tracking personal identifiers.
            </li>
            <li>
              <strong className="text-foreground">Local Settings:</strong> Your theme preferences and audio/video
              presets are stored locally in your browser’s `localStorage`.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            3. Cookie & Storage Policy
          </h2>
          <p>
            We use strictly essential cookies and local storage tokens necessary for session persistence
            and authentication state. No cross-site advertising or third-party behavioral trackers are employed.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            4. Data Retention & Erasure
          </h2>
          <p>
            You retain 100% control of your data. Clearing your browser data or clicking &quot;Clear Vault&quot;
            in the Vault interface permanently purges all stored media from your device with zero remnants.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 border-t border-border/60 pt-6 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            5. Contact Information
          </h2>
          <p>
            If you have questions regarding this Privacy Policy or our on-device security safeguards, please reach out to:
          </p>
          <div className="rounded-xl border border-border/60 bg-card/30 p-4 font-mono text-xs space-y-1">
            <p className="font-bold text-foreground">Omni Tool Labs · Data Protection</p>
            <p>100 Montgomery St, Suite 1400, San Francisco, CA 94104</p>
            <p className="text-primary">support.omnitool.com@gmail.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}
