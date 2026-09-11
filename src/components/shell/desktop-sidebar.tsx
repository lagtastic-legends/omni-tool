"use client";

import { useState } from "react";
import {
  LayoutGrid,
  Video,
  Sliders,
  FileText,
  Database,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Sparkles,
  Layers,
  Lock,
} from "lucide-react";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useHaptics } from "@/hooks/use-haptics";
import { useStdoutTelemetry } from "@/hooks/useStdoutTelemetry";

interface NavItem {
  id: string;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard Hub", category: "Core", icon: LayoutGrid },
  { id: "video-converter", label: "Video Engine", category: "Media", icon: Video, badge: "P2" },
  { id: "audio-dsp", label: "Audio Studio & 8D", category: "Sound", icon: Sliders, badge: "P3" },
  { id: "image-to-pdf", label: "PDF & Doc Suite", category: "Document", icon: FileText, badge: "P4" },
  { id: "vault", label: "Local Vault (IDB)", category: "Storage", icon: Database, badge: "P5" },
];

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { view, navigate } = useNavStore();
  const { simdThreads } = useStdoutTelemetry();
  const haptics = useHaptics();

  const handleNav = (id: string) => {
    haptics.light();
    navigate(id);
  };

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-border/80 bg-card/60 backdrop-blur-md transition-all duration-300 ease-out select-none ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Sidebar Header & Toggle */}
      <div className="flex h-14 items-center justify-between border-b border-border/70 px-3">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/40">
              <Sparkles className="size-4" />
            </div>
            <div className="truncate font-mono">
              <span className="font-display text-xs font-black tracking-wider uppercase text-foreground">
                OMNI TOOL
              </span>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest truncate">
                WASM Core Engine
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            haptics.light();
            setCollapsed(!collapsed);
          }}
          className={`flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all ${
            collapsed ? "mx-auto" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      {/* Navigation Module Links */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {!collapsed && (
          <div className="px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            PROCESS MODULES
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            view === item.id ||
            (item.id === "video-converter" && (view.includes("video") || view.includes("gif"))) ||
            (item.id === "audio-dsp" &&
              (view.includes("audio") ||
                view.includes("reverb") ||
                view.includes("bass") ||
                view.includes("panner") ||
                view.includes("equalizer") ||
                view.includes("pitch") ||
                view.includes("tempo") ||
                view.includes("vocal"))) ||
            (item.id === "image-to-pdf" && (view.includes("pdf") || view.includes("ascii") || view.includes("qr")));

          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              title={item.label}
              className={`group flex w-full items-center gap-3 rounded-tactile px-3 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <Icon className="size-4 shrink-0 transition-transform group-hover:scale-110" />

              {!collapsed && (
                <div className="flex flex-1 items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`font-mono text-[9px] px-1.5 py-0.2 rounded border ${
                        isActive
                          ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                          : "border-border/60 bg-background/40 text-muted-foreground"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Telemetry & Runtime Status */}
      <div className="border-t border-border/70 p-2.5 font-mono text-[10px] bg-background/30">
        {!collapsed ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="uppercase tracking-wide text-[9px]">WASM RUNTIME</span>
              <span className="flex items-center gap-1 font-semibold text-chart-5">
                <span className="size-1.5 rounded-full bg-chart-5 animate-pulse" />
                ONLINE
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[9px]">PTHREAD POOL</span>
              <span className="font-semibold text-foreground">{simdThreads}/8 Active</span>
            </div>

            <div className="flex items-center gap-1 pt-1 text-[9px] text-muted-foreground/80 border-t border-border/40">
              <ShieldCheck className="size-3 text-chart-5" />
              <span>Zero-Telemetry v2.6.0</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-1 text-chart-5" title="WASM Online">
            <span className="size-2 rounded-full bg-chart-5 animate-pulse" />
            <Cpu className="size-3.5 text-muted-foreground" />
          </div>
        )}
      </div>
    </aside>
  );
}
