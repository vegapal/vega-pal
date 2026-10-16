/** Runtime lazy-translation regression. No browser, accounts, env files or network requests. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider, useTranslation } from "react-i18next";
import { createServer } from "vite";

const en = JSON.parse(readFileSync("locales/en/admin.json", "utf8"));
const ar = JSON.parse(readFileSync("locales/ar/admin.json", "utf8"));

function Labels() {
  const { t, ready } = useTranslation("admin");
  return createElement("p", null, ready
    ? `${t("dashboard.title")} | ${t("audience.title")}`
    : "Loading translations");
}

function renderLabels(i18n) {
  return renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(Labels)));
}

function hookNamespaceRequest(i18n) {
  // This is react-i18next's non-Suspense effect path, without route beforeLoad.
  return new Promise((resolve, reject) => {
    void i18n.loadNamespaces(["admin"], (error) => error ? reject(error) : resolve());
  });
}

async function freshApp(run, immediate = false) {
  // Vite evaluates the real TS modules and JSON imports, as in the app bundle.
  // Disable the project's config/plugins, env files, listeners and browser HMR.
  const server = await createServer({
    configFile: false, envFile: false, envDir: false,
    appType: "custom", logLevel: "error",
    server: { middlewareMode: true, hmr: false },
    plugins: [{
      name: "immediate-namespace-regression",
      resolveId(id) { if (id === "virtual:immediate-namespace") return "\0immediate-namespace"; },
      load(id) {
        if (id === "\0immediate-namespace") return `
          import { ensureNamespacesLoaded } from '/src/lib/i18n/load-namespace.ts';
          export const firstNamespaceRequest = ensureNamespacesLoaded(['admin']);
        `;
      },
    }],
  });
  try {
    if (immediate) {
      const { firstNamespaceRequest } = await server.ssrLoadModule("virtual:immediate-namespace");
      await firstNamespaceRequest;
    }
    const { default: i18n } = await server.ssrLoadModule("/src/lib/i18n/index.ts");
    const namespaces = await server.ssrLoadModule("/src/lib/i18n/load-namespace.ts");
    const locales = await server.ssrLoadModule("/src/lib/i18n/load-locale.ts");
    const { localeBackend } = await server.ssrLoadModule("/src/lib/i18n/locale-backend.ts");
    assert.equal(i18n.isInitialized, true);
    await run({ i18n, namespaces, locales, localeBackend });
  } finally {
    await server.close();
  }
}

await freshApp(async ({ i18n, namespaces, localeBackend }) => {
  assert.equal(i18n.hasResourceBundle("en", "admin"), false);
  assert.equal(i18n.hasLoadedNamespace("admin"), false,
    "fresh hydrated client must request missing admin translations");
  assert.equal(renderLabels(i18n), "<p>Loading translations</p>");

  const originalRead = localeBackend.read;
  let adminReads = 0;
  localeBackend.read = (language, namespace, callback) => {
    if (language === "en" && namespace === "admin") adminReads++;
    originalRead(language, namespace, callback);
  };
  try {
    await Promise.all([hookNamespaceRequest(i18n), hookNamespaceRequest(i18n)]);
    assert.equal(adminReads, 1, "concurrent hook requests share one bundle load");
    assert.equal(renderLabels(i18n), `<p>${en.dashboard.title} | ${en.audience.title}</p>`);
    assert.equal(i18n.t("audience.metrics.uniqueVisitors", { ns: "admin" }), en.audience.metrics.uniqueVisitors);
  } finally {
    localeBackend.read = originalRead;
  }
  console.log("PASS direct-load English admin hook readiness, actual lazy JSON loading and concurrent requests");

  localeBackend.read = (language, namespace, callback) => {
    if (namespace === "settings") callback(new Error("Simulated unavailable bundle."), null);
    else originalRead(language, namespace, callback);
  };
  try {
    await assert.rejects(() => namespaces.ensureNamespacesLoaded(["settings"]));
    await assert.rejects(() => namespaces.ensureNamespacesLoaded(["settings"]));
    assert.equal(i18n.hasResourceBundle("en", "settings"), false);
  } finally {
    localeBackend.read = originalRead;
  }
  console.log("PASS failed lazy bundles reject route loading, including a repeated request");
});

await freshApp(async ({ i18n, namespaces, locales }) => {
  await locales.ensureLanguageLoaded("ar");
  assert.equal(i18n.hasResourceBundle("en", "admin"), false,
    "loading Arabic must not mark English admin loaded");
  assert.equal(locales.isLanguageBundleLoaded("en"), false);
  await i18n.changeLanguage("ar");
  assert.equal(renderLabels(i18n), `<p>${ar.dashboard.title} | ${ar.audience.title}</p>`);

  await locales.ensureLanguageLoaded("en");
  await i18n.changeLanguage("en");
  await Promise.all([namespaces.ensureNamespacesLoaded(["admin"]), namespaces.ensureNamespacesLoaded(["admin"])]);
  assert.equal(renderLabels(i18n), `<p>${en.dashboard.title} | ${en.audience.title}</p>`);
  assert.equal(locales.isLanguageBundleLoaded("en"), true);

  await i18n.changeLanguage("ar");
  assert.equal(renderLabels(i18n), `<p>${ar.dashboard.title} | ${ar.audience.title}</p>`);
  await i18n.changeLanguage("en");
  assert.equal(renderLabels(i18n), `<p>${en.dashboard.title} | ${en.audience.title}</p>`);

  i18n.addResourceBundle("en", "admin", { runtimeFallbackProbe: "English fallback" }, true, true);
  await i18n.changeLanguage("ar");
  assert.equal(i18n.t("runtimeFallbackProbe", { ns: "admin" }), "English fallback");
  console.log("PASS Arabic-first to English, English/Arabic round trips and English fallback");
});

await freshApp(async ({ i18n, namespaces, localeBackend }) => {
  const originalRead = localeBackend.read;
  localeBackend.read = (language, namespace, callback) => {
    if (namespace === "admin") callback(new Error("Simulated unavailable admin bundle."), null);
    else originalRead(language, namespace, callback);
  };
  try {
    await assert.rejects(() => hookNamespaceRequest(i18n));
    assert.equal(i18n.hasLoadedNamespace("admin"), true,
      "i18next settles failed requests as ready, so readiness alone is insufficient");
    assert.equal(namespaces.hasNamespaceResources("admin"), false,
      "the admin outlet must remain gated without actual translations");
  } finally {
    localeBackend.read = originalRead;
  }
  console.log("PASS failed hook-only admin load remains gated without actual resources");
});

// A new app models the full-page Try again action; failed backend state belongs
// to the old i18next connector and must not be retained across that retry.
await freshApp(async ({ i18n, namespaces }) => {
  assert.equal(i18n.isInitialized, true);
  assert.equal(namespaces.hasNamespaceResources("admin"), true);
  assert.equal(renderLabels(i18n), `<p>${en.dashboard.title} | ${en.audience.title}</p>`);
  console.log("PASS full-page retry and immediate namespace request wait for initialization and recover");
}, true);

console.log("All runtime translation regressions passed.");
