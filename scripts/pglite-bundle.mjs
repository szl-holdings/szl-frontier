// SPDX-License-Identifier: Apache-2.0
/**
 * Nitro/Vercel server-private PGlite artifact binding.
 *
 * PGlite's packed library references three binary resources relative to the
 * compiled `electric-sql__pglite.mjs`. Nitro 3 does not copy them into _libs
 * for this preset. Stage only these vendor-exported bytes and verify hashes.
 * This is build integrity, not supply-chain trust or runtime readiness.
 */
import { createHash } from "node:crypto";
import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const PGLITE_BINARIES = Object.freeze(["pglite.data", "pglite.wasm", "initdb.wasm"]);
export const PGLITE_BUNDLE_SCHEMA = "szl.pglite.server-private-artifacts/v1";

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function checkedBytes(path, name) {
  const bytes = await readFile(path);
  if (bytes.byteLength < 1 || bytes.byteLength > 32 * 1024 * 1024) {
    throw new Error(`Invalid PGlite binary size: ${name}`);
  }
  return bytes;
}

/**
 * Purely filesystem-scoped build operation. sourceDir must be the package's
 * exported dist directory, destinationDir the generated private Nitro _libs.
 */
export async function bindPgliteBinaries({ sourceDir, destinationDir, verifyOnly = false }) {
  // The generated function layout must exist even if optional PGlite is shaken out.
  const moduleFiles = await readdir(destinationDir);
  const modulePath = join(destinationDir, "electric-sql__pglite.mjs");
  let moduleSource;
  try {
    moduleSource = await readFile(modulePath, "utf8");
  } catch (error) {
    // Nitro tree-shakes the optional PGlite backend if no server handler uses it.
    // In that case its binary resources are not required by the built function.
    if (error && error.code === "ENOENT") {
      if (moduleFiles.some((name) => /pglite|electric-sql/i.test(name))) {
        throw new Error("Unexpected PGlite bundle layout; refusing to skip asset binding", { cause: error });
      }
      return {
        schema: PGLITE_BUNDLE_SCHEMA,
        applicable: false,
        reason: "PGLITE_SERVER_MODULE_NOT_BUNDLED",
        artifacts: [],
        publicAsset: false,
        productionAuthorized: false,
        runtimeVerified: false,
      };
    }
    throw error;
  }
  for (const name of PGLITE_BINARIES) {
    if (!moduleSource.includes(name)) {
      throw new Error(`Built server PGlite module has no reference to ${name}`);
    }
  }

  const records = [];
  for (const name of PGLITE_BINARIES) {
    const original = await checkedBytes(join(sourceDir, name), name);
    const output = join(destinationDir, name);
    if (!verifyOnly) {
      // The output is a freshly generated private server function, not public/.
      await copyFile(join(sourceDir, name), output);
    }
    const staged = await checkedBytes(output, name);
    if (staged.byteLength !== original.byteLength || digest(staged) !== digest(original)) {
      throw new Error(`Staged PGlite artifact does not match its package bytes: ${name}`);
    }
    records.push({ name, bytes: original.byteLength, sha256: digest(original) });
  }
  const report = {
    schema: PGLITE_BUNDLE_SCHEMA,
    applicable: true,
    serverModuleSha256: digest(Buffer.from(moduleSource, "utf8")),
    artifacts: records,
    publicAsset: false,
    productionAuthorized: false,
    runtimeVerified: false,
  };
  const manifest = join(destinationDir, "pglite-server-assets.json");
  if (verifyOnly) {
    const observed = JSON.parse(await readFile(manifest, "utf8"));
    if (JSON.stringify(observed) !== JSON.stringify(report)) {
      throw new Error("PGlite build manifest does not match source/bundle");
    }
  } else {
    await writeFile(manifest, JSON.stringify(report, null, 2) + "\n", { flag: "w" });
  }
  return report;
}
