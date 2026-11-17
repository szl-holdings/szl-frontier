// SPDX-License-Identifier: Apache-2.0
/** Fail-closed post-build staging/verification for private Nitro PGlite assets. */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bindPgliteBinaries } from "./pglite-bundle.mjs";

const options = process.argv.slice(2);
if (options.length > 1 || (options.length === 1 && options[0] !== "--verify-only")) {
  console.error("Usage: node scripts/stage-pglite-bundle.mjs [--verify-only]");
  process.exitCode = 2;
} else {
  const project = dirname(dirname(fileURLToPath(import.meta.url)));
  const packageExport = import.meta.resolve("@electric-sql/pglite/pglite.data");
  const sourceDir = dirname(fileURLToPath(packageExport));
  const destinationDir = join(project, ".vercel", "output", "functions", "__server.func", "_libs");
  try {
    const report = await bindPgliteBinaries({
      sourceDir, destinationDir, verifyOnly: options.includes("--verify-only"),
    });
    console.log(JSON.stringify({
      state: report.applicable ? "BUILD_ASSETS_BOUND" : "OPTIONAL_BACKEND_NOT_BUNDLED",
      reason: report.reason ?? null,
      schema: report.schema,
      artifacts: report.artifacts,
      productionAuthorized: report.productionAuthorized,
      runtimeVerified: report.runtimeVerified,
    }));
  } catch (error) {
    console.error("PGlite build asset binding FAILED:", error instanceof Error ? error.message : "UNKNOWN");
    process.exitCode = 2;
  }
}
