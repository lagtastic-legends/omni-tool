"use client";

import { useState, useEffect, useMemo } from "react";
import type { AuthUser } from "@/lib/auth/auth-context";

/**
 * Official Google Material color palette used by Gmail and Google Accounts
 * for default profile pictures when no custom photo is uploaded.
 */
export const GOOGLE_AVATAR_PALETTE = [
  { bg: "#1a73e8", text: "#ffffff", border: "#185abc" }, // Google Blue 600
  { bg: "#d93025", text: "#ffffff", border: "#b31412" }, // Google Red 600
  { bg: "#1e8e3e", text: "#ffffff", border: "#137333" }, // Google Green 600
  { bg: "#e37400", text: "#ffffff", border: "#b06000" }, // Google Orange 600
  { bg: "#9334e6", text: "#ffffff", border: "#7627bb" }, // Google Purple 600
  { bg: "#12b5cb", text: "#ffffff", border: "#007b83" }, // Google Cyan 600
  { bg: "#e52592", text: "#ffffff", border: "#b80672" }, // Google Pink 600
  { bg: "#007b83", text: "#ffffff", border: "#004d40" }, // Google Teal 700
  { bg: "#5f6368", text: "#ffffff", border: "#3c4043" }, // Google Gray 600
];

/**
 * Deterministically picks an authentic Google Material color based on
 * the user's email or display name so the avatar color is consistent.
 */
export function getGoogleAvatarColor(identifier: string) {
  if (!identifier) return GOOGLE_AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GOOGLE_AVATAR_PALETTE.length;
  return GOOGLE_AVATAR_PALETTE[index];
}

interface UserAvatarProps {
  user: AuthUser | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showGoogleBadge?: boolean;
}

const SIZE_CONFIGS = {
  xs: {
    container: "size-5",
    text: "text-[10px]",
    badge: "size-2.5 -bottom-0.5 -right-0.5",
    iconSize: "size-3",
  },
  sm: {
    container: "size-6 sm:size-7",
    text: "text-xs font-semibold",
    badge: "size-3 -bottom-0.5 -right-0.5",
    iconSize: "size-3.5",
  },
  md: {
    container: "size-8 sm:size-9",
    text: "text-sm font-semibold",
    badge: "size-3.5 -bottom-1 -right-1",
    iconSize: "size-4",
  },
  lg: {
    container: "size-12 sm:size-14",
    text: "text-xl font-bold",
    badge: "size-4.5 -bottom-1 -right-1",
    iconSize: "size-6",
  },
  xl: {
    container: "size-16 sm:size-20",
    text: "text-2xl font-bold",
    badge: "size-5 -bottom-1.5 -right-1.5",
    iconSize: "size-8",
  },
};

export function UserAvatar({
  user,
  size = "sm",
  className = "",
  showGoogleBadge = false,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset imgError state whenever the photoURL changes
  useEffect(() => {
    setImgError(false);
  }, [user?.photoURL]);

  const cfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.sm;

  // Extract initial character
  const initial = useMemo(() => {
    if (!user) return "?";
    const source = (user.displayName || user.email || "").trim();
    if (!source) return "G";
    return source.charAt(0).toUpperCase();
  }, [user]);

  // Deterministic Google Material color for Gmail style
  const avatarColor = useMemo(() => {
    const key = (user?.email || user?.displayName || "google-user").toLowerCase();
    return getGoogleAvatarColor(key);
  }, [user?.email, user?.displayName]);

  // Check if user is a guest
  const isGuest = user?.isGuest === true;

  return (
    <div className={`relative inline-flex shrink-0 select-none ${className}`}>
      {user?.photoURL && !imgError ? (
        <img
          src={user.photoURL}
          alt={user.displayName ? `${user.displayName}'s avatar` : "User profile avatar"}
          className={`${cfg.container} rounded-full object-cover shrink-0 ring-1 ring-border/60 shadow-xs`}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          loading="eager"
        />
      ) : isGuest ? (
        <div
          className={`${cfg.container} grid place-items-center rounded-full bg-pulse/20 border border-pulse/40 text-pulse font-mono ${cfg.text} shadow-xs`}
          title="Guest Explorer"
        >
          {initial}
        </div>
      ) : (
        /* Authentic Default Gmail Picture (Google Material colored circular avatar) */
        <div
          className={`${cfg.container} grid place-items-center rounded-full shadow-xs shrink-0 font-sans ${cfg.text} leading-none transition-transform`}
          style={{
            backgroundColor: avatarColor.bg,
            color: avatarColor.text,
            boxShadow: "0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
          title={user?.email ? `${user.email} (Google Account)` : "Google Account"}
          aria-label={user?.displayName || user?.email || "Google Account profile picture"}
        >
          <span className="translate-y-[-0.5px] font-sans antialiased">
            {initial}
          </span>
        </div>
      )}

      {/* Optional Google "G" provider badge indicator */}
      {showGoogleBadge && user?.providerId === "google.com" && (
        <span
          className={`absolute ${cfg.badge} rounded-full bg-white p-0.5 shadow-sm border border-zinc-200 flex items-center justify-center`}
          title="Verified Google Account"
        >
          <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.6c-.1 1.1-.9 2.8-2.4 3.9l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6z" />
            <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.1 0-5.8-2.1-6.7-5l-.14.01-3.6 2.8-.05.13C3.6 21.3 7.5 24 12 24z" />
            <path fill="#FBBC05" d="M5.3 14.4c-.3-.8-.4-1.6-.4-2.4s.2-1.7.4-2.4l-.01-.16-3.7-2.8-.12.06C.5 8.2 0 10 0 12s.5 3.8 1.5 5.4l3.8-3z" />
            <path fill="#EA4335" d="M12 4.6c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.5 0 3.6 2.7 1.5 6.6l3.8 3c.9-2.9 3.6-5 6.7-5z" />
          </svg>
        </span>
      )}
    </div>
  );
}
