"use client";

/**
 * AUTH GATEWAY — Google Sign-In & Multi-Account Management Surface.
 *
 * Configured:
 *  - Active Google profile card & sign-out
 *  - Multi-Account switcher: switch between accounts or add new Gmail accounts
 *  - Privacy & client-side WASM guarantees
 *  - Maintainer domain authorization guide for Google Cloud / Firebase
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ExternalLink,
  Fingerprint,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
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

export function AuthGateway() {
  const {
    mode,
    user,
    savedAccounts,
    busy,
    error,
    isNative,
    signInWithGoogle,
    signInWithGoogleEmail,
    switchAccount,
    removeSavedAccount,
    continueAsGuest,
    signOut,
  } = useAuth();

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const configured = mode === "configured";

  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    const email = newEmail.trim();
    if (!email || !email.includes("@")) {
      setEmailError("Please enter a valid Gmail address.");
      return;
    }
    signInWithGoogleEmail(email, newName.trim() || undefined);
    setNewEmail("");
    setNewName("");
    setShowAddAccount(false);
  };

  const otherAccounts = savedAccounts.filter(
    (a) => a.uid !== user?.uid && a.email?.toLowerCase() !== user?.email?.toLowerCase()
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {/* ------------------------------------------------------ session side */}
      <div className="space-y-5">
        <div className="panel-hud scanlines space-y-5 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 glow-box-violet">
              <Fingerprint className="size-6 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-wide text-foreground">
                Identity
              </h2>
              <p
                className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                suppressHydrationWarning
              >
                google sign-in &middot; {isNative ? "native android" : "multi-account web"}
              </p>
            </div>
          </div>

          {mode === "probing" ? (
            <p className="animate-pulse font-mono text-[11px] text-muted-foreground">
              probing identity session…
            </p>
          ) : user ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Active Profile Card */}
              <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
                <UserAvatar user={user} size="lg" showGoogleBadge={true} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-semibold text-foreground">
                    {user.displayName ?? "Google User"}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {user.email ?? "no email"}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-pulse/30 bg-pulse/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-pulse">
                    <ShieldCheck className="size-3" />
                    {user.isGuest ? "guest session" : `active · ${user.providerId}`}
                  </p>
                </div>
              </div>

              {/* Other Saved Accounts on this Device */}
              {otherAccounts.length > 0 && (
                <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3">
                  <div className="flex items-center justify-between text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground px-1">
                    <span>Switch Google Account</span>
                    <span>{otherAccounts.length} other</span>
                  </div>

                  <div className="space-y-1.5">
                    {otherAccounts.map((acc) => (
                      <div
                        key={acc.uid}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card/50 hover:bg-card/80 border border-border/40 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => switchAccount(acc)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <UserAvatar user={acc} size="sm" showGoogleBadge={true} />
                          <div className="min-w-0">
                            <p className="truncate font-headline text-xs font-semibold text-foreground">
                              {acc.displayName || "Google User"}
                            </p>
                            <p className="truncate font-mono text-[10px] text-muted-foreground">
                              {acc.email}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => switchAccount(acc)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary hover:text-on-primary font-headline text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            <span>Switch</span>
                            <ArrowRight className="size-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSavedAccount(acc.uid)}
                            className="grid size-6 place-items-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Remove account from device"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add / Connect Another Account */}
              <div className="w-full">
                {!showAddAccount ? (
                  <button
                    type="button"
                    onClick={() => setShowAddAccount(true)}
                    className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-border/80 bg-card/40 px-4 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <Plus className="size-3.5 text-primary" />
                    <span>Add Another Google Account</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleAddAccountSubmit}
                    className="space-y-2.5 rounded-xl border border-primary/40 bg-card/80 p-3.5"
                  >
                    <div className="flex items-center justify-between text-xs font-mono font-semibold text-foreground">
                      <span>Add Google Account</span>
                      <button
                        type="button"
                        onClick={() => setShowAddAccount(false)}
                        className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <input
                      type="email"
                      required
                      placeholder="Gmail address (e.g. name@gmail.com)"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full rounded-lg border border-border/70 bg-card px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                    />

                    <input
                      type="text"
                      placeholder="Display Name (optional)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full rounded-lg border border-border/70 bg-card px-3 py-1.5 font-body text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                    />

                    {emailError && (
                      <p className="text-[11px] font-mono text-red-400">{emailError}</p>
                    )}

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 font-headline text-xs font-semibold text-on-primary hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <Plus className="size-3" />
                      <span>Connect Account</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Sign Out Button */}
              <motion.button
                onClick={() => void signOut()}
                disabled={busy}
                whileTap={busy ? undefined : { scale: 0.97 }}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/50 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-300 disabled:opacity-50 cursor-pointer"
              >
                <LogOut className="size-4" />
                {busy ? "SIGNING OUT…" : "SIGN OUT OF ALL SESSIONS"}
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                Sign in with any Google account or use the in-tab account chooser.
                Your session lives in this browser only — processed media never leaves
                the device either way.
              </p>

              {savedAccounts.length > 0 && (
                <div className="space-y-1.5 rounded-xl border border-border/60 bg-card/50 p-2.5">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-1 mb-1">
                    Select a Google Account
                  </p>
                  {savedAccounts.map((acc) => (
                    <button
                      key={acc.uid}
                      type="button"
                      onClick={() => switchAccount(acc)}
                      className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-card/80 border border-border/40 text-left transition-colors cursor-pointer"
                    >
                      <UserAvatar user={acc} size="sm" showGoogleBadge={true} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-headline text-xs font-semibold text-foreground">
                          {acc.displayName || "Google User"}
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {acc.email}
                        </p>
                      </div>
                      <ArrowRight className="size-3.5 text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddAccountSubmit} className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="Enter Gmail (e.g. yourname@gmail.com)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-card px-3.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-headline text-xs font-semibold text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  <GoogleMark className="size-4" />
                  <span>Sign In as Gmail User</span>
                </button>
              </form>

              <button
                onClick={() => void signInWithGoogle()}
                disabled={busy}
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-2 text-xs font-mono text-foreground hover:bg-secondary hover:border-primary/50 transition-all cursor-pointer w-full"
              >
                <GoogleMark className="size-3.5" />
                <span>Launch Google OAuth Window</span>
              </button>

              <div className="text-center pt-1">
                <button
                  onClick={() => continueAsGuest()}
                  type="button"
                  className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 cursor-pointer"
                >
                  Continue as Guest (Offline Sandbox)
                </button>
              </div>

              {error && (
                <p
                  className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-[10px] leading-relaxed text-red-300"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* security posture */}
        <div className="panel-hud space-y-3 rounded-xl p-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-neon/90">
            security posture
          </p>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">firebase project</span>
              <span className={configured ? "text-emerald-400 font-semibold" : "text-amber-300"}>
                {configured ? "omni-tool-7ba2d" : "not linked"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">accounts on device</span>
              <span className="text-primary font-semibold">{savedAccounts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">media processing</span>
              <span className="text-emerald-400">always on-device (WASM)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">vault storage</span>
              <span className="text-emerald-400">indexeddb · AES-GCM local</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------ project telemetry side */}
      <div className="space-y-5">
        <div className="panel-hud scanlines space-y-5 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 glow-box-violet">
                <ShieldCheck className="size-6 text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold tracking-wide text-foreground">
                  Cloud Infrastructure
                </h2>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Google Identity & Authentication
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.2)]">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/40 p-4 space-y-3 font-mono text-[11px]">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Project ID</span>
              <span className="text-foreground font-semibold">omni-tool-7ba2d</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Active Domain</span>
              <span className="text-foreground">omni-tool-two.vercel.app</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Android Client</span>
              <span className="text-foreground truncate max-w-[200px]">
                com.omnitool.app (SHA-1)
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Account Chooser</span>
              <span className="text-foreground">Native In-Tab Multi-Account</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Data Privacy</span>
              <span className="text-emerald-400 font-semibold">Zero-Egress WASM Sandbox</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
