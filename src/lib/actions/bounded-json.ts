// SPDX-License-Identifier: Apache-2.0
/** Bounded, strict-UTF-8 JSON for read-only developer decision previews. */
export class PreviewHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "PreviewHttpError";
    this.status = status;
  }
}

export async function boundedJson(request: Request, maxBytes = 4096): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") throw new PreviewHttpError(415, "JSON_REQUIRED");
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    if (!/^[0-9]+$/.test(declared)) throw new PreviewHttpError(400, "BAD_CONTENT_LENGTH");
    if (Number(declared) > maxBytes) throw new PreviewHttpError(413, "BODY_TOO_LARGE");
  }
  if (!request.body) throw new PreviewHttpError(400, "EMPTY_BODY");
  const reader = request.body.getReader();
  const pieces: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) {
        try { await reader.cancel("BODY_TOO_LARGE"); } catch { /* verdict remains too large */ }
        throw new PreviewHttpError(413, "BODY_TOO_LARGE");
      }
      pieces.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!bytes || (declared !== null && Number(declared) !== bytes)) {
    throw new PreviewHttpError(400, "INCOMPLETE_BODY");
  }
  const joined = new Uint8Array(bytes);
  let at = 0;
  for (const part of pieces) {
    joined.set(part, at);
    at += part.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(joined));
  } catch {
    throw new PreviewHttpError(400, "INVALID_JSON");
  }
}
