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

function activeBackend(): StorageLike {
  if (typeof window === "undefined") return memoryStorage;
  try {
    return getRememberMePreference() ? window.localStorage : window.sessionStorage;
  } catch {
    return memoryStorage;
  }
}

/**
 * Supabase auth storage:
 * - Remember me on → localStorage (survives browser restart)
 * - Remember me off → sessionStorage (cleared when browser closes)
 * - removeItem clears both so Sign out / preference flips never leave a stale session
 */
export const authSessionStorage: StorageLike = {
  getItem(key) {
    const backend = activeBackend();
    const value = backend.getItem(key);
    if (value != null) return value;
    // Prefer active backend; if empty and remember is off, do not fall back to localStorage.
    if (!getRememberMePreference() && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    return null;
  },
  setItem(key, value) {
    const remember = getRememberMePreference();
    if (typeof window !== "undefined") {
      try {
        if (remember) {
          window.sessionStorage.removeItem(key);
          window.localStorage.setItem(key, value);
        } else {
          window.localStorage.removeItem(key);
          window.sessionStorage.setItem(key, value);
        }
        return;
      } catch {
        /* fall through */
      }
    }
    activeBackend().setItem(key, value);
  },
  removeItem(key) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    memoryStorage.removeItem(key);
  },
};
