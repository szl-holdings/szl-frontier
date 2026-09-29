/**
 * Test-only module resolution for `node --experimental-strip-types --test`.
 *
 * Loaded with `--import ./scripts/ts-test-alias.mjs`. It maps the `@/` alias
 * from tsconfig.json's `paths` onto `src/`, and lets extensionless imports made
 * from files under `src/` resolve to their `.ts` / `.tsx` / `index.ts` source,
 * the way Vite and `moduleResolution: "bundler"` already do. Nothing outside
 * `src/` changes: node_modules and absolute specifiers go to Node untouched.
 *
 * It uses only `node:module`'s `register()` (Node >= 20.6), so it adds no
 * dependency. It never rewrites source and has no effect on the build.
 */
import { existsSync, statSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isMainThread } from "node:worker_threads";

const SRC_URL = new URL("../src/", import.meta.url);
const SRC_PATH = fileURLToPath(SRC_URL);
const PROBES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function probe(baseUrl) {
  const basePath = fileURLToPath(baseUrl);
  for (const suffix of PROBES) {
    if (isFile(basePath + suffix)) return pathToFileURL(basePath + suffix).href;
  }
  return null;
}

/** @type {import("node:module").ResolveHook} */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const hit = probe(new URL(specifier.slice(2), SRC_URL));
    if (hit) return { url: hit, shortCircuit: true };
    return nextResolve(specifier, context);
  }
  const parentPath = context.parentURL?.startsWith("file:")
    ? fileURLToPath(context.parentURL)
    : null;
  const fromSrc = parentPath !== null && parentPath.startsWith(SRC_PATH);
  if (fromSrc && (specifier.startsWith("./") || specifier.startsWith("../"))) {
    const hit = probe(new URL(specifier, context.parentURL));
    if (hit) return { url: hit, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

// Imported via `--import` on the main thread: register this same file as the
// resolve hook. Node then loads it again on its hooks thread, where it only
// needs to export `resolve`, so registration is skipped there.
if (isMainThread) register(import.meta.url);
