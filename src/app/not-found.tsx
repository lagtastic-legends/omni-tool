import Link from "next/link";
import { Compass, ArrowLeft, ShieldAlert, Terminal } from "lucide-react";

export const metadata = {
  title: "404 — Module Not Found",
  description: "The requested coordinate or tool route does not exist in Omni Tool.",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="panel-hud relative max-w-lg w-full rounded-2xl p-8 sm:p-10 shadow-2xl border border-border/80">
        {/* Glow indicator */}
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive shadow-inner">
          <ShieldAlert className="size-8 animate-pulse" />
        </div>

        {/* HUD Subtitle Badge */}
        <div className="mx-auto mb-3 w-fit rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-destructive">
          Error 404 // Signal Lost
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
          Module Not Found
        </h1>

        <p className="mt-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          The coordinates or resource you requested do not map to an active WebAssembly
          tool or registered endpoint in this runtime.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 font-display text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft className="size-4" /> Return to Dashboard
          </Link>

          <Link
            href="/privacy"
            className="flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/60 px-5 font-mono text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            Privacy Policy
          </Link>
        </div>

        {/* Terminal debug footer */}
        <div className="mt-8 border-t border-border/60 pt-4 font-mono text-[10px] text-muted-foreground/70 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Terminal className="size-3 text-primary" /> STATUS: 404_ROUTE_UNRESOLVED
          </span>
          <span>OMNI_KERNEL_V2</span>
        </div>
      </div>
    </div>
  );
}
