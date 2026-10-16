/** Run the offline TypeScript harness with the installed compiler; no npx download. */
import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith("@/") ||
      (specifier.startsWith(".") && context.parentURL?.startsWith("file:"))
    ) {
      const candidate = specifier.startsWith("@/")
        ? resolve(root, "src", specifier.slice(2))
        : fileURLToPath(new URL(specifier, context.parentURL));
      for (const suffix of ["", ".ts", ".tsx", ".js", "/index.ts"]) {
        if (existsSync(candidate + suffix) && (extname(candidate + suffix) || suffix)) {
          return { url: pathToFileURL(candidate + suffix).href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) {
      const filename = fileURLToPath(url);
      const output = ts.transpileModule(readFileSync(filename, "utf8"), {
        fileName: filename,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
        },
      });
      return { format: "module", source: output.outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const harness = process.argv[2] ?? "./test-monitoring.harness.ts";
if (
  ![
    "./test-monitoring.harness.ts",
    "./test-notification-delivery.harness.ts",
    "./test-analytics-security.harness.ts",
  "./test-visit-tracker.mjs",
  ].includes(harness)
) {
  throw new Error("Unknown offline harness");
}
await import(new URL(harness, import.meta.url).href);
