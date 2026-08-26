/**
 * Auth session persistence for VegaPal.
 *
 * Remember me ON  → localStorage (survives tab + browser close)
 * Remember me OFF → sessionStorage (cleared when the browser session ends)
 *
 * Critical rules:
 * - Never delete a valid localStorage session during boot/getItem
 * - Always recover from the other backend if the preferred one is empty
 * - Sign out clears both backends
 */

export const REMEMBER_ME_KEY = "vegapal_remember_me";

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
  } catch {
    /* private mode / quota */
  }
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const memory = new Map<string, string>();
const memoryStorage: StorageLike = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => {
    memory.set(k, v);
  },
  removeItem: (k) => {
    memory.delete(k);
  },
};

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function isAuthStorageKey(key: string): boolean {
  return (
    key.includes("auth-token") ||
    key.includes("supabase.auth") ||
    (key.startsWith("sb-") && key.includes("-auth-"))
  );
}

function listAuthKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys = new Set<string>();
  const scan = (storage: Storage) => {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && isAuthStorageKey(key)) keys.add(key);
      }
    } catch {
      /* ignore */
    }
  };
  scan(window.localStorage);
  scan(window.sessionStorage);
  return [...keys];
}

/**
 * After login / preference change: ensure the Supabase session payload
 * lives only in the backend that matches Remember me.
 */
export function persistAuthSessionToPreferredStorage(): void {
  if (typeof window === "undefined") return;
  const remember = getRememberMePreference();
  for (const key of listAuthKeys()) {
    const localValue = safeGet(window.localStorage, key);
    const sessionValue = safeGet(window.sessionStorage, key);
    const value = remember ? localValue ?? sessionValue : sessionValue ?? localValue;
    if (value == null) continue;
    if (remember) {
      safeSet(window.localStorage, key, value);
      safeRemove(window.sessionStorage, key);
    } else {
      safeSet(window.sessionStorage, key, value);
      safeRemove(window.localStorage, key);
    }
  }
}

/** @deprecated use persistAuthSessionToPreferredStorage */
export const migrateAuthSessionToPreferredStorage = persistAuthSessionToPreferredStorage;

/**
 * Supabase-compatible storage adapter.
 * Writes go to the preferred backend; reads recover from either.
 */
export const authSessionStorage: StorageLike = {
  getItem(key) {
    if (typeof window === "undefined") return memoryStorage.getItem(key);

    const remember = getRememberMePreference();
    const preferred = remember ? window.localStorage : window.sessionStorage;
    const other = remember ? window.sessionStorage : window.localStorage;

    const preferredValue = safeGet(preferred, key);
    if (preferredValue != null) return preferredValue;

    const otherValue = safeGet(other, key);
    if (otherValue != null) {
      // Recover without destroying the source if the write fails.
      if (safeSet(preferred, key, otherValue)) {
        safeRemove(other, key);
      }
      return otherValue;
    }
    return null;
  },

  setItem(key, value) {
    if (typeof window === "undefined") {
      memoryStorage.setItem(key, value);
      return;
    }
    const remember = getRememberMePreference();
    if (remember) {
      if (!safeSet(window.localStorage, key, value)) {
        memoryStorage.setItem(key, value);
        return;
      }
      safeRemove(window.sessionStorage, key);
      return;
    }
    if (!safeSet(window.sessionStorage, key, value)) {
      memoryStorage.setItem(key, value);
      return;
    }
    safeRemove(window.localStorage, key);
  },

  removeItem(key) {
    if (typeof window !== "undefined") {
      safeRemove(window.localStorage, key);
      safeRemove(window.sessionStorage, key);
    }
    memoryStorage.removeItem(key);
  },
};
