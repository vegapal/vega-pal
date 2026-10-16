import type { BackendModule } from "i18next";
import { isSupportedLanguage } from "./languages";
import { I18N_NAMESPACES } from "./namespaces";

/** Also serves React's namespace requests when a hydrated route skips beforeLoad. */
export const localeBackend: BackendModule = {
  type: "backend",
  init() {},
  read(language, namespace, callback) {
    if (!isSupportedLanguage(language) || !I18N_NAMESPACES.some((ns) => ns === namespace)) {
      callback(new Error("Unsupported translation bundle."), null);
      return;
    }
    void import(`../../../locales/${language}/${namespace}.json`).then(
      (bundle) => callback(null, bundle.default),
      (error) => callback(error, null),
    );
  },
};
