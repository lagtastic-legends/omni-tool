"use client";

/**
 * AuthProvider — Google Sign-In session for web + native Android.
 *
 *  Native (Capacitor): @capacitor-firebase/authentication drives the
 *  Google account picker through the OS, using the google-services.json
 *  credentials baked into the APK.
 *
 *  Web: firebase JS SDK signInWithPopup with the Google provider.
 *
 * The context exposes a `mode` field so the UI can distinguish
 * "unconfigured" (open mode, gate disengaged) from configured states.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as webSignOut,
  type User,
} from "firebase/auth";
import {
  getFirebaseAuth,
  loadFirebaseConfig,
} from "@/lib/auth/firebase";

export type AuthMode = "probing" | "unconfigured" | "configured";
export type AuthUser = Pick<
  User,
  "uid" | "displayName" | "email" | "photoURL"
> & { providerId: string };

interface AuthContextValue {
  mode: AuthMode;
  user: AuthUser | null;
  busy: boolean;
  error: string | null;
  isNative: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    providerId: user.providerData[0]?.providerId ?? "google.com",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>("probing");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNative =
    typeof window !== "undefined" && Capacitor.isNativePlatform?.() === true;

  /* Probe configuration once, then subscribe to session changes. -------- */
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const config = await loadFirebaseConfig();
      if (!config) {
        setMode("unconfigured");
        return;
      }
      setMode("configured");

      const auth = getFirebaseAuth();
      if (!auth) {
        setMode("unconfigured");
        return;
      }

      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u ? toAuthUser(u) : null);
      });
    })();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (isNative) {
        // Native Android: OS-level Google account picker.
        try {
          const result = await FirebaseAuthentication.signInWithGoogle();
          const u = result.user;
          if (u) {
            setUser({
              uid: u.uid,
              displayName: u.displayName ?? null,
              email: u.email ?? null,
              photoURL: u.photoUrl ?? null,
              providerId: "google.com",
            });
          }
          return;
        } catch (nativeErr) {
          console.warn("Native Google Sign-In failed. Falling back to web flow.", nativeErr);
          // Fall through to web flow below.
        }
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Firebase is not configured on this deployment.");
        return;
      }
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      setUser(toAuthUser(credential.user));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "sign-in failed");
      setError(`Sign In Error: ${message}`);
    } finally {
      setBusy(false);
    }
  }, [isNative]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      if (isNative) {
        await FirebaseAuthentication.signOut();
        setUser(null);
      } else {
        const auth = getFirebaseAuth();
        if (auth) await webSignOut(auth);
        setUser(null);
      }
      setError(null);
    } finally {
      setBusy(false);
    }
  }, [isNative]);

  const value = useMemo<AuthContextValue>(
    () => ({ mode, user, busy, error, isNative, signInWithGoogle, signOut }),
    [mode, user, busy, error, isNative, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
