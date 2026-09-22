"use client";

/**
 * AuthGuard — Multi-account Google Sign-In & Security Gate.
 *
 *  probing        → splash (session probing)
 *  unconfigured   → children + amber "open mode" banner (app never bricks)
 *  configured     → signed-in: children · signed-out: in-tab Google Account Chooser
 *
 * Provides:
 *  1. In-Tab Google Account Chooser: pick any saved account or enter any Gmail address
 *  2. Official Google OAuth integration with origin-mismatch safety
 *  3. Persistent Guest / Offline Sandbox Mode
 *  4. Instant "Bypass & Enter" failover so users are NEVER trapped on custom domains.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth, type AuthUser } from "@/lib/auth/auth-context";
import { UserAvatar } from "@/components/auth/user-avatar";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.6c-.1 1.1-.9 2.8-2.4 3.9l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.1 0-5.8-2.1-6.7-5l-.14.01-3.6 2.8-.05.13C3.6 21.3 7.5 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.4c-.3-.8-.4-1.6-.4-2.4s.2-1.7.4-2.4l-.01-.16-3.7-2.8-.12.06C.5 8.2 0 10 0 12s.5 3.8 1.5 5.4l3.8-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.6c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.5 0 3.6 2.7 1.5 6.6l3.8 3c.9-2.9 3.6-5 6.7-5z"
      />
    </svg>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const {
    mode,
    user,
    savedAccounts,
    busy,
    error,
    isNative,
    signInWithGoogle,
    signInWithIdToken,
    signInWithGoogleEmail,
    switchAccount,
    removeSavedAccount,
    continueAsGuest,
  } = useAuth();

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [emailInputError, setEmailInputError] = useState<string | null>(null);

  // Auto-expand Add Account if no saved accounts exist
  useEffect(() => {
    if (savedAccounts.length === 0) {
      setShowAddAccount(true);
    }
  }, [savedAccounts.length]);

  // Attempt Google Identity Services (GIS) only if on supported origin
  useEffect(() => {
    const isGuest =
      typeof window !== "undefined" &&
      (localStorage.getItem("omni_guest_session") === "true" ||
        sessionStorage.getItem("omni_guest_session") === "true");

    if (mode === "configured" && !user && !isNative && !isGuest) {
      const initGsi = () => {
        if ((window as any).google?.accounts?.id) {
          try {
            (window as any).google.accounts.id.initialize({
              client_id:
                "1006411301114-q48l1fmvbiba3rq6u1s59qgl13c57sd1.apps.googleusercontent.com",
              auto_select: false,
              itp_support: true,
              callback: (response: any) => {
                if (response?.credential) {
                  void signInWithIdToken(response.credential);
                }
              },
            });

            if (googleBtnRef.current) {
              (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
                type: "standard",
                theme: "outline",
                size: "large",
                text: "signin_with",
                shape: "rectangular",
                logo_alignment: "left",
                width: 320,
              });
            }
          } catch (e) {
            console.warn("Google Identity Services setup:", e);
          }
        }
      };

      if ((window as any).google?.accounts?.id) {
        initGsi();
      } else {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = initGsi;
        document.body.appendChild(script);
        return () => {
          try {
            if ((window as any).google?.accounts?.id) {
              (window as any).google.accounts.id.cancel();
            }
            if (script.parentNode) {
              script.parentNode.removeChild(script);
            }
          } catch {
            // ignore
          }
        };
      }
    }
  }, [mode, user, isNative, signInWithIdToken]);

  const handleCustomAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailInputError(null);
    const email = customEmail.trim();
    if (!email || !email.includes("@")) {
      setEmailInputError("Please enter a valid Gmail address (e.g. name@gmail.com).");
      return;
    }
    signInWithGoogleEmail(email, customName.trim() || undefined);
    setCustomEmail("");
    setCustomName("");
    setShowAddAccount(false);
  };

  /* probe splash --------------------------------------------------------- */
  if (mode === "probing") {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            probing identity layer…
          </p>
        </div>
      </div>
    );
  }

  /* open mode — gate disengaged, banner explains why ---------------------- */
  if (mode === "unconfigured") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p className="font-mono text-[11px] leading-relaxed text-amber-200/90">
            <span className="font-semibold">open mode</span> — the security gate is
            disengaged because no Firebase credentials were detected. All modules
            remain fully usable. Open the{" "}
            <span className="font-semibold">Auth Gateway</span> to enable Google Sign-In
            protection.
          </p>
        </div>
        {children}
      </div>
    );
  }

  /* configured + signed out → In-Tab Google Account Chooser --------------- */
  if (!user) {
    const isDomainOrOriginError =
      error &&
      (error.includes("unauthorized-domain") ||
        error.includes("origin_mismatch") ||
        error.includes("Firebase Console") ||
        error.includes("Google OAuth"));

    return (
      <div className="grid min-h-[75vh] place-items-center py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 rounded-3xl border border-outline-variant/60 bg-surface-container-low/95 p-6 sm:p-8 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
        >
          {/* Header Icon */}
          <div className="relative">
            <div className="grid size-14 place-items-center rounded-2xl border border-primary/40 bg-primary/10 shadow-sm glow-box-violet">
              <Lock
                className="size-7 text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                strokeWidth={2.2}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-surface-container border border-outline-variant/60 shadow-xs">
              <GoogleMark className="size-3.5" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center">
            <h1 className="font-headline text-lg sm:text-xl font-bold tracking-wide text-on-surface">
              CHOOSE A GOOGLE ACCOUNT
            </h1>
            <p className="mt-1.5 font-body text-xs sm:text-[13px] leading-relaxed text-on-surface-variant max-w-sm mx-auto">
              Select or enter your Gmail account to sign in and unlock the ZenoDeck media suite.
            </p>
          </div>

          {/* Account Chooser Box */}
          <div className="w-full space-y-3">
            {/* List of Saved Google Accounts */}
            {savedAccounts.length > 0 && (
              <div className="space-y-1.5 rounded-2xl border border-outline-variant/40 bg-surface-container/60 p-2 shadow-inner">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span>Saved Accounts</span>
                  <span>{savedAccounts.length} on device</span>
                </div>

                <div className="divide-y divide-outline-variant/30">
                  {savedAccounts.map((acc) => (
                    <div
                      key={acc.uid}
                      className="group flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-surface-container-high transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => switchAccount(acc)}
                        className="flex flex-1 items-center gap-3 text-left min-w-0 cursor-pointer"
                        title={`Sign in as ${acc.displayName || acc.email}`}
                      >
                        <UserAvatar user={acc} size="md" showGoogleBadge={true} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-headline text-xs sm:text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                            {acc.displayName || "Google User"}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {acc.email}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => switchAccount(acc)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-headline text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                        >
                          <span>Sign In</span>
                          <ArrowRight className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSavedAccount(acc.uid);
                          }}
                          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer"
                          title="Remove account from this device"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Toggle to Add / Enter Another Google Account */}
            <div className="w-full">
              {!showAddAccount ? (
                <button
                  type="button"
                  onClick={() => setShowAddAccount(true)}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-outline-variant/80 bg-surface-container/40 px-4 py-2.5 text-xs font-headline font-semibold text-on-surface hover:border-primary/60 hover:bg-surface-container-high transition-all cursor-pointer"
                >
                  <Plus className="size-3.5 text-primary" />
                  <span>Use Another Google / Gmail Account</span>
                </button>
              ) : (
                <form
                  onSubmit={handleCustomAccountSubmit}
                  className="space-y-3 rounded-2xl border border-primary/30 bg-surface-container/70 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-headline font-semibold text-on-surface">
                      <Users className="size-3.5 text-primary" />
                      <span>Enter Your Google Account</span>
                    </div>
                    {savedAccounts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAddAccount(false)}
                        className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                        Gmail or Google Workspace Email:
                      </label>
                      <input
                        type="email"
                        required
                        autoFocus={savedAccounts.length === 0}
                        placeholder="e.g. yourname@gmail.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2 font-mono text-xs text-on-surface placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                        Display Name (optional):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tank"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2 font-body text-xs text-on-surface placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                      />
                    </div>

                    {emailInputError && (
                      <p className="text-[11px] font-body text-red-400">
                        {emailInputError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-headline text-xs font-semibold text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                  >
                    <GoogleMark className="size-4" />
                    <span>Sign In & Save Account</span>
                  </button>
                </form>
              )}
            </div>

            {/* Official Google OAuth Trigger / RenderButton */}
            <div className="pt-1 flex flex-col items-center gap-2">
              <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />

              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-outline-variant/60 bg-surface-container px-4 py-2.5 text-xs font-headline font-medium text-on-surface hover:border-primary/50 hover:bg-surface-container-high transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <GoogleMark className="size-4" />
                <span>
                  {busy ? "Connecting Google OAuth…" : "Launch Google OAuth Window"}
                </span>
              </button>
            </div>

            {/* Offline Sandbox Mode Bypass */}
            <div className="pt-2 text-center border-t border-outline-variant/40">
              <button
                onClick={() => continueAsGuest()}
                type="button"
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors py-1 underline underline-offset-4 cursor-pointer"
              >
                Continue as Guest (Offline Sandbox Mode)
              </button>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground/70">
                Permanently unlocks all media tools on this browser
              </p>
            </div>
          </div>

          {/* Error Notice & Failover Actions */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full rounded-2xl border border-red-400/30 bg-red-500/10 p-4 font-body text-xs text-left leading-relaxed text-red-300 space-y-2.5"
                role="alert"
              >
                <div className="font-semibold text-red-400 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="size-4" />
                    <span>Authentication Notice</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => continueAsGuest()}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 font-mono text-[10.5px] cursor-pointer transition-colors"
                  >
                    Bypass & Open Tools
                  </button>
                </div>

                <p className="font-mono text-[11px] text-red-200/90 break-words">
                  {error}
                </p>

                {isDomainOrOriginError && (
                  <div className="rounded-xl bg-zinc-950/80 p-3 border border-white/10 text-[11px] text-zinc-300 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowDomainHelp((prev) => !prev)}
                      className="flex items-center justify-between w-full font-semibold text-amber-300 hover:underline cursor-pointer"
                    >
                      <span>⚙️ How to authorize omni-tool-two.vercel.app in Google Console</span>
                      {showDomainHelp ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </button>

                    {showDomainHelp && (
                      <ol className="list-decimal list-inside space-y-1.5 text-zinc-300 text-[11px] pt-1">
                        <li>
                          Open{" "}
                          <a
                            href="https://console.cloud.google.com/apis/credentials"
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-primary inline-flex items-center gap-0.5"
                          >
                            Google Cloud Credentials <ExternalLink className="size-2.5" />
                          </a>{" "}
                          (Project: <code className="bg-black/50 px-1 py-0.5 rounded text-amber-200">omni-tool-7ba2d</code>)
                        </li>
                        <li>
                          Click Web Client ID (ending in <code className="text-zinc-200">...sd1</code>) &rarr; add to <strong>Authorized JavaScript origins</strong>:
                          <div className="mt-1 font-mono text-[10.5px] bg-black/60 p-1.5 rounded text-emerald-300 select-all">
                            https://omni-tool-two.vercel.app
                          </div>
                        </li>
                        <li>
                          Open{" "}
                          <a
                            href="https://console.firebase.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-primary inline-flex items-center gap-0.5"
                          >
                            Firebase Console <ExternalLink className="size-2.5" />
                          </a>{" "}
                          &rarr; <strong>Authentication &rarr; Settings &rarr; Authorized domains</strong> &rarr; Add:
                          <div className="mt-1 font-mono text-[10.5px] bg-black/60 p-1.5 rounded text-emerald-300 select-all">
                            omni-tool-two.vercel.app
                          </div>
                        </li>
                      </ol>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-secondary/70">
            processing stays on-device · auth guards access only
          </p>
        </motion.div>
      </div>
    );
  }

  /* configured + signed in → full access ----------------------------------- */
  return <>{children}</>;
}
