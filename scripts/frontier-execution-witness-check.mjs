#!/usr/bin/env node
/**
 * Offline structural profile for the admitted six-field execution contract.
 * Digests and receipt references are compared, never authenticated here.
 * No network, DSSE verification, route execution, training or provider writes.
 * VERIFIED is STRUCTURE_ONLY, not executional satisfaction or authorization.
 * Concrete wire choices and their limits are recorded in this PR's wave.
 */
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FIELDS = ["routeDescriptor", "bindingReceipt", "captureAnchor", "readoutReceipt", "witnessRecord", "abstentionRule"];
const STAGES = ["bind", "capture", "readout"];
const MAX_BYTES = 64 * 1024;
const BOUNDS = Object.freeze({
  scope: "STRUCTURE_ONLY", executionVerified: false, dsseVerified: false,
  evidenceBytesVerified: false, productionAuthorized: false,
});
const verdict = (state, failureCode, detail) => ({ state, failureCode, ...(detail ? { detail } : {}), ...BOUNDS });
const fail = (code, detail) => verdict("UNVERIFIED", code, detail);
const own = (value, key) => Object.hasOwn(value, key);
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => typeof v === "string" && v.length > 0 && v.length <= 2048 && v.trim() === v && !/[\u0000-\u001f\u007f]/u.test(v);
const hex = (v, n) => typeof v === "string" && v.length === n && !/[^0-9a-f]/u.test(v);
const sha256 = (v) => hex(v, 64);
const sha40 = (v) => hex(v, 40);
const names = (v) => Array.isArray(v) && v.length > 0 && v.length <= 128 && v.every(text) && new Set(v).size === v.length;

function utc(value) {
  // Date.parse alone accepts local/date-only input and normalizes some dates.
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === (value.length === 20 ? value.slice(0, -1) + ".000Z" : value);
}

function jsonShape(value) {
  // Imported callers must also supply bounded JSON data, not accessors or
  // class instances. This is not a sandbox for attacker-controlled JS proxies.
  let nodes = 0, bytes = 0;
  const seen = new Set();
  function visit(v, depth) {
    if (++nodes > 4096 || depth > 16) return false;
    if (typeof v === "string") { bytes += Buffer.byteLength(v); return bytes <= MAX_BYTES; }
    if (v === null || typeof v === "boolean") return true;
    if (typeof v === "number") return Number.isFinite(v);
    if (typeof v !== "object" || seen.has(v)) return false;
    const array = Array.isArray(v), prototype = Object.getPrototypeOf(v);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) return false;
    seen.add(v);
    const descriptors = Object.getOwnPropertyDescriptors(v);
    if (Object.getOwnPropertySymbols(v).length) return false;
    const keys = Object.keys(descriptors).filter((k) => !(array && k === "length"));
    if (array && (keys.length !== v.length || keys.some((k, i) => k !== String(i)))) return false;
    for (const key of keys) {
      const d = descriptors[key];
      bytes += Buffer.byteLength(key);
      if (!own(d, "value") || !d.enumerable || bytes > MAX_BYTES || !visit(d.value, depth + 1)) return false;
    }
    seen.delete(v);
    return true;
  }
  return visit(value, 0);
}

