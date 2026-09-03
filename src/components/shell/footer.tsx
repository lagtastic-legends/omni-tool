"use client";

import { Cpu, ShieldCheck, Mail, MapPin } from "lucide-react";
import Link from "next/link";

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        {/* Main Footer Row */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Brand & Address */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-bold tracking-[0.24em] text-foreground uppercase">
                OMNI TOOL LABS
              </span>
              <span className="rounded-full border border-pulse/30 bg-pulse/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-pulse">
                v2.4
              </span>
            </div>

            <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <MapPin className="size-3 shrink-0 text-primary" />
              100 Montgomery St, Suite 1400, San Francisco, CA 94104
            </p>

            <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Mail className="size-3 shrink-0 text-neon" />
              <a href="mailto:support@omnitool.app" className="hover:text-foreground transition-colors underline">
                support@omnitool.app
              </a>
            </p>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Cpu className="size-3.5 text-neon" />
              100% on-device processing
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-pulse" />
              zero file uploads
            </span>
          </div>
        </div>

        {/* Bottom Legal & Links Row */}
        <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] text-muted-foreground">
            © {currentYear} Omni Tool Labs, Inc. All rights reserved. Powered by WebAssembly.
          </p>

          <nav aria-label="Legal and Help" className="flex items-center gap-4 font-mono text-[11px]">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/thank-you"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Status
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
