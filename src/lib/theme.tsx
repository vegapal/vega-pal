import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark";
export type ThemePreference = "system" | "light" | "dark";

const KEY = "vegapal:theme";

export function resolveThemePreference(pref: ThemePreference): Theme {
  if (typeof window === "undefined") return "light";
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(KEY);
  if (stored === "system" || stored === "light" || stored === "dark") return stored;
  return "system";
}

/** @deprecated use getStoredThemePreference + resolveThemePreference */
export function getInitialTheme(): Theme {
  return resolveThemePreference(getStoredThemePreference());
}

export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
}

export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<Theme>("light");

  const applyPreference = useCallback((pref: ThemePreference) => {
    const next = resolveThemePreference(pref);
    setResolved(next);
    applyTheme(next);
  }, []);

  useEffect(() => {
    const pref = getStoredThemePreference();
    setPreferenceState(pref);
    applyPreference(pref);
  }, [applyPreference]);

  useEffect(() => {
    if (preference !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyPreference("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, applyPreference]);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, pref);
    applyPreference(pref);
  };

  return { preference, resolvedTheme: resolved, setPreference };
}

export function useTheme() {
  const { resolvedTheme, setPreference, preference } = useThemePreference();
  return {
    theme: resolvedTheme,
    preference,
    setTheme: (t: Theme) => setPreference(t),
    setPreference,
    toggle: () => setPreference(resolvedTheme === "dark" ? "light" : "dark"),
  };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export const THEME_INIT_SCRIPT = `(function(){try{var k='vegapal:theme';var s=localStorage.getItem(k);var d;if(s==='dark')d=true;else if(s==='light')d=false;else d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
