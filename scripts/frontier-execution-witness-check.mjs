#!/usr/bin/env node
/**
 * frontier-execution-witness-check — offline structural validator for a
 * bound-route execution witness bundle against the six-field execution
 * contract (frontier/waves/2026-09-12-bound-route-execution-contract.json).
 *
 * BOUNDARIES: no network, no provider calls, no filesystem mutation, no DSSE
 * verification, no route existence proof. This tool enforces internal
 * completeness, canonical field order, and abstention shape ONLY. A PASS is a
 * precondition for downstream evaluation, never evidence of executional
 * satisfaction. Exit code 1 on any violation, with named failure codes.
 */
import { readFileSync } from "node:fs";

const FIELDS = [
  "routeDescriptor",
  "bindingReceipt",
  "captureAnchor",
  "readoutReceipt",
  "witnessRecord",
  "abstentionRule",
];

const fail = (code, detail) => ({ state: "UNVERIFIED", failureCode: code, detail });
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isHex40 = (v) => typeof v === "string" && /^[0-9a-f]{40}$/.test(v);
const isIsoUtc = (v) => typeof v === "string" && !Number.isNaN(Date.parse(v));

export function checkWitnessBundle(bundle) {
  if (!isObj(bundle)) return fail("BUNDLE_NOT_OBJECT", "witness bundle must be a JSON object");

  const keys = Object.keys(bundle);
  for (const f of FIELDS) {
    if (!(f in bundle)) return fail("MISSING_FIELD", `required contract field absent: ${f}`);
  }

  const order = keys.filter((k) => FIELDS.includes(k));
  if (JSON.stringify(order) !== JSON.stringify(FIELDS)) {
    return fail("FIELD_ORDER_VIOLATION", "six contract fields must appear in canonical order");
  }

  const rd = bundle.routeDescriptor;
  if (!isObj(rd) || typeof rd.routeId !== "string" || rd.routeId.length === 0 || !isHex40(rd.routeConfigHash)) {
    return fail("ROUTE_DESCRIPTOR_INVALID", "routeDescriptor requires non-empty routeId and 40-hex routeConfigHash");
  }

  const br = bundle.bindingReceipt;
  if (!isObj(br) || typeof br.dsseId !== "string" || br.dsseId.length === 0 || br.reverifiedAtCallTime !== true) {
    return fail("BINDING_RECEIPT_INVALID", "bindingReceipt requires dsseId and reverifiedAtCallTime === true");
  }

  const ca = bundle.captureAnchor;
  if (!isObj(ca) || !isHex40(ca.configHash) || ca.joinedToBindingReceipt !== true) {
    return fail("CAPTURE_ANCHOR_INVALID", "captureAnchor requires 40-hex configHash joined to the binding receipt");
  }
  if (ca.bindingReceiptId !== br.dsseId) {
    return fail("CHAIN_BROKEN_CAPTURE", "captureAnchor.bindingReceiptId does not reference bindingReceipt.dsseId");
  }

  const rr = bundle.readoutReceipt;
  if (!isObj(rr) || rr.keystoneConformant !== true || rr.ordersAfterCapture !== true) {
    return fail("READOUT_RECEIPT_INVALID", "readoutReceipt requires keystoneConformant and ordersAfterCapture");
  }
  if (rr.captureAnchorRef !== ca.configHash) {
    return fail("CHAIN_BROKEN_READOUT", "readoutReceipt.captureAnchorRef does not reference captureAnchor.configHash");
  }

  const wr = bundle.witnessRecord;
  if (!isObj(wr) || typeof wr.organ !== "string" || wr.organ.length === 0 ||
      typeof wr.evidenceUri !== "string" || wr.evidenceUri.length === 0 ||
      typeof wr.evidenceHash !== "string" || wr.evidenceHash.length === 0 ||
      !Array.isArray(wr.stages) || wr.stages.length === 0) {
    return fail("WITNESS_RECORD_INVALID", "witnessRecord requires organ, evidenceUri, evidenceHash, non-empty stages");
  }
  let prev = null;
  for (const s of wr.stages) {
    if (!isObj(s) || typeof s.name !== "string" || !isIsoUtc(s.at)) {
      return fail("WITNESS_STAGE_INVALID", "each stage requires name and parseable UTC timestamp");
    }
    const t = Date.parse(s.at);
    if (prev !== null && t <= prev) return fail("WITNESS_ORDER_VIOLATION", "stage timestamps must be strictly monotonic");
    prev = t;
  }

  const ar = bundle.abstentionRule;
  if (!isObj(ar) || ar.onBreakState !== "UNVERIFIED" || ar.noPartialCredit !== true) {
    return fail("ABSTENTION_RULE_INVALID", "abstentionRule requires onBreakState UNVERIFIED and noPartialCredit true");
  }

  if (!(bundle.state === "VERIFIED" || bundle.state === "UNVERIFIED")) {
    return fail("STATE_OUTSIDE_ENUM", "bundle state must be VERIFIED or UNVERIFIED");
  }
  if (bundle.state === "UNVERIFIED" && typeof bundle.failureCode !== "string") {
    return fail("ABSTENTION_WITHOUT_CODE", "UNVERIFIED bundle must carry a failureCode");
  }

  return { state: bundle.state, failureCode: bundle.state === "UNVERIFIED" ? bundle.failureCode : null };
}

const isMain = process.argv[1] && process.argv[1].endsWith("frontier-execution-witness-check.mjs");
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node frontier-execution-witness-check.mjs <witness-bundle.json>");
    process.exit(2);
  }
  let bundle;
  try {
    bundle = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    console.log(JSON.stringify(fail("BUNDLE_UNREADABLE", "bundle is not parseable JSON")));
    process.exit(1);
  }
  const verdict = checkWitnessBundle(bundle);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(verdict.state === "VERIFIED" ? 0 : 1);
}
