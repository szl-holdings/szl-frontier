/** Four-layer honesty surface. Membership is not tree, tree is not content, content is not qualification. */

export const HONESTY_SCHEMA = "szl.frontier.honesty-layers/v1";

export type HonestyLayer = "membership" | "tree" | "content" | "qualification";
export type HonestyMark =
  | "MEASURED"
  | "UNAVAILABLE"
  | "NOT_PERFORMED"
  | "NOT_CLAIMED"
  | "UNKNOWN";

export class HonestyError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = "HonestyError";
    this.code = code;
  }
}

export function displayUnknown(n: number | null | undefined): string {
  if (n === null || n === undefined) return "UNKNOWN";
  return String(n);
}

export function refuseUnknownAsZero(n: number | null | undefined): number | null {
  if (n === null || n === undefined) return null;
  return n;
}

export function honestyLayers(opts: {
  membershipMeasured: boolean;
  sourceContentFilesRead: number;
  fileAuditComplete: boolean;
  runtimeVerified: boolean;
}) {
  if (opts.fileAuditComplete === true && opts.sourceContentFilesRead === 0) {
    throw new HonestyError("FILE_AUDIT_OVERCLAIM");
  }
  if (opts.runtimeVerified === true && opts.sourceContentFilesRead === 0) {
    throw new HonestyError("RUNTIME_VERIFIED_OVERCLAIM");
  }
  return {
    schema: HONESTY_SCHEMA,
    productionAuthorization: false as const,
    layers: {
      membership: (opts.membershipMeasured ? "MEASURED" : "UNAVAILABLE") as HonestyMark,
      tree: "NOT_PERFORMED" as HonestyMark,
      content: opts.sourceContentFilesRead === 0 ? ("NOT_PERFORMED" as HonestyMark) : ("UNKNOWN" as HonestyMark),
      qualification: "NOT_CLAIMED" as HonestyMark,
    },
    sourceContentFilesRead: opts.sourceContentFilesRead,
    fileAuditComplete: false as const,
    runtimeVerified: false as const,
    note: "Membership is not tree. Tree is not content. Content is not qualification. UNKNOWN is not 0.",
  };
}

export const HONESTY_LAYER_ROWS = [
  { id: "membership", claim: "public ids observed", not: "qualification" },
  { id: "tree", claim: "root listing only", not: "recursive tree hash" },
  { id: "content", claim: "source_content_files_read=0", not: "file audit" },
  { id: "qualification", claim: "HOLD", not: "production authorization" },
] as const;

export function honestyContract() {
  return {
    schema: HONESTY_SCHEMA,
    productionAuthorization: false as const,
    layers: HONESTY_LAYER_ROWS,
    invariants: [
      "UNKNOWN != 0",
      "kernels != models",
      "health != ready != source",
      "RUNNING != runtime-verified",
      "envelope authority NONE",
    ],
    note: "Four layers. None skipped. None authorize production.",
  };
}