export function checkWitnessBundle(bundle) {
  if (!isObj(bundle)) return fail("BUNDLE_NOT_OBJECT", "witness bundle must be a JSON object");
  if (!jsonShape(bundle)) return fail("BUNDLE_INVALID_JSON_DATA", "bounded plain JSON data required");
  const keys = Object.keys(bundle);
  for (const field of FIELDS) if (!own(bundle, field)) return fail("MISSING_FIELD", "required contract field absent");
  if (keys.some((key) => ![...FIELDS, "state", "failureCode"].includes(key))) return fail("UNEXPECTED_FIELD", "unsupported top-level field");
  if (keys.filter((key) => FIELDS.includes(key)).some((key, i) => key !== FIELDS[i])) {
    return fail("FIELD_ORDER_VIOLATION", "six fields must use this profile's declared order");
  }

  const rd = bundle.routeDescriptor, br = bundle.bindingReceipt, ca = bundle.captureAnchor, rr = bundle.readoutReceipt;
  if (!isObj(rd) || !text(rd.routeName) || !text(rd.routeId) || !sha256(rd.routeConfigHash)) {
    return fail("ROUTE_DESCRIPTOR_INVALID", "route name/id and SHA-256 config digest required");
  }
  if (!isObj(br) || !text(br.dsseId) || br.reverifiedAtCallTime !== true || !utc(br.verifiedAt)) {
    return fail("BINDING_RECEIPT_INVALID", "binding id and explicit call-time UTC timestamp required");
  }
  if (br.routeId !== rd.routeId || br.routeConfigHash !== rd.routeConfigHash) {
    return fail("ROUTE_BINDING_MISMATCH", "binding route identity and config digest must match descriptor");
  }
  if (!isObj(ca) || !text(ca.receiptId) || !sha256(ca.configHash) || ca.joinedToBindingReceipt !== true) {
    return fail("CAPTURE_ANCHOR_INVALID", "capture receipt id and SHA-256 config digest required");
  }
  if (ca.bindingReceiptId !== br.dsseId) return fail("CHAIN_BROKEN_CAPTURE", "capture must reference binding receipt id");
  if (!isObj(rr) || !text(rr.receiptId) || rr.keystoneConformant !== true || rr.ordersAfterCapture !== true) {
    return fail("READOUT_RECEIPT_INVALID", "readout receipt identity and ordering declarations required");
  }
  // The keystone's joinKey is captureReceipt, NOT a configuration digest.
  if (rr.captureReceipt !== ca.receiptId || own(rr, "captureAnchorRef")) {
    return fail("CHAIN_BROKEN_READOUT", "readout must reference capture receipt id without a legacy hash alias");
  }
  if (new Set([br.dsseId, ca.receiptId, rr.receiptId]).size !== 3) {
    return fail("RECEIPT_ID_REUSED", "binding, capture and readout are distinct receipts");
  }
  const method = rr.readoutMethod, coverage = rr.coverageMap, disposition = rr.dispositionField;
  if (!isObj(method) || !text(method.name) || !sha40(method.implementationRevision) || !sha256(method.parametersHash)) {
    return fail("READOUT_METHOD_INVALID", "named method with Git revision and parameter SHA-256 required");
  }
  if (!isObj(coverage) || coverage.captureConfigHash !== ca.configHash || !names(coverage.layers) ||
      !names(coverage.hookPoints) || !["FULL", "PARTIAL"].includes(coverage.state)) {
    return fail("COVERAGE_MAP_INVALID", "declared coverage must bind capture config without widening partial coverage");
  }
  if (!isObj(disposition) || !text(disposition.property) || disposition.method !== method.name ||
      disposition.captureReceiptId !== ca.receiptId || !["MEASURED", "UNAVAILABLE"].includes(disposition.state) ||
      (["directedModulation", "internalReasoning", "generalization"].includes(disposition.property) && disposition.state !== "UNAVAILABLE") ||
      (disposition.state === "MEASURED" ? disposition.failureCode !== null : !text(disposition.failureCode))) {
    return fail("DISPOSITION_INVALID", "disposition must preserve method, capture ancestry and failure semantics");
  }
  const unavailable = rr.unavailableSemantics;
  if (!isObj(unavailable) || !["directedModulation", "internalReasoning", "generalization"].every((key) => unavailable[key] === "UNAVAILABLE")) {
    return fail("UNAVAILABLE_SEMANTICS_INVALID", "non-exposed properties remain explicitly unavailable");
  }

  const wr = bundle.witnessRecord;
  if (!isObj(wr) || !text(wr.organ) || !text(wr.evidenceUri) || !sha256(wr.evidenceHash) ||
      !Array.isArray(wr.stages) || wr.stages.length !== STAGES.length) {
    return fail("WITNESS_RECORD_INVALID", "witness requires evidence digest and complete three-stage sequence");
  }
  let previous = null;
  for (let i = 0; i < STAGES.length; i++) {
    const stage = wr.stages[i];
    if (!isObj(stage) || stage.name !== STAGES[i] || !utc(stage.at)) {
      return fail("WITNESS_STAGE_INVALID", "ordered bind/capture/readout UTC timestamps required");
    }
    const time = Date.parse(stage.at);
    if (previous !== null && time <= previous) return fail("WITNESS_ORDER_VIOLATION", "stage timestamps must be strictly monotonic");
    previous = time;
  }
  if (Date.parse(br.verifiedAt) !== Date.parse(wr.stages[0].at)) {
    return fail("BINDING_TIME_MISMATCH", "binding call-time must match bind-stage witness");
  }
  const ar = bundle.abstentionRule;
  if (!isObj(ar) || ar.onBreakState !== "UNVERIFIED" || ar.noPartialCredit !== true) {
    return fail("ABSTENTION_RULE_INVALID", "no partial-credit abstention required");
  }
  if (!["VERIFIED", "UNVERIFIED"].includes(bundle.state)) return fail("STATE_OUTSIDE_ENUM", "unsupported aggregate state");
  if (bundle.state === "UNVERIFIED" && !text(bundle.failureCode)) return fail("ABSTENTION_WITHOUT_CODE", "nonempty failure code required");
  if (bundle.state === "VERIFIED" && ((own(bundle, "failureCode") && bundle.failureCode !== null) || disposition.state !== "MEASURED")) {
    return fail("STATE_CONFLICT", "failed readout or aggregate cannot be promoted by a state label");
  }
  return verdict(bundle.state, bundle.state === "UNVERIFIED" ? bundle.failureCode : null);
}

