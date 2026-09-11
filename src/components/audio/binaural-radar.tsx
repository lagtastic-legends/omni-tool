"use client";

import { useEffect, useState } from "react";
import { Headphones, Volume2, Orbit } from "lucide-react";

export function BinauralRadar({
  cycleSec = 8,
  intensity = 0.85,
  widening = 1.25,
  isPlaying = false,
}: {
  cycleSec?: number;
  intensity?: number;
  widening?: number;
  isPlaying?: boolean;
}) {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      // Convert cycle seconds into angular speed (360 deg / cycleSec)
      const speed = 360 / Math.max(cycleSec, 1);
      setAngle((prev) => (prev + speed * delta) % 360);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [cycleSec]);

  // Calculate orbital node coordinates in the 200x200 arena (center 100, 100)
  const radius = 68;
  const radians = (angle * Math.PI) / 180;
  const nodeX = 100 + radius * Math.cos(radians);
  const nodeY = 100 + radius * Math.sin(radians);

  const freqHz = (1 / Math.max(cycleSec, 1)).toFixed(2);
  const spreadPct = Math.round(widening * 100);

  return (
    <div className="panel-hud rounded-tactile border border-border/80 bg-card/85 p-4 text-card-foreground shadow-tactile backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg border border-chart-2/40 bg-chart-2/15 text-chart-2">
            <Orbit className="size-4" />
          </div>
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
              8D Binaural Radar
            </h4>
            <p className="font-mono text-[10px] text-muted-foreground uppercase">
              HRTF 360° Circular Soundstage
            </p>
          </div>
        </div>

        <span className="rounded border border-chart-2/40 bg-chart-2/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-chart-2">
          {freqHz} Hz Orbit
        </span>
      </div>

      {/* 2D Orbital Radar Display */}
      <div className="relative mx-auto my-4 flex size-52 items-center justify-center">
        {/* Radar Crosshairs */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-full w-px bg-border/40" />
          <div className="absolute w-full h-px bg-border/40" />
        </div>

        {/* Concentric Radar Rings */}
        <div className="absolute size-48 rounded-full border border-border/50 bg-background/30" />
        <div className="absolute size-36 rounded-full border border-border/60 border-dashed" />
        <div className="absolute size-24 rounded-full border border-border/70" />

        {/* Dynamic Sweep Glow */}
        <div
          style={{ transform: `rotate(${angle}deg)` }}
          className="pointer-events-none absolute size-44 rounded-full bg-gradient-to-tr from-transparent via-primary/10 to-chart-2/20"
        />

        {/* Central Listener Head */}
        <div className="relative z-10 flex flex-col items-center justify-center rounded-full border border-border/90 bg-card p-2 shadow-sm">
          <Headphones className="size-6 text-foreground/90" />
          <span className="mt-0.5 font-mono text-[8px] font-bold tracking-widest text-muted-foreground uppercase">
            EAR-L/R
          </span>
        </div>

        {/* Revolving 8D Sound Node */}
        <div
          style={{
            left: `${nodeX}px`,
            top: `${nodeY}px`,
            transform: "translate(-50%, -50%)",
          }}
          className="absolute z-20 flex size-7 items-center justify-center rounded-full border-2 border-chart-2 bg-chart-2/20 text-chart-2 shadow-[0_0_14px_rgba(6,182,212,0.6)] transition-all duration-75"
        >
          <Volume2 className="size-3.5 animate-pulse text-foreground" />
        </div>
      </div>

      {/* Technical Telemetry Parameters */}
      <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center font-mono text-[10px]">
        <div>
          <p className="text-muted-foreground uppercase">Orbit Period</p>
          <p className="font-bold text-foreground">{cycleSec}s ({freqHz} Hz)</p>
        </div>
        <div className="border-x border-border/40 px-1">
          <p className="text-muted-foreground uppercase">Field Spread</p>
          <p className="font-bold text-chart-2">{spreadPct}% (Wide)</p>
        </div>
        <div>
          <p className="text-muted-foreground uppercase">Azimuth</p>
          <p className="font-bold text-foreground">+{Math.round(intensity * 14)}° Incline</p>
        </div>
      </div>
    </div>
  );
}
