import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const projection = JSON.parse(readFileSync(resolve(root, "public/szl/PROJECTION.json"), "utf8"));
const exactAssets = {
  "public/favicon.svg": "6e2dc7c9794dc452fbccb44ffadbd168c2584361904e8bcaeba542427d9e1a3a",
  "public/szl/szl-tokens.css": "81f7c9baeef0b435e6e3f9d0c4e0d70e40fa17df5d1f30697f623cd3ef5f8eab",
  "public/szl/SOURCE.json": "967a77235227f1d75852fb61873e46336e67403cbc0e7e12b141e31c83fbd93d",
  "public/szl/szl-icon-32.svg": "6e2b7d72a3af3d9602b79de41df0194ede6496a9661f057108ec224c0efc92e6",
  "public/__grok/icon-180.png": "ddeb873e960f14c41078d82cad4f7bb5a40dca555867ac3c3fb869ce46bbef6c",
};

test("native assets are the exact admitted bytes, with an explicit subset projection", () => {
  assert.equal(projection.repository, "https://github.com/szl-holdings/szl-brand");
  assert.equal(projection.bundle_revision, "4309f6fce89179331b0b3ed8c99494e76c5be256");
  assert.equal(projection.qualified_token_source_revision, "27d12e77fc0f9f1a0e5fae8b34adf2380d51d070");
  assert.deepEqual(projection.assets.map((a) => a.installed_path).sort(), Object.keys(exactAssets).sort());
  assert.match(projection.qualification, /Unsigned projection metadata/);
  for (const asset of projection.assets) {
    const path = resolve(root, asset.installed_path);
    assert.ok(path.startsWith(root + sep));
    assert.ok(lstatSync(path).isFile());
    const body = readFileSync(path);
    assert.equal(body.length, asset.bytes);
    assert.equal(createHash("sha256").update(body).digest("hex"), exactAssets[asset.installed_path]);
    assert.equal(asset.sha256, exactAssets[asset.installed_path]);
    assert.match(asset.source_revision, /^[a-f0-9]{40}$/);
  }
});

test("the shell loads native tokens before components and retains the checked auth/PWA contracts", () => {
  const rootSource = readFileSync(resolve(root, "src/routes/__root.tsx"), "utf8");
  assert.ok(rootSource.indexOf('/szl/szl-tokens.css?v=81f7c9baeef0') < rootSource.indexOf('href: appCss'));
  assert.match(rootSource, /<AuthProvider>/);
  assert.match(rootSource, /<PreviewHostBridge \/>/);
  assert.match(rootSource, /href: "\/__grok\/manifest.webmanifest"/);
  assert.match(rootSource, /href: "\/__grok\/icon-180.png"/);
  const mark = readFileSync(resolve(root, "src/components/mark.tsx"), "utf8");
  assert.match(mark, /src="\/szl\/szl-icon-32.svg\?v=6e2b7d72a3af"/);
  assert.doesNotMatch(mark, /<(?:svg|path|rect|circle)\b/);
});

test("reduced motion cannot start a universal first-frame layout transition", () => {
  const css = readFileSync(resolve(root, "src/styles.css"), "utf8");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /animation: none !important; transition: none !important; scroll-behavior: auto !important/);
  assert.doesNotMatch(reduced, /(?:animation|transition)-duration:\s*0?\.0*1ms/);
});
