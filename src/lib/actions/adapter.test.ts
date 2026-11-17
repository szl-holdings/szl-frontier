import assert from "node:assert/strict";
import test from "node:test";
import { ACTIONS, evaluateAction } from "./adapter.ts";

test("bounded approvals never execute with missing or unavailable organ cycle", () => {
  for (const organPaint of [undefined, "UNAVAILABLE"] as const) {
    const result = evaluateAction({
      kind: "collect-observation", purpose: "action-execute",
      approval: "approved", organPaint,
    });
    assert.equal(result.allowed, false, `organPaint=${organPaint}`);
  }
});

test("approved bounded SOFTWARE action requires explicit ALLOW paint", () => {
  const result = evaluateAction({
    kind: "collect-observation", purpose: "action-execute",
    approval: "approved", organPaint: "ALLOW",
  });
  assert.equal(result.allowed, true);
  assert.equal(result.hard, false);
});

test("hard-denied actions cannot be lifted by any cycle or human approval", () => {
  for (const action of ACTIONS.filter((item) => item.class === "hard-deny")) {
    for (const organPaint of [undefined, "UNAVAILABLE", "ALLOW"] as const) {
      const result = evaluateAction({
        kind: action.id, purpose: "action-execute", approval: "approved",
        organPaint,
      });
      assert.equal(result.allowed, false);
      assert.equal(result.hard, true);
    }
  }
});
