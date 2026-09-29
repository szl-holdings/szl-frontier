import assert from "node:assert/strict";
import test from "node:test";
import { EMBED_REVISION } from "../covenant/index-engine.ts";
import { GROK_MODEL_ID, GROK_MODEL_LABEL } from "../ai/grok-model.ts";
import { MODELS, routeModel } from "./registry.ts";

// registry.ts imports through the `@/` alias, so this file runs under
// `--import ./scripts/ts-test-alias.mjs` (see package.json "test:ts").

const RETIRED_GROK = "grok-4.5";

test("the one active reasoner is the pinned Grok id, not a second copy of it", () => {
  const active = MODELS.filter((m) => m.kind === "reasoner" && m.status === "active");
  assert.equal(active.length, 1);
  assert.equal(active[0].id, GROK_MODEL_ID);
  assert.equal(active[0].revision, GROK_MODEL_ID);
  assert.equal(active[0].name, GROK_MODEL_LABEL);
});

test("grok-4.5 stays listed as retired and is never the active pin", () => {
  assert.notEqual(GROK_MODEL_ID, RETIRED_GROK);
  const prior = MODELS.filter((m) => m.id === RETIRED_GROK);
  assert.equal(prior.length, 1);
  assert.equal(prior[0].status, "retired");
  assert.equal(prior[0].kind, "reasoner");
});

test("model ids are unique", () => {
  const ids = MODELS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("expand routes to the pinned Grok id and refuses the retired one", () => {
  const pinned = routeModel({
    task: "expand",
    requestedModel: GROK_MODEL_ID,
    embedRevision: EMBED_REVISION,
  });
  assert.equal(pinned.allowed, true);
  assert.equal(pinned.selected?.id, GROK_MODEL_ID);

  const retired = routeModel({
    task: "expand",
    requestedModel: RETIRED_GROK,
    embedRevision: EMBED_REVISION,
  });
  assert.equal(retired.allowed, false);
  assert.equal(retired.selected?.id, RETIRED_GROK);
  assert.equal(retired.reason, "retired model cannot serve");
});

test("unknown models fail closed", () => {
  const unknown = routeModel({
    task: "expand",
    requestedModel: "grok-unpinned",
    embedRevision: EMBED_REVISION,
  });
  assert.deepEqual(unknown, { allowed: false, selected: null, reason: "unknown model" });
});
