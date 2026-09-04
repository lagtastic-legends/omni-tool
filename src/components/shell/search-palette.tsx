"use client";

import { useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TOOL_REGISTRY } from "@/lib/tools/registry";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useSearchStore } from "@/lib/search/search-store";

const ACCENT_MAP: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-500",
  cyan: "bg-cyan-500/10 text-cyan-500",
  purple: "bg-purple-500/10 text-purple-500",
  orange: "bg-orange-500/10 text-orange-500",
  red: "bg-red-500/10 text-red-500",
  blue: "bg-blue-500/10 text-blue-500",
  yellow: "bg-yellow-500/10 text-yellow-500",
  pink: "bg-pink-500/10 text-pink-500",
  indigo: "bg-indigo-500/10 text-indigo-500",
};

export function SearchPalette({ hideTrigger = false }: { hideTrigger?: boolean }) {
  const { isOpen, setOpen, toggle } = useSearchStore();
  const navigate = useNavStore((s) => s.navigate);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, [setOpen]);

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          title="Search Tools (Cmd+K)"
        >
          <Search className="size-3.5" />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] sm:inline">
            SEARCH
          </span>
        </button>
      )}

      <CommandDialog open={isOpen} onOpenChange={setOpen}>
        <CommandInput placeholder="Search tools, features, converters..." />
        <CommandList>
          <CommandEmpty>No tools found.</CommandEmpty>
          <CommandGroup heading="Tools & Modules">
            {TOOL_REGISTRY.map((tool) => (
              <CommandItem
                key={tool.id}
                value={tool.name + " " + tool.description}
                onSelect={() => runCommand(() => navigate(tool.id))}
                className="flex items-center gap-3 py-3 cursor-pointer"
              >
                <div className={`grid size-8 place-items-center rounded-lg ${ACCENT_MAP[tool.accent] || "bg-primary/10 text-primary"}`}>
                  <tool.icon className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-sm font-semibold text-foreground">
                    {tool.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tool.description}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
