import i18n, { i18nReady } from "./index";
import { I18N_NAMESPACES } from "./namespaces";
import type { SupportedLanguage } from "./languages";

export function isLanguageBundleLoaded(lng: SupportedLanguage) {
  return I18N_NAMESPACES.every((ns) => i18n.hasResourceBundle(lng, ns));
}

export async function ensureLanguageLoaded(lng: SupportedLanguage) {
  await i18nReady;
  if (isLanguageBundleLoaded(lng)) return;

  const bundles = await Promise.all(
    I18N_NAMESPACES.filter((ns) => !i18n.hasResourceBundle(lng, ns)).map(async (ns) => {
      const mod = await import(`../../../locales/${lng}/${ns}.json`);
      return [ns, mod.default] as const;
    }),
  );

  for (const [ns, data] of bundles) {
    i18n.addResourceBundle(lng, ns, data, true, true);
  }
}
