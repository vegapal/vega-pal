/** Auth session storage with Remember me support. */

export const REMEMBER_ME_STORAGE_KEY = "vegapal_remember_me";

export function getRememberMePreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY);
    if (raw === null) return true; // default checked
    return raw !== "0" && raw !== "false";
  } catch {
    return true;
  }
}

export function setRememberMePreference(remember: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, remember ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const memoryStore = new Map<string, string>();
const memoryStorage: StorageLike = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => {
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    memoryStore.delete(key);
  },
};

function readRaw(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(storage: Storage, key: string, value: string): void {
  storage.setItem(key, value);
}

function removeRaw(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Move an auth session payload into the storage backend that matches the
 * current Remember me preference. Safe to call after login / preference flips.
 */
export function migrateAuthSessionToPreferredStorage(storageKey?: string): void {
  if (typeof window === "undefined") return;
  const discovered = new Set<string>();
  const collect = (storage: Storage) => {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        if (
          key.includes("auth-token") ||
          key.includes("supabase.auth") ||
          key.startsWith("sb-")
        ) {
          discovered.add(key);
        }
      }
    } catch {
      /* ignore */
    }
  };
  collect(window.localStorage);
  collect(window.sessionStorage);
  if (storageKey) discovered.add(storageKey);

  const remember = getRememberMePreference();
  for (const key of discovered) {
    const fromLocal = readRaw(window.localStorage, key);
    const fromSession = readRaw(window.sessionStorage, key);
    const value = remember ? fromLocal ?? fromSession : fromSession ?? fromLocal;
    if (value == null) continue;
    try {
      if (remember) {
        writeRaw(window.localStorage, key, value);
        removeRaw(window.sessionStorage, key);
      } else {
        writeRaw(window.sessionStorage, key, value);
        removeRaw(window.localStorage, key);
      }
    } catch {
      /* ignore quota / private mode */
    }
  }
}

/**
 * Supabase auth storage:
 * - Remember me on → localStorage (survives browser restart)
 * - Remember me off → sessionStorage (cleared when browser closes)
 * - getItem never destroys the other backend merely because it is empty
 * - removeItem clears both so Sign out never leaves a stale session
 */
export const authSessionStorage: StorageLike = {
  getItem(key) {
    if (typeof window === "undefined") return memoryStorage.getItem(key);

    const remember = getRememberMePreference();
    try {
      const preferred = remember ? window.localStorage : window.sessionStorage;
      const fallback = remember ? window.sessionStorage : window.localStorage;
      const preferredValue = readRaw(preferred, key);
      if (preferredValue != null) return preferredValue;

      const fallbackValue = readRaw(fallback, key);
      if (fallbackValue != null) {
        // Recover + migrate so the next restart uses the correct backend.
        try {
          writeRaw(preferred, key, fallbackValue);
          removeRaw(fallback, key);
        } catch {
          /* still return the recovered value */
        }
        return fallbackValue;
      }
    } catch {
      return memoryStorage.getItem(key);
    }
    return null;
  },
  setItem(key, value) {
    const remember = getRememberMePreference();
    if (typeof window !== "undefined") {
      try {
        if (remember) {
          writeRaw(window.localStorage, key, value);
          removeRaw(window.sessionStorage, key);
        } else {
          writeRaw(window.sessionStorage, key, value);
          removeRaw(window.localStorage, key);
        }
        return;
      } catch {
        /* fall through to memory */
      }
    }
    memoryStorage.setItem(key, value);
  },
  removeItem(key) {
    if (typeof window !== "undefined") {
      removeRaw(window.localStorage, key);
      removeRaw(window.sessionStorage, key);
    }
    memoryStorage.removeItem(key);
  },
};
