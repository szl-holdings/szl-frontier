import assert from "node:assert/strict";
import test from "node:test";
import { brainStatusPresentation } from "./status.ts";

test("the default pulse switch cannot paint an unbuilt index green", () => {
  const status = brainStatusPresentation({ ready: false, alive: true, error: null });

  assert.deepEqual(status, {
    label: "Yachay loading",
    evidence: "UNKNOWN",
    tone: "pending",
  });
  assert.doesNotMatch(status.label, /live|ready/i);
});

test("a corpus failure is UNAVAILABLE even when the pulse switch is enabled", () => {
  assert.deepEqual(
    brainStatusPresentation({ ready: false, alive: true, error: "corpus unavailable" }),
    {
      label: "Yachay unavailable",
      evidence: "UNAVAILABLE",
      tone: "subtle",
    },
  );
});

test("an error fails closed even if a stale ready flag remains set", () => {
  assert.deepEqual(brainStatusPresentation({ ready: true, alive: true, error: "stale error" }), {
    label: "Yachay unavailable",
    evidence: "UNAVAILABLE",
    tone: "subtle",
  });
});

test("only a ready and enabled index receives the measured green state", () => {
  assert.deepEqual(brainStatusPresentation({ ready: true, alive: true, error: null }), {
    label: "Yachay index ready",
    evidence: "MEASURED",
    tone: "allow",
  });
});

test("a ready index with its pulse paused stays measured but non-green", () => {
  assert.deepEqual(brainStatusPresentation({ ready: true, alive: false, error: null }), {
    label: "Yachay pulse paused",
    evidence: "MEASURED",
    tone: "subtle",
  });
});
