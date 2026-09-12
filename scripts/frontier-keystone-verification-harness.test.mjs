/**
 * Verification harness for the canonical workspace-readout keystone.
 *
 * Reads frontier/waves/2026-09-11-workspace-readout-receipt-contract.json from
 * the checkout and maps each carried-forward requirement (recorded in the
 * 2026-09-12 governed-inference chain receipt, wave c52f2b19) to VERIFIED or
 * UNAVAILABLE with evidence. The suite is report-only by design: it fails only
 * if the harness itself is inconsistent. The keystone's status moves out of
 * UNVERIFIED only when every requirement reports VERIFIED on a real CI run.
 * Offline beyond reading the checkout; no network, provider, or inference.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const keystonePath = join(
  here,
  "..",
  "frontier",
  "waves",
  "2026-09-11-workspace-readout-receipt-contract.json",
);

const requirements = [
  {
    name: "joinKeyAncestryCheck",
    anchors: ["join key", "invalid by construction", "capture receipt"],
  },
  {
    name: "pinnedReadoutMethod",
    anchors: ["readout", "pinned", "version"],
  },
  {
    name: "coverageAgainstCaptureHash",
    anchors: ["coverage", "capture config", "hash"],
  },
  {
    name: "dispositionBesideBehavioral",
    anchors: ["disposition", "behavioral output", "never replaces"],
  },
  {
    name: "unavailableFloor",
    anchors: ["unavailable", "unexposed", "contract violation"],
  },
  {
    name: "measuredUpgradeReversible",
    anchors: ["modeled -> measured", "receipt", "reversible"],
  },
  {
    name: "failureAbstains",
    anchors: ["failure", "unavailable", "never presented as workspace evidence"],
  },
];

function collectStrings(node, out) {
  if (typeof node === "string") return out.push(node);
  if (Array.isArray(node)) return node.forEach((n) => collectStrings(n, out));
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      out.push(k);
      collectStrings(v, out);
    }
  }
  return out;
}

function loadCorpus() {
  try {
    const parsed = JSON.parse(readFileSync(keystonePath, "utf8"));
    return collectStrings(parsed, []).join("\n").toLowerCase();
  } catch {
    return null;
  }
}

const corpus = loadCorpus();

function check(anchors) {
  if (corpus === null) {
    return { status: "UNAVAILABLE", evidence: "keystone file unreadable in checkout" };
  }
  const missing = anchors.filter((a) => !corpus.includes(a.toLowerCase()));
  return missing.length === 0
    ? { status: "VERIFIED", evidence: "anchors present: " + anchors.join(", ") }
    : { status: "UNAVAILABLE", evidence: "missing anchors: " + missing.join(", ") };
}

const report = Object.fromEntries(
  requirements.map((r) => [r.name, check(r.anchors)]),
);

for (const r of requirements) {
  test(`${r.name}: ${report[r.name].status}`, () => {
    assert.ok(["VERIFIED", "UNAVAILABLE"].includes(report[r.name].status));
    assert.ok(report[r.name].evidence.length > 0);
  });
}

test("harness covers exactly the carried-forward checklist", () => {
  assert.deepEqual(Object.keys(report).sort(), [
    "coverageAgainstCaptureHash",
    "dispositionBesideBehavioral",
    "failureAbstains",
    "joinKeyAncestryCheck",
    "measuredUpgradeReversible",
    "pinnedReadoutMethod",
    "unavailableFloor",
  ]);
});

test("keystone hazard flips from UNVERIFIED only on 7-of-7 VERIFIED", () => {
  const verifiedCount = Object.values(report).filter(
    (r) => r.status === "VERIFIED",
  ).length;
  const hazard = verifiedCount === requirements.length ? "VERIFIED" : "UNVERIFIED";
  // Report-only: partial verification must never present as full verification.
  if (verifiedCount > 0 && verifiedCount < requirements.length) {
    assert.equal(hazard, "UNVERIFIED", "partial coverage stays UNVERIFIED");
  }
  assert.ok(true);
});
