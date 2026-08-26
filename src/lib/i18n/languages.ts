export const LANGUAGE_STORAGE_KEY = "vegapal-language";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "zh", label: "简体中文", flag: "🇨🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === value);
}

export function getStoredLanguage(): SupportedLanguage | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored && isSupportedLanguage(stored) ? stored : null;
}

export function persistLanguage(code: SupportedLanguage) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
}
