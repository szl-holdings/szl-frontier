/** Membership identity pin. Presence of a digest is not a file audit. */
import { sha256Hex, stableCanonical } from "./receipt-envelope.ts";

export const MEMBERSHIP_PIN_SCHEMA = "szl.frontier.membership-identity-pin/v1";
export const HEAD_SHA_PIN_SCHEMA = "szl.frontier.head-sha-pin/v1";

export class PinError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = "PinError";
    this.code = code;
  }
}

export type FamilyIds = {
  family: string;
  status: "MEASURED" | "UNAVAILABLE";
  ids: string[];
};

export function refuseHeadPinWithoutShas(
  revisions: Array<{ id: string; sha: string | null | undefined }>,
): Array<{ id: string; sha: string }> {
  if (!revisions.length) throw new PinError("HEAD_SHA_PIN_REFUSED_WITHOUT_REVISIONS");
  const missing = revisions.filter((row) => !row.sha);
  if (missing.length) throw new PinError("HEAD_SHA_PIN_REFUSED_WITHOUT_REVISIONS");
  return revisions.map((row) => ({ id: row.id, sha: row.sha as string }));
}

export async function mintMembershipIdentityPin(families: FamilyIds[]) {
  for (const family of families) {
    if (family.status !== "MEASURED" && family.status !== "UNAVAILABLE") {
      throw new PinError("FAMILY_STATUS");
    }
    if (family.status === "UNAVAILABLE" && family.ids.length) {
      throw new PinError("UNAVAILABLE_WITH_IDS");
    }
  }
  const body = {
    schema: MEMBERSHIP_PIN_SCHEMA,
    productionAuthorization: false as const,
    fileAuditComplete: false as const,
    sourceContentFilesRead: 0 as const,
    semanticReviewComplete: false as const,
    families: families.map((family) => ({
      family: family.family,
      status: family.status,
      count: family.status === "MEASURED" ? family.ids.length : null,
      ids: family.status === "MEASURED" ? [...family.ids].sort() : [],
    })),
  };
  const digestSha256 = await sha256Hex(stableCanonical(body));
  return {
    ...body,
    digestSha256,
    note: "Membership identity pin of public ids. Not a tree hash. Not a content audit. UNKNOWN is not 0.",
  };
}

export function pinDiff(
  previousIds: string[],
  currentIds: string[],
): { added: string[]; removed: string[]; unchanged: number } {
  const prev = new Set(previousIds);
  const next = new Set(currentIds);
  const added = [...next].filter((id) => !prev.has(id)).sort();
  const removed = [...prev].filter((id) => !next.has(id)).sort();
  return {
    added,
    removed,
    unchanged: [...next].filter((id) => prev.has(id)).length,
  };
}

export async function mintHeadShaPin(revisions: Array<{ id: string; sha: string | null | undefined }>) {
  const pinned = refuseHeadPinWithoutShas(revisions);
  const body = {
    schema: HEAD_SHA_PIN_SCHEMA,
    productionAuthorization: false as const,
    fileAuditComplete: false as const,
    revisions: pinned,
  };
  const digestSha256 = await sha256Hex(stableCanonical(body));
  return { ...body, digestSha256 };
}
