/**
 * Regression guard for the 2026-09-13 bound-route execution validator wave.
 * Asserts the wave record's own invariants and exercises the structural
 * checker against synthetic fixtures. Offline; no network, provider, or
 * inference calls. Fixtures are synthetic and never claim route existence.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { checkWitnessBundle, parseWitnessJson } from "./frontier-execution-witness-check.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const wave = JSON.parse(readFileSync(join(here, "..", "frontier", "waves", "2026-09-13-bound-route-execution-validator.json"), "utf8"));

const CANON = [
  "routeDescriptor",
  "bindingReceipt",
  "captureAnchor",
  "readoutReceipt",
  "witnessRecord",
  "abstentionRule",
];

const goodBundle = () => ({
  routeDescriptor: { routeName: "synthetic-route", routeId: "synthetic-fixture", routeConfigHash: "a".repeat(64) },
  bindingReceipt: { dsseId: "dsse-fixture-1", reverifiedAtCallTime: true,
    verifiedAt: "2026-09-13T00:00:01Z", routeId: "synthetic-fixture", routeConfigHash: "a".repeat(64) },
  captureAnchor: { receiptId: "capture-fixture-1", configHash: "b".repeat(64), joinedToBindingReceipt: true, bindingReceiptId: "dsse-fixture-1" },
  readoutReceipt: {
    receiptId: "readout-fixture-1", keystoneConformant: true, ordersAfterCapture: true, captureReceipt: "capture-fixture-1",
    readoutMethod: { name: "fixture-method", implementationRevision: "d".repeat(40), parametersHash: "e".repeat(64) },
    coverageMap: { captureConfigHash: "b".repeat(64), layers: ["fixture-layer"], hookPoints: ["fixture-hook"], state: "PARTIAL" },
    dispositionField: { property: "fixture-property", state: "MEASURED", method: "fixture-method", captureReceiptId: "capture-fixture-1", failureCode: null },
    unavailableSemantics: { directedModulation: "UNAVAILABLE", internalReasoning: "UNAVAILABLE", generalization: "UNAVAILABLE" },
  },
  witnessRecord: {
    organ: "synthetic-organ",
    stages: [
      { name: "bind", at: "2026-09-13T00:00:01Z" },
      { name: "capture", at: "2026-09-13T00:00:02Z" },
      { name: "readout", at: "2026-09-13T00:00:03Z" },
    ],
    evidenceUri: "fixture://none", evidenceHash: "c".repeat(64),
  },
  abstentionRule: { onBreakState: "UNVERIFIED", noPartialCredit: true },
  state: "VERIFIED",
});

test("wave declares the house integration-wave schema", () => {
  assert.equal(wave.schema, "szl.frontier.integration-wave.v1");
  assert.equal(wave.sourceOfTruth, "szl-holdings/szl-frontier");
  assert.equal(wave.id, "2026-09-13-bound-route-execution-validator");
});

test("wave is preparation-class, fail-closed, no promotion effect", () => {
  assert.equal(wave.class, "preparation");
  assert.equal(wave.policy.defaultEffect, "hold");
  assert.equal(wave.policy.automaticProductionPromotion, false);
});

test("six contract fields recorded in canonical order", () => {
  assert.deepEqual(wave.validator.sixFieldsCanonicalOrder, CANON);
});

test("validator references the pinned admitted contract", () => {
  assert.equal(wave.validator.contractReference.path, "frontier/waves/2026-09-12-bound-route-execution-contract.json");
  assert.equal(wave.validator.contractReference.pinnedBlob, "f380025ccd02cfb00ab2b0b355034447c40a5a3c");
});

test("synthetic complete bundle passes structurally", () => {
  const v = checkWitnessBundle(goodBundle());
  assert.equal(v.state, "VERIFIED");
});

test("missing field abstains with named code", () => {
  const b = goodBundle();
  delete b.witnessRecord;
  const v = checkWitnessBundle(b);
  assert.equal(v.state, "UNVERIFIED");
  assert.equal(v.failureCode, "MISSING_FIELD");
});

test("out-of-order fields abstain", () => {
  const b = goodBundle();
  const reshaped = {};
  for (const k of ["bindingReceipt", "routeDescriptor", "captureAnchor", "readoutReceipt", "witnessRecord", "abstentionRule", "state"]) {
    reshaped[k] = b[k];
  }
  const v = checkWitnessBundle(reshaped);
  assert.equal(v.state, "UNVERIFIED");
  assert.equal(v.failureCode, "FIELD_ORDER_VIOLATION");
});

test("non-monotonic witness stages abstain", () => {
  const b = goodBundle();
  b.witnessRecord.stages[1].at = "2026-09-13T00:00:01Z";
  const v = checkWitnessBundle(b);
  assert.equal(v.state, "UNVERIFIED");
  assert.equal(v.failureCode, "WITNESS_ORDER_VIOLATION");
});

test("broken capture chain abstains, never partial credit", () => {
  const b = goodBundle();
  b.captureAnchor.bindingReceiptId = "different-id";
  const v = checkWitnessBundle(b);
  assert.equal(v.state, "UNVERIFIED");
  assert.equal(v.failureCode, "CHAIN_BROKEN_CAPTURE");
});

test("claim surfaces admit no execution and bound the checker's power", () => {
  const s = wave.claimSurfaces.join("\n");
  assert.match(s, /No execution has run; no bound route exists/);
  assert.match(s, /precondition for evaluation, not evidence/);
});

test("deterministic self-merge is declared and bounded", () => {
  const dm = wave.deterministicMerge;
  assert.equal(dm.strategy, "python-merge");
  assert.equal(dm.selfEnforcing, true);
  assert.ok(dm.touchedPaths.some((p) => p.endsWith("2026-09-13-bound-route-execution-validator.json")));
  for (const f of dm.forbidden) assert.ok(!dm.touchedPaths.includes(f));
});

// These cases exercise the checker, not a real route, DSSE verifier or model.
const repairs = [
  ["route SHA40 rejected", b => b.routeDescriptor.routeConfigHash = "a".repeat(40), "ROUTE_DESCRIPTOR_INVALID"],
  ["digest final newline rejected", b => b.routeDescriptor.routeConfigHash = "a".repeat(63) + "\n", "ROUTE_DESCRIPTOR_INVALID"],
  ["route name missing", b => delete b.routeDescriptor.routeName, "ROUTE_DESCRIPTOR_INVALID"],
  ["route id blank", b => b.routeDescriptor.routeId = " ", "ROUTE_DESCRIPTOR_INVALID"],
  ["binding time missing", b => delete b.bindingReceipt.verifiedAt, "BINDING_RECEIPT_INVALID"],
  ["binding declaration truthy string", b => b.bindingReceipt.reverifiedAtCallTime = "true", "BINDING_RECEIPT_INVALID"],
  ["binding route mismatch", b => b.bindingReceipt.routeId = "other", "ROUTE_BINDING_MISMATCH"],
  ["binding config mismatch", b => b.bindingReceipt.routeConfigHash = "f".repeat(64), "ROUTE_BINDING_MISMATCH"],
  ["capture receipt absent", b => delete b.captureAnchor.receiptId, "CAPTURE_ANCHOR_INVALID"],
  ["capture digest SHA40 rejected", b => b.captureAnchor.configHash = "b".repeat(40), "CAPTURE_ANCHOR_INVALID"],
  ["readout receipt absent", b => delete b.readoutReceipt.receiptId, "READOUT_RECEIPT_INVALID"],
  ["readout flag string", b => b.readoutReceipt.keystoneConformant = "true", "READOUT_RECEIPT_INVALID"],
  ["digest cannot replace receipt join", b => b.readoutReceipt.captureReceipt = b.captureAnchor.configHash, "CHAIN_BROKEN_READOUT"],
  ["legacy join alias not silently ignored", b => b.readoutReceipt.captureAnchorRef = b.captureAnchor.configHash, "CHAIN_BROKEN_READOUT"],
  ["receipt id reused", b => b.readoutReceipt.receiptId = b.bindingReceipt.dsseId, "RECEIPT_ID_REUSED"],
  ["method missing", b => delete b.readoutReceipt.readoutMethod, "READOUT_METHOD_INVALID"],
  ["floating implementation pin", b => b.readoutReceipt.readoutMethod.implementationRevision = "main", "READOUT_METHOD_INVALID"],
  ["parameter digest missing", b => delete b.readoutReceipt.readoutMethod.parametersHash, "READOUT_METHOD_INVALID"],
  ["coverage missing", b => delete b.readoutReceipt.coverageMap, "COVERAGE_MAP_INVALID"],
  ["coverage wrong capture", b => b.readoutReceipt.coverageMap.captureConfigHash = "e".repeat(64), "COVERAGE_MAP_INVALID"],
  ["coverage duplicate layer", b => b.readoutReceipt.coverageMap.layers = ["x", "x"], "COVERAGE_MAP_INVALID"],
  ["coverage empty hooks", b => b.readoutReceipt.coverageMap.hookPoints = [], "COVERAGE_MAP_INVALID"],
  ["coverage unknown state", b => b.readoutReceipt.coverageMap.state = "PERFECT", "COVERAGE_MAP_INVALID"],
  ["disposition missing", b => delete b.readoutReceipt.dispositionField, "DISPOSITION_INVALID"],
  ["disposition changed method", b => b.readoutReceipt.dispositionField.method = "other", "DISPOSITION_INVALID"],
  ["disposition wrong capture", b => b.readoutReceipt.dispositionField.captureReceiptId = "other", "DISPOSITION_INVALID"],
  ["disposition missing failure field", b => delete b.readoutReceipt.dispositionField.failureCode, "DISPOSITION_INVALID"],
  ["nonexposed property measured", b => b.readoutReceipt.dispositionField.property = "internalReasoning", "DISPOSITION_INVALID"],
  ["unavailable boundary missing", b => delete b.readoutReceipt.unavailableSemantics, "UNAVAILABLE_SEMANTICS_INVALID"],
  ["unavailable property promoted", b => b.readoutReceipt.unavailableSemantics.generalization = "MEASURED", "UNAVAILABLE_SEMANTICS_INVALID"],
  ["evidence hash is not any string", b => b.witnessRecord.evidenceHash = "unverified", "WITNESS_RECORD_INVALID"],
  ["stage missing", b => b.witnessRecord.stages.pop(), "WITNESS_RECORD_INVALID"],
  ["stage empty", b => b.witnessRecord.stages = [], "WITNESS_RECORD_INVALID"],
  ["stage extra", b => b.witnessRecord.stages.push({ name: "other", at: "2026-09-13T00:00:04Z" }), "WITNESS_RECORD_INVALID"],
  ["stage duplicate", b => b.witnessRecord.stages[1].name = "bind", "WITNESS_STAGE_INVALID"],
  ["stage empty name", b => b.witnessRecord.stages[1].name = "", "WITNESS_STAGE_INVALID"],
  ["binding timestamp does not carry forward", b => b.bindingReceipt.verifiedAt = "2026-09-12T00:00:01Z", "BINDING_TIME_MISMATCH"],
  ["aggregate hides failure", b => b.failureCode = "HIDDEN_ERROR", "STATE_CONFLICT"],
  ["aggregate promotes unavailable", b => { b.readoutReceipt.dispositionField.state = "UNAVAILABLE"; b.readoutReceipt.dispositionField.failureCode = "NO_READOUT"; }, "STATE_CONFLICT"],
  ["abstention empty code", b => { b.state = "UNVERIFIED"; b.failureCode = ""; }, "ABSTENTION_WITHOUT_CODE"],
  ["abstention whitespace code", b => { b.state = "UNVERIFIED"; b.failureCode = " "; }, "ABSTENTION_WITHOUT_CODE"],
  ["authority cannot be injected", b => b.productionAuthorized = true, "UNEXPECTED_FIELD"],
];
for (const [name, mutate, failureCode] of repairs) {
  test(name, () => {
    const bundle = goodBundle(); mutate(bundle);
    const result = checkWitnessBundle(bundle);
    assert.equal(result.state, "UNVERIFIED");
    assert.equal(result.failureCode, failureCode);
    assert.equal(result.productionAuthorized, false);
  });
}
for (const time of ["2026-09-13", "2026-09-13T00:00:02", "2026-09-13T00:00:02+00:00", "Sep 13 2026", "2026-02-30T00:00:02Z", "2026-09-13T24:00:00Z", "2026-09-13T00:00:02.1234Z", "2026-09-13T00:00:02Z\n"]) {
  test(`UTC profile refuses ${JSON.stringify(time)}`, () => {
    const bundle = goodBundle(); bundle.witnessRecord.stages[1].at = time;
    assert.equal(checkWitnessBundle(bundle).failureCode, "WITNESS_STAGE_INVALID");
  });
}

test("millisecond UTC, declared partial coverage and explicit limits are preserved", () => {
  const bundle = goodBundle();
  bundle.bindingReceipt.verifiedAt = "2026-09-13T00:00:01.000Z";
  bundle.witnessRecord.stages[1].at = "2026-09-13T00:00:01.001Z";
  const before = JSON.stringify(bundle);
  const result = checkWitnessBundle(bundle);
  assert.equal(result.state, "VERIFIED");
  assert.equal(result.scope, "STRUCTURE_ONLY");
  for (const flag of ["executionVerified", "dsseVerified", "evidenceBytesVerified", "productionAuthorized"]) assert.equal(result[flag], false);
  assert.equal(JSON.stringify(bundle), before);
});

test("valid unavailable record stays abstained, not rewritten to success", () => {
  const bundle = goodBundle(); bundle.state = "UNVERIFIED"; bundle.failureCode = "NO_READOUT";
  bundle.readoutReceipt.dispositionField.state = "UNAVAILABLE";
  bundle.readoutReceipt.dispositionField.failureCode = "NO_READOUT";
  assert.equal(checkWitnessBundle(bundle).state, "UNVERIFIED");
  assert.equal(checkWitnessBundle(bundle).failureCode, "NO_READOUT");
});

test("plain-JSON boundary refuses prototypes, accessors, cycles and nonfinite extras", () => {
  for (const mutate of [
    b => Object.setPrototypeOf(b.bindingReceipt, { injected: true }),
    b => Object.defineProperty(b.bindingReceipt, "verifiedAt", { get() { throw new Error("getter must not execute"); }, enumerable: true }),
    b => b.witnessRecord.extra = b,
    b => b.witnessRecord.extra = Infinity,
    b => delete b.witnessRecord.stages[1],
  ]) {
    const bundle = goodBundle(); mutate(bundle);
    assert.equal(checkWitnessBundle(bundle).failureCode, "BUNDLE_INVALID_JSON_DATA");
  }
});

for (const raw of ['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '{"outer":{"x":1,"x":2}}', '{"a":NaN}', '{"a":1e999}', '{"a":true,}', '[1,]', '{} {}', '{"a":01}', '{"a":1.}', '{"a":undefined}', '\ufeff{}', '['.repeat(18) + '0' + ']'.repeat(18)]) {
  test(`strict JSON rejects ${raw.slice(0, 60)}`, () => assert.throws(() => parseWitnessJson(raw)));
}
test("parser preserves escaped names, literal strings and ordinary JSON semantics", () => {
  const input = '{"text":"brace } and escaped \\" quote", "values":[true,false,null,-12.25e2],"__proto__":{"x":1}}';
  assert.deepEqual(JSON.parse(JSON.stringify(parseWitnessJson(input))), JSON.parse(input));
  assert.equal({}.x, undefined);
  assert.equal(checkWitnessBundle(parseWitnessJson(JSON.stringify(goodBundle()))).state, "VERIFIED");
});

test("JSON byte and node caps reject over-limit input", () => {
  assert.throws(() => parseWitnessJson(' '.repeat(65537)));
  assert.throws(() => parseWitnessJson(JSON.stringify(Array(4096).fill(null))));
});

const checker = join(here, "frontier-execution-witness-check.mjs");
function temporaryRun(body, options = {}) {
  const root = mkdtempSync(join(tmpdir(), "szl-witness-"));
  try {
    const file = join(root, "bundle.json"); writeFileSync(file, body);
    const child = spawnSync(process.execPath, [checker, file], { encoding: "utf8", timeout: 5000, maxBuffer: 65536, ...options });
    assert.equal(child.error, undefined);
    return child;
  } finally { rmSync(root, { recursive: true, force: true }); }
}
for (const zone of ["UTC", "America/New_York"]) {
  test(`real CLI accepts canonical witness without timezone inference: ${zone}`, () => {
    const child = temporaryRun(JSON.stringify(goodBundle()), { env: { ...process.env, TZ: zone } });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(JSON.parse(child.stdout).executionVerified, false);
    const invalid = goodBundle(); invalid.witnessRecord.stages[1].at = "2026-09-13T00:00:02";
    assert.equal(temporaryRun(JSON.stringify(invalid), { env: { ...process.env, TZ: zone } }).status, 1);
  });
}
for (const [name, data] of [["duplicate state", JSON.stringify(goodBundle()).replace('"state":"VERIFIED"', '"state":"UNVERIFIED","state":"VERIFIED"')], ["invalid UTF-8", Buffer.from([0xff])], ["oversized", ' '.repeat(65537)], ["malformed", '{']]) {
  test(`real CLI rejects ${name}`, () => {
    const child = temporaryRun(data);
    assert.equal(child.status, 1);
    assert.equal(JSON.parse(child.stdout).failureCode, "BUNDLE_UNREADABLE");
    assert.equal(JSON.parse(child.stdout).productionAuthorized, false);
  });
}
test("real CLI rejects missing arguments and directories", () => {
  const usage = spawnSync(process.execPath, [checker], { encoding: "utf8", timeout: 5000 });
  assert.equal(usage.status, 2);
  assert.equal(JSON.parse(usage.stdout).failureCode, "USAGE");
  const directory = spawnSync(process.execPath, [checker, here], { encoding: "utf8", timeout: 5000 });
  assert.equal(directory.status, 1);
});
test("import from same-basename launcher has no CLI side effect", () => {
  const root = mkdtempSync(join(tmpdir(), "szl-import-"));
  try {
    const wrapper = join(root, "frontier-execution-witness-check.mjs");
    const href = new URL("./frontier-execution-witness-check.mjs", import.meta.url).href;
    writeFileSync(wrapper, `await import(${JSON.stringify(href)}); console.log("IMPORTED_ONLY");`);
    const child = spawnSync(process.execPath, [wrapper], { encoding: "utf8", timeout: 5000 });
    assert.equal(child.status, 0);
    assert.equal(child.stdout.trim(), "IMPORTED_ONLY");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("actual immutable contract bytes bind digest and receipt semantics", () => {
  const read = (reference) => {
    const bytes = readFileSync(join(here, "..", reference.path));
    const blob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    assert.equal(blob, reference.pinnedBlob);
    return JSON.parse(bytes);
  };
  const execution = read(wave.validator.contractReference).executionContract;
  const readout = read(wave.validator.readoutContractReference).readoutContract;
  assert.deepEqual(execution.requiredFields.map(f => f.name), CANON);
  assert.match(execution.requiredFields[0].rule, /SHA-256/);
  assert.equal(readout.joinKey.name, "captureReceipt");
  assert.match(readout.requiredFields.find(f => f.name === "dispositionField").rule, /captureReceiptId/);
  assert.equal(wave.validator.wireProfile.status, "PREPARATION_PROFILE_NOT_DEPLOYED_EXECUTOR_SCHEMA");
});
