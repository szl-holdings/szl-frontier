import assert from "node:assert/strict";
import test from "node:test";
import { collectSoftwareAxes, promotionBlockedReason, runSoftwareCycle } from "./cycle.ts";
import { WORKSTREAMS } from "./workstreams.ts";

test("software cycle always terminates in two rounds and never authorizes production", async () => {
  const report = await runSoftwareCycle({ live: false, now: new Date("2026-09-20T11:30:00Z") });
  assert.equal(report.rounds.length, 2);
  assert.equal(report.exit, "converged");
  assert.equal(report.productionAuthorized, false);
  assert.equal(report.trainingAdmission, false);
  assert.equal(report.energy, "UNAVAILABLE");
  assert.equal(report.rounds[1]?.previousDigest, report.rounds[0]?.digest);
  assert.notEqual(report.rounds[0]?.digest, report.rounds[1]?.digest);
});

test("live UNAVAILABLE counterparty does not become a measured zero", async () => {
  const report = await runSoftwareCycle({
    live: true,
    counterparty: { ok: false, status: "UNAVAILABLE", error: "AbortError" },
    now: new Date("2026-09-20T11:30:00Z"),
  });
  const axis = (report.rounds[0]?.payload.axes as { name: string; status: string; value: number | null }[]).find(
    (a) => a.name === "counterparty_trust",
  );
  assert.equal(axis?.status, "UNAVAILABLE");
  assert.equal(axis?.value, null);
  assert.notEqual(report.gate.verdict, "ALLOW");
  assert.equal(report.productionAuthorized, false);
});

test("catalog axes see all 34 workstreams and promotion stays blocked", () => {
  assert.equal(WORKSTREAMS.length, 34);
  const axes = collectSoftwareAxes(new Date("2026-09-20T11:30:00Z"), false);
  assert.ok(axes.some((a) => a.name === "schema_validity" && a.value === 1));
  assert.match(promotionBlockedReason(), /HOLD/);
});
