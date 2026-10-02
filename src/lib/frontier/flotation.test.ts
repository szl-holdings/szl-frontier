import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildReceiptFromCsv, selectivityPrior } from "./flotation.ts";

const TABLE = "id,public_score,recovery_percent\na,3.0,10\nc,2.0,50\nb,1.0,99\n";

test("missing bench is modeled and abstains", () => {
  const receipt = buildReceiptFromCsv(TABLE);
  assert.equal(receipt.evidenceTier, "SOFTWARE_RECEIPT");
  assert.equal(receipt.directive, "DEFER");
  assert.equal(receipt.selectivity, "MODELED");
  assert.equal(receipt.claims.input, "UNAVAILABLE");
  assert.equal(receipt.claims.identity, "MEASURED");
  assert.equal(receipt.recoveryPercent, null);
  assert.equal(receipt.benchSha256, null);
  assert.equal(receipt.energyClass, "UNAVAILABLE");
  assert.equal(receipt.ato, false);
  assert.equal(receipt.lambda, "OPEN");
  assert.equal(receipt.nexusOrgan, false);
  assert.equal(receipt.exhibitOnApex, false);
  assert.equal(receipt.prior.state, "UNAVAILABLE");
  assert.deepEqual(
    receipt.rankBand?.map((row) => row.id),
    ["a", "c", "b"],
  );
  assert.deepEqual(
    receipt.rankBand?.map((row) => row.band),
    ["high", "mid", "low"],
  );
  const visible = JSON.stringify({
    rankBand: receipt.rankBand,
    note: receipt.note,
    scoreColumn: receipt.scoreColumn,
    recoveryPercent: receipt.recoveryPercent,
  });
  assert.equal(visible.includes("99"), false);
  assert.equal(visible.includes("50"), false);
  assert.equal(visible.includes("recovery_percent"), false);
});

test("bench hash releases the receipt without a recovery percent", () => {
  const bench = "id,recovery_percent\na,12.5\n";
  const receipt = buildReceiptFromCsv(TABLE, bench);
  assert.equal(receipt.directive, "RELEASE");
  assert.equal(receipt.selectivity, "MODELED");
  assert.equal(receipt.claims.input, "MEASURED");
  assert.equal(
    receipt.benchSha256,
    createHash("sha256").update(bench).digest("hex"),
  );
  assert.equal(receipt.recoveryPercent, null);
  assert.equal(JSON.stringify(receipt).includes("12.5"), false);
});

test("recovery column as score is blocked", () => {
  const receipt = buildReceiptFromCsv(TABLE, null, "recovery_percent");
  assert.equal(receipt.directive, "BLOCK");
  assert.equal(receipt.rankBand, null);
  assert.equal(receipt.recoveryPercent, null);
});

test("non-numeric score defers", () => {
  const receipt = buildReceiptFromCsv("id,public_score\na,high\n");
  assert.equal(receipt.directive, "DEFER");
  assert.equal(receipt.rankBand, null);
});

test("missing score column defers", () => {
  const receipt = buildReceiptFromCsv("id,note\na,collector\n");
  assert.equal(receipt.directive, "DEFER");
  assert.match(receipt.note, /no declared public score/);
});

test("screen_score ranks without a recovery percent", () => {
  const receipt = buildReceiptFromCsv("reagent,screen_score\nx,1\ny,2\n");
  assert.equal(receipt.directive, "DEFER");
  assert.deepEqual(
    receipt.rankBand?.map((row) => row.id),
    ["y", "x"],
  );
  assert.equal(receipt.scoreColumn, "screen_score");
  assert.equal(receipt.recoveryPercent, null);
});

const COMPLETE = {
  homo_lumo_gap_eV: 4.1,
  dipole_D: 1.2,
  surface_charge: -0.4,
  pH: 8.5,
  collector_mM: 0.05,
};
const STRONG = {
  homo_lumo_gap_eV: 1.0,
  dipole_D: 1.0,
  surface_charge: 1.0,
  pH: 1.0,
  collector_mM: 1.0,
};
const WEAK = {
  homo_lumo_gap_eV: 0.0,
  dipole_D: 0.0,
  surface_charge: 0.0,
  pH: 0.0,
  collector_mM: 0.0,
};

test("missing descriptor abstains", () => {
  const out = selectivityPrior({ ...COMPLETE, homo_lumo_gap_eV: null }, STRONG);
  assert.equal(out.state, "ABSTAIN");
  assert.equal(out.S, null);
  assert.deepEqual(out.missing, ["homo_lumo_gap_eV"]);
  assert.equal(out.not, "flotation recovery");
});

test("unset weights abstain", () => {
  const out = selectivityPrior(COMPLETE, null);
  assert.equal(out.state, "ABSTAIN");
  assert.equal(out.S, null);
  assert.equal(out.S_class, "UNAVAILABLE");
});

test("low margin abstains", () => {
  const out = selectivityPrior(COMPLETE, WEAK, 0.15);
  assert.equal(out.state, "ABSTAIN");
  assert.match(out.reason, /\|2S-1\|/);
  assert.ok(out.S !== null && Math.abs(2 * out.S - 1) < 0.15);
});

test("prior only is not recovery", () => {
  const out = selectivityPrior(COMPLETE, STRONG);
  assert.equal(out.state, "PRIOR_ONLY");
  assert.equal(typeof out.S, "number");
  assert.equal(out.S_class, "SIMULATED");
  assert.equal(out.not, "flotation recovery");
});

test("payload demo abstains", () => {
  const out = selectivityPrior(
    {
      homo_lumo_gap_eV: null,
      dipole_D: 1.2,
      surface_charge: -0.4,
      pH: 8.5,
      collector_mM: 0.05,
    },
    null,
  );
  assert.equal(out.state, "ABSTAIN");
  assert.deepEqual(out.missing, ["homo_lumo_gap_eV"]);
});

test("receipt attaches prior without inventing recovery", () => {
  const receipt = buildReceiptFromCsv(TABLE, null, null, COMPLETE, STRONG);
  assert.equal(receipt.prior.state, "PRIOR_ONLY");
  assert.equal(receipt.recoveryPercent, null);
  assert.equal(receipt.exhibitOnApex, false);
  assert.deepEqual(
    receipt.rankBand?.map((row) => row.id),
    ["a", "c", "b"],
  );
});

test("prior-only path has no rank band", () => {
  const receipt = buildReceiptFromCsv(null, null, null, {
    homo_lumo_gap_eV: null,
    dipole_D: 1.2,
    surface_charge: -0.4,
    pH: 8.5,
    collector_mM: 0.05,
  }, null);
  assert.equal(receipt.prior.state, "ABSTAIN");
  assert.equal(receipt.rankBand, null);
  assert.equal(receipt.recoveryPercent, null);
  assert.equal(receipt.exhibitOnApex, false);
});
