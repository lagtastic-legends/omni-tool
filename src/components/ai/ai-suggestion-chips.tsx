"use client";

import { motion } from "framer-motion";
import { Mic, Video, Sliders, FileText, Database, Sparkles } from "lucide-react";
import { useHaptics } from "@/hooks/use-haptics";

interface AiSuggestionChipsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

interface Suggestion {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tag: string;
  prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    id: "vocal-remover",
    icon: Mic,
    title: "Isolate vocals & make karaoke",
    tag: "P3 SOUND",
    prompt: "How do I isolate vocals and make a karaoke track using the Vocal Remover tool?",
  },
  {
    id: "video-compress",
    icon: Video,
    title: "Compress video under 25MB",
    tag: "P2 MEDIA",
    prompt: "What are the best settings to compress a large video under 25MB for Discord or messaging?",
  },
  {
    id: "spatial-8d",
    icon: Sliders,
    title: "How does 8D Binaural Radar work?",
    tag: "P3 8D AUDIO",
    prompt: "How does the 8D Binaural Radar soundstage rotate audio around my headphones?",
  },
  {
    id: "pdf-merge",
    icon: FileText,
    title: "Merge & protect PDF documents",
    tag: "P4 DOCS",
    prompt: "How can I merge multiple PDFs and set a password lock without uploading them to any cloud?",
  },
  {
    id: "vault-storage",
    icon: Database,
    title: "How does Local Vault store files?",
    tag: "P5 STORAGE",
    prompt: "How does the offline Local Vault store files in browser IndexedDB with zero cloud egress?",
  },
];

export function AiSuggestionChips({
  onSelectPrompt,
  disabled = false,
}: AiSuggestionChipsProps) {
  const haptics = useHaptics();

  const handleSelect = (prompt: string) => {
    if (disabled) return;
    haptics.light();
    onSelectPrompt(prompt);
  };

  return (
    <div className="py-2 space-y-2 select-none">
      <div className="flex items-center gap-1.5 px-1 text-[11px] font-mono text-muted-foreground">
        <Sparkles className="size-3 text-primary" />
        <span className="font-semibold uppercase tracking-wider">SUGGESTED CAPABILITIES</span>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
        className="grid grid-cols-1 gap-1.5"
      >
        {SUGGESTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              disabled={disabled}
              variants={{
                hidden: { opacity: 0, y: 8, scale: 0.97 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(item.prompt)}
              className="group flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/70 bg-card/60 hover:bg-primary/10 hover:border-primary/40 transition-all text-left disabled:opacity-50 shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="size-3.5" />
                </div>
                <div className="truncate">
                  <p className="font-medium text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    {item.title}
                  </p>
                </div>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary/80 border border-border/60 text-muted-foreground group-hover:text-foreground shrink-0">
                {item.tag}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
