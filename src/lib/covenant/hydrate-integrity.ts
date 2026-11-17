import { verifyReceiptChain } from "./verify-chain";
import { sha256Hex } from "./sha256";
import type { MemoryRecord, Receipt } from "./types";

export type HydrationIntegrity =
  | { ok: true; state: "LOCAL_CHAIN_VERIFIED"; count: number }
  | { ok: false; state: "BLOCKED"; reason: string };

/**
 * Validates browser-restored state before it is loaded into the active engine.
 * Does not authenticate origin, establish completeness, or verify witnesses.
 */
export async function verifyHydratedPlane(
  memories: readonly MemoryRecord[],
  receipts: readonly Receipt[],
  genesis: string,
): Promise<HydrationIntegrity> {
  if (!Array.isArray(memories) || !Array.isArray(receipts) || !/^[0-9a-f]{64}$/.test(genesis)) {
    return { ok: false, state: "BLOCKED", reason: "INVALID_PERSISTED_SHAPE" };
  }
  if (!receipts.length) {
    return { ok: false, state: "BLOCKED", reason: "MISSING_RECEIPT_CHAIN" };
  }
  try {
    const chain = await verifyReceiptChain(receipts, genesis);
    if (!chain.ok) return { ok: false, state: "BLOCKED", reason: chain.reason };
    const admitted = new Set<string>();
    const nonReturnable = new Set<string>();
    for (const receipt of receipts) {
      if (!receipt.allowed || !Array.isArray(receipt.memoryIds)) continue;
      for (const id of receipt.memoryIds) {
        if (typeof id !== "string") continue;
        if (receipt.kind === "write-effect") {
          admitted.add(id);
          if (receipt.effect.startsWith("quarantined ")) nonReturnable.add(id);
        }
        if (receipt.kind === "deletion-effect") nonReturnable.add(id);
      }
    }
    const seen = new Set<string>();
    for (const memory of memories) {
      if (!memory || typeof memory.id !== "string" || seen.has(memory.id)
          || typeof memory.envelope?.content !== "string"
          || !/^[0-9a-f]{64}$/.test(memory.envelope.contentSha256)) {
        return { ok: false, state: "BLOCKED", reason: "INVALID_MEMORY_RECORD" };
      }
      seen.add(memory.id);
      if (!admitted.has(memory.id) || (nonReturnable.has(memory.id) && memory.lifecycle === "active")) {
        return { ok: false, state: "BLOCKED", reason: "UNRECEIPTED_OR_REACTIVATED_MEMORY" };
      }
      if (await sha256Hex(memory.envelope.content) !== memory.envelope.contentSha256) {
        return { ok: false, state: "BLOCKED", reason: "MEMORY_CONTENT_HASH_MISMATCH" };
      }
    }
    return { ok: true, state: "LOCAL_CHAIN_VERIFIED", count: receipts.length };
  } catch {
    return { ok: false, state: "BLOCKED", reason: "PERSISTED_VERIFICATION_ERROR" };
  }
}
