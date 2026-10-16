import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  isSupportedLanguage,
  persistLanguage,
  SUPPORTED_LANGUAGES,
} from "./languages";
import { BOOTSTRAP_NAMESPACES } from "./namespaces";
import { localeBackend } from "./locale-backend";

import enCommon from "../../../locales/en/common.json";
import enLanding from "../../../locales/en/landing.json";
import enAuth from "../../../locales/en/auth.json";

export { I18N_NAMESPACES, type I18nNamespace } from "./namespaces";

const resources = {
  en: {
    common: enCommon,
    landing: enLanding,
    auth: enAuth,
  },
} as const;

export const i18nReady = i18n.use(localeBackend).use(initReactI18next).init({
  resources,
  partialBundledLanguages: true,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
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
