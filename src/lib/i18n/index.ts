import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  isSupportedLanguage,
  persistLanguage,
} from "./languages";
import { BOOTSTRAP_NAMESPACES } from "./load-namespace";

import enCommon from "../../../locales/en/common.json";
import enLanding from "../../../locales/en/landing.json";
import enAuth from "../../../locales/en/auth.json";
import { markNamespacesLoaded } from "./load-namespace";

export const I18N_NAMESPACES = [
  "common",
  "landing",
  "auth",
  "dashboard",
  "invoices",
  "settings",
  "admin",
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

const resources = {
  en: {
    common: enCommon,
    landing: enLanding,
    auth: enAuth,
  },
} as const;

markNamespacesLoaded(["auth"]);

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: "common",
  ns: [...BOOTSTRAP_NAMESPACES],
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

if (typeof window !== "undefined") {
  const stored = getStoredLanguage();
  if (stored && stored !== "en" && stored !== i18n.language) {
    void import("./load-locale").then(({ ensureLanguageLoaded }) =>
      ensureLanguageLoaded(stored).then(() => i18n.changeLanguage(stored)),
    );
  }
}

i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  }
  if (isSupportedLanguage(lng)) {
    persistLanguage(lng);
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language;
  document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
}

export default i18n;
