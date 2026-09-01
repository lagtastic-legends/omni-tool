"use client";

/**
 * OMNI TOOL — Firebase bootstrap.
 *
 * Credentials are delivered at RUNTIME (no build-time secrets):
 *   1. GET /firebase-config.json   — drop the file into public/ (see the
 *      example next to it; this is what the static export serves too)
 *   2. NEXT_PUBLIC_FIREBASE_* env vars — fallback for platform deploys
 *
 * With no credentials the suite boots in "open mode": fully functional,
 * with a banner explaining how to enable the auth gate. The moment a valid
 * config appears, the AuthGuard hard-locks tools behind Google Sign-In.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const CONFIG_URL = "/firebase-config.json";

function configFromEnv(): FirebaseClientConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
}

let cachedConfig: FirebaseClientConfig | null | undefined;
let configPromise: Promise<FirebaseClientConfig | null> | null = null;

export function isFirebaseConfigured(): boolean {
  return cachedConfig !== null && cachedConfig !== undefined;
}

/** Loads config once (env first, then the runtime JSON), memoized. */
export async function loadFirebaseConfig(): Promise<FirebaseClientConfig | null> {
  if (cachedConfig !== undefined) return cachedConfig;
  if (configPromise) return configPromise;

  configPromise = (async () => {
    let config = configFromEnv();
    if (!config) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const res = await fetch(CONFIG_URL, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const json = (await res.json()) as Partial<FirebaseClientConfig>;
          if (json.apiKey && json.authDomain && json.projectId && json.appId) {
            config = json as FirebaseClientConfig;
          }
        }
      } catch {
        /* no runtime config file or fetch timed out — open mode */
      }
    }
    cachedConfig = config ?? null;
    return cachedConfig;
  })();

  return configPromise;
}

/** Returns the initialized app, or null when unconfigured. */
export function getFirebaseApp(): FirebaseApp | null {
  if (cachedConfig === null || cachedConfig === undefined) return null;
  return getApps().length > 0 ? getApp() : initializeApp(cachedConfig);
}

/** Returns the Auth instance, or null when unconfigured. */
export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}
