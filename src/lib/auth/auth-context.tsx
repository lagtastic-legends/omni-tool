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
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
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
> & { providerId: string; isGuest?: boolean };

interface AuthContextValue {
  mode: AuthMode;
  user: AuthUser | null;
  busy: boolean;
  error: string | null;
  isNative: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithIdToken: (idToken: string) => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function extractPhotoFromJwt(idToken: string): string | null {
  try {
    const parts = idToken.split(".");
    if (parts.length >= 2) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(json);
      return payload.picture || null;
    }
  } catch {
    // ignore decoding errors
  }
  return null;
}

function extractPhotoURL(user: any): string | null {
  if (!user) return null;
  // Direct properties
  if (typeof user.photoURL === "string" && user.photoURL.trim()) return user.photoURL.trim();
  if (typeof user.photoUrl === "string" && user.photoUrl.trim()) return user.photoUrl.trim();
  if (typeof user.imageUrl === "string" && user.imageUrl.trim()) return user.imageUrl.trim();
  if (typeof user.picture === "string" && user.picture.trim()) return user.picture.trim();

  // Check providerData (Google account avatar is often stored here by Firebase)
  if (Array.isArray(user.providerData)) {
    for (const provider of user.providerData) {
      if (!provider) continue;
      if (typeof provider.photoURL === "string" && provider.photoURL.trim()) return provider.photoURL.trim();
      if (typeof provider.photoUrl === "string" && provider.photoUrl.trim()) return provider.photoUrl.trim();
      if (typeof provider.picture === "string" && provider.picture.trim()) return provider.picture.trim();
      if (typeof provider.imageUrl === "string" && provider.imageUrl.trim()) return provider.imageUrl.trim();
    }
  }

  // Check Firebase internal reloadUserInfo
  if (user.reloadUserInfo) {
    if (typeof user.reloadUserInfo.photoUrl === "string" && user.reloadUserInfo.photoUrl.trim()) {
      return user.reloadUserInfo.photoUrl.trim();
    }
    if (typeof user.reloadUserInfo.photoURL === "string" && user.reloadUserInfo.photoURL.trim()) {
      return user.reloadUserInfo.photoURL.trim();
    }
  }

  return null;
}

function toAuthUser(user: User | any): AuthUser {
  const photo = extractPhotoURL(user);
  return {
    uid: user.uid,
    displayName: user.displayName || user.providerData?.[0]?.displayName || null,
    email: user.email || user.providerData?.[0]?.email || null,
    photoURL: photo,
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

    // Check if test mock session or guest session was set
    if (typeof window !== "undefined") {
      const mockUserJson = sessionStorage.getItem("omni_mock_user");
      if (mockUserJson) {
        try {
          setUser(JSON.parse(mockUserJson));
        } catch {
          // ignore
        }
      } else if (sessionStorage.getItem("omni_guest_session") === "true") {
        setUser({
          uid: "guest-user",
          displayName: "Guest Explorer",
          email: "guest@omnitool.local",
          photoURL: null,
          providerId: "guest.local",
          isGuest: true,
        });
      }
    }

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

      // Process pending redirect result (mobile Safari uses redirect flow)
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("omni_guest_session");
          }
          setUser(toAuthUser(redirectResult.user));
        }
      } catch (e: any) {
        console.warn("Redirect sign-in result:", e);
        if (e && typeof e === "object" && e.code && e.code !== "auth/null-user") {
          setError(e.message || String(e));
        }
      }
      
      unsubscribeWeb = onAuthStateChanged(auth, (u) => {
        if (u) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("omni_guest_session");
          }
          setUser(toAuthUser(u));
        } else {
          // If in test mock or guest session, preserve user; otherwise set null
          if (typeof window !== "undefined") {
            const mockUserJson = sessionStorage.getItem("omni_mock_user");
            if (mockUserJson) {
              try {
                setUser(JSON.parse(mockUserJson));
                return;
              } catch {}
            }
            if (sessionStorage.getItem("omni_guest_session") === "true") {
              setUser({
                uid: "guest-user",
                displayName: "Guest Explorer",
                email: "guest@omnitool.local",
                photoURL: null,
                providerId: "guest.local",
                isGuest: true,
              });
              return;
            }
          }
          setUser(null);
        }
      });
    })();

    return () => {
      unsubscribeWeb?.();
      unsubscribeNative?.();
    };
  }, [isNative]);

  const continueAsGuest = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("omni_guest_session", "true");
    }
    setUser({
      uid: "guest-user",
      displayName: "Guest Explorer",
      email: "guest@omnitool.local",
      photoURL: null,
      providerId: "guest.local",
      isGuest: true,
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (isNative) {
        // Native Android: OS-level Google account picker.
        const result = await FirebaseAuthentication.signInWithGoogle({
          useCredentialManager: false,
        });
        const u = result.user;
        if (u) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("omni_guest_session");
          }
          setUser(toAuthUser(u));
        }
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Firebase is not configured on this deployment.");
        return;
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const isMobileBrowser =
        typeof navigator !== "undefined" &&
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

      if (isMobileBrowser) {
        // Mobile browsers (Safari on iOS, Chrome on Android) cannot do multi-window popups.
        // Opening a new tab severs window.opener and drops the third-party auth state.
        // Full in-tab redirect is the official, reliable flow on mobile.
        await signInWithRedirect(auth, provider);
        return;
      }

      try {
        const res = await signInWithPopup(auth, provider);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("omni_guest_session");
        }
        setUser(toAuthUser(res.user));
      } catch (err: any) {
        if (err.code === "auth/popup-blocked") {
          // Popup was blocked by browser settings — fallback to redirect in same tab
          const auth = getFirebaseAuth();
          if (auth) {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            await signInWithRedirect(auth, provider);
            return;
          }
        }
        if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
          // User closed or dismissed the popup window — no error notice needed
          return;
        }
        const message =
          err instanceof Error ? err.message : String(err ?? "sign-in failed");
        setError(message);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "sign-in failed");
      setError(message);
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
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("omni_guest_session");
      }
      const authUser = toAuthUser(res.user);
      const jwtPhoto = !authUser.photoURL ? extractPhotoFromJwt(idToken) : null;
      setUser(jwtPhoto ? { ...authUser, photoURL: jwtPhoto } : authUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    setBusy(true);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("omni_guest_session");
    }
    try {
      if (isNative) {
        await FirebaseAuthentication.signOut();
        setUser(null);
      } else {
        const auth = getFirebaseAuth();
        if (auth) {
          await webSignOut(auth);
          setUser(null);
        } else {
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
    () => ({ mode, user, busy, error, isNative, signInWithGoogle, signInWithIdToken, continueAsGuest, signOut }),
    [mode, user, busy, error, isNative, signInWithGoogle, signInWithIdToken, continueAsGuest, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
