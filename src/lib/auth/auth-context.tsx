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
  signInWithCredential,
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
  signInWithIdToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: User | any): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName || user.displayName,
    email: user.email,
    photoURL: user.photoUrl || user.photoURL,
    providerId: user.providerData?.[0]?.providerId ?? "google.com",
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
    let unsubscribeWeb: (() => void) | undefined;
    let unsubscribeNative: (() => void) | undefined;

    void (async () => {
      const config = await loadFirebaseConfig();
      if (!config) {
        setMode("unconfigured");
        return;
      }
      setMode("configured");

      if (isNative) {
        // Check existing native session first
        try {
          const res = await FirebaseAuthentication.getCurrentUser();
          if (res.user) {
            setUser(toAuthUser(res.user as unknown as User));
          }
          // Listen for native auth state changes
          const listener = await FirebaseAuthentication.addListener(
            "authStateChange",
            (changed) => {
              setUser(changed.user ? toAuthUser(changed.user as unknown as User) : null);
            }
          );
          unsubscribeNative = () => {
            listener.remove().catch(() => {});
          };
        } catch (e) {
          console.warn("Native auth check failed", e);
        }
        return;
      }

      // Web fallback
      const auth = getFirebaseAuth();
      if (!auth) {
        setMode("unconfigured");
        return;
      }

      unsubscribeWeb = onAuthStateChanged(auth, (u) => {
        setUser(u ? toAuthUser(u) : null);
      });
    })();

    return () => {
      unsubscribeWeb?.();
      unsubscribeNative?.();
    };
  }, [isNative]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (isNative) {
        // Native Android: OS-level Google account picker.
        // We disable useCredentialManager because it causes "No credentials available"
        // on many devices and sometimes doesn't list all Gmail accounts.
        const result = await FirebaseAuthentication.signInWithGoogle({
          useCredentialManager: false,
        });
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
      setError(
        /popup/i.test(message)
          ? "Sign-in popup was blocked or closed before finishing."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }, [isNative]);

  const signInWithIdToken = useCallback(async (idToken: string) => {
    setError(null);
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase unconfigured");
      const credential = GoogleAuthProvider.credential(idToken);
      const res = await signInWithCredential(auth, credential);
      setUser(toAuthUser(res.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (isNative) {
        await FirebaseAuthentication.signOut();
        setUser(null);
      } else {
        const auth = getFirebaseAuth();
        if (auth) {
          await webSignOut(auth);
          setUser(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [isNative]);

  const value = useMemo<AuthContextValue>(
    () => ({ mode, user, busy, error, isNative, signInWithGoogle, signInWithIdToken, signOut }),
    [mode, user, busy, error, isNative, signInWithGoogle, signInWithIdToken, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
