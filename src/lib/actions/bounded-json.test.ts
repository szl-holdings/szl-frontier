import assert from "node:assert/strict";
import test from "node:test";
import { boundedJson, PreviewHttpError } from "./bounded-json.ts";

function request(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request("http://localhost:8080/api/action-preview", {
    method: "POST", headers: { "content-type": "application/json", ...headers }, body,
  });
}

async function fails(body: BodyInit, headers: Record<string, string>, status: number) {
  await assert.rejects(
    boundedJson(request(body, headers)),
    (error: unknown) => error instanceof PreviewHttpError && error.status === status,
  );
}

test("bounded JSON accepts a valid compact scenario and honors actual byte count", async () => {
  const input = { kind: "collect-observation", assumedOrganPaint: "ALLOW", assumedApproval: "approved" };
  const raw = JSON.stringify(input);
  const output = await boundedJson(request(raw, { "content-length": String(new TextEncoder().encode(raw).length) }));
  assert.deepEqual(output, input);
});

test("wrong media type never reaches the JSON parser", async () => {
  await fails("{}", { "content-type": "text/plain" }, 415);
});

test("invalid content length, length mismatch and empty content refuse", async () => {
  await fails("{}", { "content-length": "-1" }, 400);
  await fails("{}", { "content-length": "1" }, 400);
  await fails("", {}, 400);
});

test("declared oversize and undeclared streamed oversize refuse", async () => {
  await fails("{}", { "content-length": "999999" }, 413);
  await assert.rejects(
    boundedJson(request("x".repeat(4100))),
    (error: unknown) => error instanceof PreviewHttpError && error.status === 413,
  );
});

test("invalid UTF-8 and malformed JSON refuse before any policy evaluation", async () => {
  await fails(new Uint8Array([255]) as unknown as BodyInit, {}, 400);
  await fails("{", {}, 400);
});

test("multi-chunk request cannot evade the byte ceiling", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("a".repeat(2900)));
      controller.enqueue(new TextEncoder().encode("b".repeat(1197)));
      controller.close();
    },
  });
  const inbound = new Request("http://localhost:8080/api/action-preview", {
    method: "POST", headers: { "content-type": "application/json" },
    body: stream, duplex: "half",
  } as RequestInit & { duplex: "half" });
  await assert.rejects(boundedJson(inbound),
    (error: unknown) => error instanceof PreviewHttpError && error.status === 413);
});
