import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Review the terms of service governing the usage of Omni Tool's client-side WebAssembly media engine.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service | OMNI TOOL",
    description: "Terms and conditions for Omni Tool WebAssembly suite.",
    url: "https://omnitool.app/terms",
  },
};

export default function TermsOfServicePage() {
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
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-semibold uppercase tracking-wider mb-2">
            <FileText className="size-4" /> Legal & Terms of Service
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-foreground">
            Terms of Service
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Effective Date: September 3, 2026 · Version 2.0
          </p>
        </header>

        {/* Section 1 */}
        <section className="space-y-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using OMNI TOOL (whether via web browser or mobile APK build), you agree
            to be bound by these Terms of Service. If you do not agree with any part of these terms,
            you must discontinue using the application.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            2. Local Execution & Intellectual Property
          </h2>
          <p>
            OMNI TOOL does not claim ownership of any files, media, or outputs generated using our toolkit.
            You retain 100% intellectual property rights in and to all media you import, transform, and export.
            Because processing occurs entirely on your device, you are solely responsible for ensuring you have
            the legal rights to modify and convert the files you input.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            3. Acceptable Use Policy
          </h2>
          <p>You agree not to utilize OMNI TOOL to:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Process content that infringes upon copyright, trademark, or intellectual property rights.</li>
            <li>Forge fraudulent legal documents or falsify verifiable credentials.</li>
            <li>Attempt to reverse-engineer, inject malware into, or compromise the client security gateway.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            4. Hardware Resource Disclaimer
          </h2>
          <p>
            WebAssembly media operations (video encoding, AI inpainting, heavy audio rendering) utilize
            local CPU, WebGPU, and RAM resources. Omni Tool Labs is not liable for device thermal throttling,
            battery depletion, or browser tab termination caused by out-of-memory states on client hardware.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            5. Limitation of Liability
          </h2>
          <p>
            The software is provided &quot;AS IS&quot;, without warranty of any kind, express or implied.
            In no event shall the authors or copyright holders be liable for any claim, damages, or
            other liability arising from the use of this software.
          </p>
        </section>

        {/* Contact info */}
        <section className="space-y-3 border-t border-border/60 pt-6 font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wide">
            6. Inquiries & Legal Notice
          </h2>
          <p>
            For legal notices or questions concerning these Terms, contact our legal counsel:
          </p>
          <div className="rounded-xl border border-border/60 bg-card/30 p-4 font-mono text-xs space-y-1">
            <p className="font-bold text-foreground">Omni Tool Labs · Legal Division</p>
            <p>100 Montgomery St, Suite 1400, San Francisco, CA 94104</p>
            <p className="text-primary">supportlagtasticlegends@gmail.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}
