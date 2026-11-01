import type { Receipt } from "./types";
import { sha256Hex, stableCanonical } from "../frontier/receipt-envelope.ts";

export type ChainVerification = { ok: boolean; brokenAt: number | null; reason: string };

/** Recompute legacy body hashes without changing the historical wire format.
 * Integrity is not authorship, completeness, or execution authority.
 */
export async function verifyReceiptChain(receipts: readonly Receipt[], genesis: string): Promise<ChainVerification> {
  if (!receipts.length) return { ok: false, brokenAt: null, reason: "EMPTY_CHAIN" };
  let previous = genesis;
  const snapshots: Array<{ body: string; hash: string; prevHash: string; seq: number }> = [];
  for (let index = 0; index < receipts.length; index++) {
    try {
      stableCanonical(receipts[index]); // Refuse lossy JSON before reading properties.
      const { hash, ...body } = receipts[index];
      if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("invalid digest");
      snapshots.push({ body: JSON.stringify(body), hash, prevHash: body.prevHash, seq: body.seq });
    } catch {
      return { ok: false, brokenAt: index, reason: "INVALID_RECEIPT" };
    }
  }
  for (let index = 0; index < snapshots.length; index++) {
    const record = snapshots[index];
    if (record.prevHash !== previous || record.seq !== index + 1) {
      return { ok: false, brokenAt: index, reason: "LINK_OR_SEQUENCE_MISMATCH" };
    }
    if (await sha256Hex(record.body) !== record.hash) {
      return { ok: false, brokenAt: index, reason: "BODY_HASH_MISMATCH" };
    }
    previous = record.hash;
  }
  // No green result for a collection mutated while WebCrypto was pending.
  if (receipts.length !== snapshots.length) return { ok: false, brokenAt: null, reason: "CHAIN_CHANGED" };
  for (let index = 0; index < receipts.length; index++) {
    try {
      stableCanonical(receipts[index]);
      const { hash, ...body } = receipts[index];
      if (hash !== snapshots[index].hash || JSON.stringify(body) !== snapshots[index].body) {
        return { ok: false, brokenAt: index, reason: "CHAIN_CHANGED" };
      }
    } catch {
      return { ok: false, brokenAt: index, reason: "CHAIN_CHANGED" };
    }
  }
  return { ok: true, brokenAt: null, reason: "BODY_HASHES_AND_LINKAGE_VERIFIED" };
}
