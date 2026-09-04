export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading workspace"
      className="mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col items-center justify-center px-4 py-12"
    >
      <div className="panel-hud relative flex w-full max-w-md flex-col items-center gap-6 rounded-tactile p-8 sm:p-10 text-center shadow-elevation2 border border-border/80">
        {/* Animated Radar Pulse Spinner */}
        <div className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-primary/10 border border-primary/30" />
          <div className="size-4 rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
        </div>

        {/* Loading text with animated bar */}
        <div className="w-full space-y-2">
          <p className="font-display text-fluid-sm font-bold uppercase tracking-[0.24em] text-foreground">
            INITIALIZING WORKSPACE…
          </p>
          <p className="font-mono text-fluid-xs text-muted-foreground">
            Calibrating WebAssembly engines & client environment
          </p>

          <div className="mx-auto mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border/60">
            <div className="h-full w-2/3 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary via-plasma to-neon" />
          </div>
        </div>

        {/* Skeleton chips with organic shimmer */}
        <div className="grid w-full grid-cols-2 gap-3 pt-2">
          <div className="h-12 rounded-tactile border border-border/50 skeleton-organic" />
          <div className="h-12 rounded-tactile border border-border/50 skeleton-organic" />
        </div>
      </div>
    </div>
  );
}
