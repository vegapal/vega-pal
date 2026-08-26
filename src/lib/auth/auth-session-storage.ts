/**
 * Auth session persistence — single authoritative browser behavior.
 *
 * Remember me ON:
 *   Supabase auth uses native localStorage (survives tab + browser close).
 *
 * Remember me OFF:
 *   Supabase auth still writes to localStorage (GoTrue needs a durable store
 *   during the tab lifetime), but a sessionStorage "alive" marker gates it.
 *   When the browser session ends, the marker is gone and boot clears auth.
 *
 * ROOT CAUSE (prior broken design):
 *   A dual localStorage/sessionStorage adapter could:
 *   1) Silently fall back to an in-memory Map when localStorage.setItem failed
 *      → session dies on any reload/browser close
 *   2) Leave the live session only in sessionStorage when preference/timing raced
 *      → browser close clears auth even with Remember me checked
 *
 * Auth storage key (this project): sb-<project-ref>-auth-token
 * Backend after fix: always localStorage for the Supabase session payload.
 */

import { logAuthDebug } from "@/lib/auth/debug";

export const REMEMBER_ME_KEY = "vegapal_remember_me";
/** Present only for the current browser session when Remember me is OFF. */
export const SESSION_ALIVE_KEY = "vegapal_session_alive";

export function getRememberMePreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(REMEMBER_ME_KEY);
    if (raw === null) return true;
    return raw !== "0" && raw !== "false";
  } catch {
    return true;
  }
}

export function setRememberMePreference(remember: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0");
    if (remember) {
      window.sessionStorage.removeItem(SESSION_ALIVE_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_ALIVE_KEY, "1");
    }
  } catch {
    /* private mode / quota */
  }
}

export function markEphemeralSessionAlive(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_ALIVE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isEphemeralSessionAlive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_ALIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isAuthStorageKey(key: string): boolean {
  return (
    key.includes("auth-token") ||
    key.includes("supabase.auth") ||
    (key.startsWith("sb-") && key.includes("-auth-"))
  );
}

export function listAuthStorageKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && isAuthStorageKey(key)) keys.push(key);
    }
  } catch {
    /* ignore */
  }
  return keys;
}

export function clearAllAuthStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of listAuthStorageKeys()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && isAuthStorageKey(key)) doomed.push(key);
    }
    for (const key of doomed) window.sessionStorage.removeItem(key);
    window.sessionStorage.removeItem(SESSION_ALIVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Safe metadata for diagnostics — never includes tokens. */
export function getAuthPersistenceSnapshot(): {
  rememberPreference: boolean;
  storageBackend: "localStorage";
  authStorageKeyExists: boolean;
  authStorageKeys: string[];
  ephemeralAlive: boolean;
  hasRefreshToken: boolean;
} {
  const keys = listAuthStorageKeys();
  let hasRefreshToken = false;
  if (typeof window !== "undefined") {
    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as { refresh_token?: unknown };
        if (typeof parsed?.refresh_token === "string" && parsed.refresh_token.length > 0) {
          hasRefreshToken = true;
          break;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return {
    rememberPreference: getRememberMePreference(),
    storageBackend: "localStorage",
    authStorageKeyExists: keys.length > 0,
    authStorageKeys: keys,
    ephemeralAlive: isEphemeralSessionAlive(),
    hasRefreshToken,
  };
}

/**
 * After Remember-me login: prove session landed in localStorage (dev logs only).
 */
export function assertRememberMePersisted(): boolean {
  const snap = getAuthPersistenceSnapshot();
  logAuthDebug("persist.assert", {
    rememberPreference: snap.rememberPreference,
    storageBackend: snap.storageBackend,
    authStorageKeyExists: snap.authStorageKeyExists,
    authStorageKeys: snap.authStorageKeys,
    ephemeralAlive: snap.ephemeralAlive,
    hasRefreshToken: snap.hasRefreshToken,
  });
  if (!snap.rememberPreference) return true;
  return snap.authStorageKeyExists && snap.hasRefreshToken;
}

/**
 * On boot: if Remember me is OFF and the browser session marker is gone,
 * wipe auth so a prior localStorage session cannot outlive the browser.
 */
export function enforceEphemeralSessionPolicy(): boolean {
  if (typeof window === "undefined") return false;
  if (getRememberMePreference()) return false;
  if (isEphemeralSessionAlive()) return false;
  const hadAuth = listAuthStorageKeys().length > 0;
  if (hadAuth) {
    logAuthDebug("persist.ephemeralClear", {
      reason: "remember_off_and_browser_session_ended",
      authStorageKeyExists: true,
    });
    clearAllAuthStorage();
  }
  return hadAuth;
}

/**
 * After login / preference change: migrate any legacy sessionStorage auth
 * copies into localStorage and set the ephemeral marker when needed.
 */
export function persistAuthSessionToPreferredStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && isAuthStorageKey(key)) doomed.push(key);
    }
    for (const key of doomed) {
      const value = window.sessionStorage.getItem(key);
      if (value && !window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, value);
      }
      window.sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
  if (!getRememberMePreference()) {
    markEphemeralSessionAlive();
  }
  logAuthDebug("persist.migrate", getAuthPersistenceSnapshot());
}

/** @deprecated */
export const migrateAuthSessionToPreferredStorage = persistAuthSessionToPreferredStorage;

/**
 * Authoritative Supabase browser storage: always native localStorage.
 * Full Storage interface — GoTrue expects a real Storage-like object.
 * Never falls back to memory (that was the production logout bug).
 */
export const authSessionStorage: Storage = {
  get length() {
    if (typeof window === "undefined") return 0;
    try {
      return window.localStorage.length;
    } catch {
      return 0;
    }
  },
  clear() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
  },
  key(index: number) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.key(index);
    } catch {
      return null;
    }
  },
  getItem(key: string) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
      if (isAuthStorageKey(key)) {
        try {
          window.sessionStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      logAuthDebug("persist.setItemFailed", {
        keyIsAuth: isAuthStorageKey(key),
        errorName: err instanceof Error ? err.name : "unknown",
      });
      throw err;
    }
  },
  removeItem(key: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
