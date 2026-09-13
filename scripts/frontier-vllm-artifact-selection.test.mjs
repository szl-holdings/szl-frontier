import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pins = JSON.parse(readFileSync(new URL("../frontier/evidence/vllm-0-29-artifact-selection.json", import.meta.url), "utf8"));

test("vLLM artifact selection remains exact-source metadata, not qualification", () => {
  assert.equal(pins.source.revision, "98dff2a81d747d1dba01a47f939f48c3526d4206");
  assert.equal(pins.trlRevision, "488a0d34be07c7cb2c130e8ba44cb9a4103717b2");
  assert.equal(pins.source.releaseId, 385359183);
  assert.equal(pins.source.releaseImmutable, false);
  assert.equal(pins.evidenceClass, "UPSTREAM_RELEASE_METADATA_NOT_INDEPENDENT_BYTE_VERIFICATION");
  for (const key of ["downloaded", "installed", "engineExecuted", "productionAuthorized", "weightRehosting"]) {
    assert.equal(pins[key], false);
  }
  assert.equal(pins.sourceToBinaryAttestation, "NOT_VERIFIED");
  assert.equal(pins.productionDisposition, "HOLD");
});

test("the two bounded artifact pins cannot be confused or silently widened", () => {
  assert.deepEqual(pins.assets.map(({id, size, sha256}) => [id, size, sha256]), [
    [552379258, 137859053, "4d22dac8259e7e24dbc615531c73cbd1a6d4b4214a3329ccddb7854f26c9dac8"],
    [552379252, 548493389, "22e8d8fec755986b3ad964004a1f8c65a55626ec948354bdbe95993e6b0289fe"],
  ]);
  assert.match(pins.assets[0].name, /\+cpu-cp38-abi3-manylinux_2_34_x86_64\.whl$/);
  assert.match(pins.assets[1].name, /\+cu129-cp38-abi3-manylinux_2_28_x86_64\.whl$/);
  assert.ok(pins.assets.every((asset) => asset.runnerV2Qualification === "NOT_RUN"));
  assert.equal(pins.unknownPlatforms, "UNQUALIFIED_NOT_ABSENT");
  assert.equal(pins.selectionOwner, "szl-holdings/szl-forge");
  assert.equal(pins.servingOwner, "szl-holdings/szl-serve");
  assert.equal(pins.hardwareOwner, "szl-holdings/szl-gpu-bridge");
  assert.equal(pins.frontierIssue, 121);
});
