"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, LayoutGrid } from "lucide-react";
import { useNavStore } from "@/lib/navigation/nav-store";

interface Props {
  children: ReactNode;
  toolId?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ToolErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ZenoDeck Tool Error]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel-hud relative mx-auto my-6 flex max-w-xl flex-col items-center justify-center rounded-2xl border border-rose-500/40 bg-card/90 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-2xl">
          <div className="grid size-12 place-items-center rounded-xl border border-rose-500/50 bg-rose-500/15 text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
            <AlertTriangle className="size-6" />
          </div>

          <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-rose-300">
            Workstation Module Fault
          </h2>

          <p className="mt-2 font-mono text-xs sm:text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred in this module. The rest of ZenoDeck is running safely on-device.
          </p>

          {this.state.error?.message && (
            <div className="mt-3 w-full rounded-xl border border-border/70 bg-background/60 p-3 text-left font-mono text-[11px] text-rose-200/90 break-all max-h-24 overflow-y-auto">
              {this.state.error.message}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-plasma px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
              <span>Reload Module</span>
            </button>

            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                useNavStore.getState().reset();
              }}
              className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-4 py-2.5 font-mono text-xs text-foreground hover:border-primary/50 active:scale-95 transition-all cursor-pointer"
            >
              <LayoutGrid className="size-3.5" />
              <span>Return to Matrix</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
