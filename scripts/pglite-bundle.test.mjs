import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bindPgliteBinaries, PGLITE_BUNDLE_SCHEMA, PGLITE_BINARIES } from "./pglite-bundle.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "szl-pglite-bundle-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceDir = join(root, "source");
  const destinationDir = join(root, "private");
  await mkdir(sourceDir);
  await mkdir(destinationDir);
  const modulePath = join(destinationDir, "electric-sql__pglite.mjs");
  await writeFile(modulePath,
    'const a = ["pglite.data", "pglite.wasm", "initdb.wasm"];\n');
  for (const name of PGLITE_BINARIES) {
    await writeFile(join(sourceDir, name), Buffer.from("owned fixture bytes for " + name));
  }
  return { sourceDir, destinationDir, modulePath };
}

test("private copied binary bytes and manifest verify end-to-end", async (t) => {
  const f = await fixture(t);
  const report = await bindPgliteBinaries(f);
  assert.equal(report.schema, PGLITE_BUNDLE_SCHEMA);
  assert.equal(report.publicAsset, false);
  assert.equal(report.productionAuthorized, false);
  assert.equal(report.runtimeVerified, false);
  assert.deepEqual(report.artifacts.map((r) => r.name), PGLITE_BINARIES);
  for (const name of PGLITE_BINARIES) {
    assert.deepEqual(await readFile(join(f.destinationDir, name)), await readFile(join(f.sourceDir, name)));
  }
  assert.deepEqual(await bindPgliteBinaries({ ...f, verifyOnly: true }), report);
});

test("a mismatching private binary fails source-binding even if the module exists", async (t) => {
  const f = await fixture(t);
  await bindPgliteBinaries(f);
  await writeFile(join(f.destinationDir, "pglite.data"), "injected mutation");
  await assert.rejects(bindPgliteBinaries({ ...f, verifyOnly: true }), /does not match/i);
});

test("a missing package binary or built bundle is never staged as a green build", async (t) => {
  const f = await fixture(t);
  await unlink(join(f.sourceDir, "pglite.wasm"));
  await assert.rejects(bindPgliteBinaries(f), /ENOENT/);
  const g = await fixture(t);
  await unlink(g.modulePath);
  const absent = await bindPgliteBinaries(g);
  assert.equal(absent.applicable, false);
  assert.equal(absent.reason, "PGLITE_SERVER_MODULE_NOT_BUNDLED");
  assert.deepEqual(absent.artifacts, []);
});

test("a missing source reference and changed bundle invalidate the manifest", async (t) => {
  const f = await fixture(t);
  await writeFile(f.modulePath, 'const x = "pglite.data";');
  await assert.rejects(bindPgliteBinaries(f), /no reference/i);
  await writeFile(f.modulePath, 'const x = ["pglite.data","pglite.wasm","initdb.wasm"];');
  await bindPgliteBinaries(f);
  await writeFile(f.modulePath, 'const x = ["pglite.data","pglite.wasm","initdb.wasm"]; // changed');
  await assert.rejects(bindPgliteBinaries({ ...f, verifyOnly: true }), /manifest does not match/i);
});

test("verify-only cannot write a missing artifact or forge a passing manifest", async (t) => {
  const f = await fixture(t);
  await assert.rejects(bindPgliteBinaries({ ...f, verifyOnly: true }), /ENOENT/);
  await bindPgliteBinaries(f);
  await unlink(join(f.destinationDir, "pglite-server-assets.json"));
  await assert.rejects(bindPgliteBinaries({ ...f, verifyOnly: true }), /ENOENT/);
});

test("renamed vendor bundle is an unexpected layout, never an accepted skip", async (t) => {
  const f = await fixture(t);
  await rename(f.modulePath, join(f.destinationDir, "electric-sql__pglite-renamed.mjs"));
  await assert.rejects(bindPgliteBinaries(f), /Unexpected PGlite bundle layout/);
});

test("missing generated function directory fails instead of skipping packaging", async (t) => {
  const f = await fixture(t);
  await rm(f.destinationDir, { recursive: true, force: true });
  await assert.rejects(bindPgliteBinaries(f), /ENOENT/);
});
