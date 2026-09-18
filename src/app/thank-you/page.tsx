import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, ShieldCheck, Cpu } from "lucide-react";

export const metadata: Metadata = {
  title: "Action Complete — Thank You",
  description: "Your request has been successfully processed by Omni Tool.",
  alternates: {
    canonical: "/thank-you",
  },
};

export default function ThankYouPage() {
  return (
    <div className="relative flex min-h-[75vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="panel-hud relative w-full max-w-lg rounded-2xl p-8 sm:p-10 shadow-2xl border border-border/80">
        {/* Glow Success Ring */}
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-pulse/40 bg-pulse/10 text-pulse shadow-inner">
          <CheckCircle2 className="size-8" />
        </div>

        {/* Status Chip */}
        <div className="mx-auto mb-3 w-fit rounded-full border border-pulse/30 bg-pulse/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-pulse">
          Transmission Confirmed
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
          Action Complete
        </h1>

        <p className="mt-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          Your operation has concluded successfully. All processing executed 100% on-device
          with zero data transmitted to third-party servers.
        </p>

        {/* Trust Badges */}
        <div className="my-6 grid grid-cols-2 gap-2 text-left">
          <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/40 p-3">
            <ShieldCheck className="size-4 text-pulse shrink-0" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold text-foreground">Zero-Upload</p>
              <p className="font-mono text-[9px] text-muted-foreground">Local storage only</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/40 p-3">
            <Cpu className="size-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold text-foreground">WASM Engine</p>
              <p className="font-mono text-[9px] text-muted-foreground">Full device speed</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 font-display text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Launch Workspace <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
