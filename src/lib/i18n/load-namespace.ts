import i18n, { i18nReady } from "./index";
import { DEFAULT_LANGUAGE } from "./languages";
import type { I18nNamespace } from "./namespaces";

export { BOOTSTRAP_NAMESPACES } from "./namespaces";

export function hasNamespaceResources(namespace: I18nNamespace) {
  return i18n.hasResourceBundle(i18n.language, namespace) ||
    i18n.hasResourceBundle(DEFAULT_LANGUAGE, namespace);
}

export async function ensureNamespacesLoaded(namespaces: I18nNamespace[]) {
  await i18nReady;
  // i18next tracks bundles by language and namespace, including English fallback.
  // Its returned promise resolves even on backend errors, so use the callback.
  await new Promise<void>((resolve, reject) => {
    void i18n.loadNamespaces(namespaces, (error) => {
      if (error) reject(error);
      else if (namespaces.some((ns) => !hasNamespaceResources(ns))) {
        reject(new Error("Required translations are unavailable."));
      } else resolve();
    });
  });
}
