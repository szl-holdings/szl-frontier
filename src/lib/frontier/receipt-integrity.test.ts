import assert from "node:assert/strict";
import test from "node:test";
import { stableCanonical, sealReceipt } from "./receipt-envelope.ts";

for (const [name, value] of Object.entries({
  nan: NaN, positiveInfinity: Infinity, negativeInfinity: -Infinity,
  undefinedRoot: undefined, undefinedObject: { key: undefined },
  undefinedArray: [undefined], hole: new Array(1), bigint: 1n,
  functionValue: { x: () => 1 }, symbolValue: Symbol("x"),
  date: new Date(0), map: new Map(),
})) {
  test(`canonicalization refuses ${name}`, () => {
    assert.throws(() => stableCanonical(value));
  });
}

test("nested invalid numbers cannot collapse into null", async () => {
  await assert.rejects(sealReceipt({ kind: "health", payload: { outer: [NaN] } }));
  assert.equal(stableCanonical({ outer: [null] }), '{"outer":[null]}');
});

test("accessors, symbols and invisible properties are refused without executing getters", () => {
  let called = 0;
  const getter = Object.defineProperty({}, "x", { enumerable: true, get() { called++; return 1; } });
  assert.throws(() => stableCanonical(getter));
  assert.equal(called, 0);
  assert.throws(() => stableCanonical({ [Symbol("x")]: 1 }));
  assert.throws(() => stableCanonical(Object.defineProperty({}, "x", { value: 1 })));
  assert.throws(() => stableCanonical(Object.assign([1], { extra: 2 })));
});

test("cycles fail closed but repeated ordinary JSON subtrees remain valid", () => {
  const cyclic: unknown[] = []; cyclic.push(cyclic);
  assert.throws(() => stableCanonical(cyclic));
  const shared = { x: 1 };
  assert.equal(stableCanonical([shared, shared]), '[{"x":1},{"x":1}]');
});

test("__proto__ is an ordinary hashed key, not an assignment side effect", () => {
  const value = JSON.parse('{"__proto__":{"x":1}}');
  assert.notEqual(stableCanonical(value), stableCanonical({}));
});

test("valid JSON key ordering and intentionally equivalent signed zero stay compatible", () => {
  assert.equal(stableCanonical({ z: [-0, 2], a: null }), '{"a":null,"z":[0,2]}');
  assert.equal(stableCanonical({ b: true, a: "x" }), '{"a":"x","b":true}');
});