export function parseWitnessJson(input) {
  // Bounded JSON parser uses the native parser for string escape semantics.
  // Duplicate decoded keys and nonfinite numbers are rejected before collapse.
  if (typeof input !== "string" || Buffer.byteLength(input) > MAX_BYTES) throw new Error("bounded JSON required");
  let at = 0, nodes = 0;
  const space = () => { while (at < input.length && /[ \t\r\n]/u.test(input[at])) at++; };
  function string() {
    const pattern = /"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/y;
    pattern.lastIndex = at;
    const match = pattern.exec(input);
    if (!match) throw new Error("invalid string");
    at = pattern.lastIndex;
    return JSON.parse(match[0]);
  }
  function value(depth) {
    if (++nodes > 4096 || depth > 16) throw new Error("JSON bounds exceeded");
    space();
    if (input[at] === '"') return string();
    if (input[at] === "{" || input[at] === "[") {
      const object = input[at++] === "{", end = object ? "}" : "]";
      const out = object ? Object.create(null) : [];
      space();
      if (input[at] === end) { at++; return out; }
      while (true) {
        space();
        const key = object ? string() : out.length;
        if (object) {
          if (own(out, key)) throw new Error("duplicate JSON key");
          space();
          if (input[at++] !== ":") throw new Error("missing colon");
        }
        out[key] = value(depth + 1);
        space();
        const delimiter = input[at++];
        if (delimiter === end) return out;
        if (delimiter !== ",") throw new Error("invalid delimiter");
      }
    }
    for (const [word, literal] of [["true", true], ["false", false], ["null", null]]) {
      if (input.startsWith(word, at)) { at += word.length; return literal; }
    }
    const pattern = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
    pattern.lastIndex = at;
    const match = pattern.exec(input);
    if (!match || !Number.isFinite(Number(match[0]))) throw new Error("invalid number");
    at = pattern.lastIndex;
    return Number(match[0]);
  }
  const result = value(0);
  space();
  if (at !== input.length) throw new Error("trailing JSON content");
  return result;
}

function readBundle(file) {
  if (lstatSync(file).isSymbolicLink()) throw new Error("regular file required");
  const fd = openSync(file, constants.O_RDONLY | (constants.O_NONBLOCK || 0) | (constants.O_NOFOLLOW || 0));
  try {
    const before = fstatSync(fd, { bigint: true });
    if (!before.isFile() || before.size > BigInt(MAX_BYTES)) throw new Error("bounded regular file required");
    const bytes = Buffer.alloc(MAX_BYTES + 1);
    let count = 0, read;
    while (count < bytes.length && (read = readSync(fd, bytes, count, bytes.length - count, count)) > 0) count += read;
    const after = fstatSync(fd, { bigint: true });
    if (count > MAX_BYTES || BigInt(count) !== before.size ||
        ["size", "mtimeNs", "ctimeNs"].some((key) => before[key] !== after[key])) throw new Error("file changed or exceeded bound");
    return parseWitnessJson(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, count)));
  } finally { closeSync(fd); }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  let result;
  if (process.argv.length !== 3) {
    result = fail("USAGE", "usage: node frontier-execution-witness-check.mjs <witness-bundle.json>");
    process.exitCode = 2;
  } else {
    try { result = checkWitnessBundle(readBundle(process.argv[2])); }
    catch { result = fail("BUNDLE_UNREADABLE", "bounded regular UTF-8 JSON file required"); }
    process.exitCode = result.state === "VERIFIED" ? 0 : 1;
  }
  console.log(JSON.stringify(result));
}
