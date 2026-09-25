/** Kernel family is software. Overlap with model ids stays visible. Never TRAINED. */

export const KERNEL_FAMILY_SCHEMA = "szl.frontier.kernel-family/v1";

export const KERNEL_ORG_CARD_COUNT = 14;
export const KERNEL_TAG_TYPED_IDS = [
  "SZLHOLDINGS/szl-governed-norm",
  "SZLHOLDINGS/szl-lambda-gate",
  "SZLHOLDINGS/governed-inference-meter",
  "SZLHOLDINGS/szl-kernels",
  "SZLHOLDINGS/szl-blocked",
  "SZLHOLDINGS/szl-govsign",
  "SZLHOLDINGS/szl-provctl",
  "SZLHOLDINGS/szl-invariants",
  "SZLHOLDINGS/szl-ouroboros",
  "SZLHOLDINGS/szl-formulas",
  "SZLHOLDINGS/YARQA-ATTN",
  "SZLHOLDINGS/szl-receipt-attn",
  "SZLHOLDINGS/szl-maskmod",
  "SZLHOLDINGS/szl-block-kv",
  "SZLHOLDINGS/szl-khipu-kernels",
] as const;

export type KernelKind =
  | "KERNEL_SOFTWARE"
  | "SOFTWARE_CLASSIFIER"
  | "SOFTWARE_SILHOUETTE"
  | "UNTYPED_HOLD";

export class KernelFamilyError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = "KernelFamilyError";
    this.code = code;
  }
}

export function refuseTrained(kind: string, trained: boolean): void {
  if (trained) throw new KernelFamilyError("KERNEL_NOT_TRAINED");
  if (kind === "TRAINED" || kind === "TRAINED_WEIGHTS") {
    throw new KernelFamilyError("KERNEL_NOT_TRAINED");
  }
}

export function kernelFamilyCatalog(opts?: {
  orgCardCount?: number;
  taggedIds?: readonly string[];
}) {
  const orgCard = opts?.orgCardCount ?? KERNEL_ORG_CARD_COUNT;
  const tagged = [...(opts?.taggedIds ?? KERNEL_TAG_TYPED_IDS)].sort();
  if (orgCard === tagged.length) {
    throw new KernelFamilyError("CONFLICT_COLLAPSED");
  }
  return {
    schema: KERNEL_FAMILY_SCHEMA,
    productionAuthorization: false as const,
    trained: false as const,
    artifactKind: "KERNEL_SOFTWARE" as const,
    evidenceClass: "CONFLICT" as const,
    orgCardCount: orgCard,
    taggedCount: tagged.length,
    taggedIds: tagged,
    conflict: `${orgCard}-vs-${tagged.length}`,
    chosenValue: null,
    note: "Org-card 14 vs tag-typed 15 stays OPEN. Extra tagged id is HOLD. Kernel ≠ neural model. Do not invent membership to close the gap.",
  };
}

export function classifyKernelId(id: string): KernelKind {
  if (!id.startsWith("SZLHOLDINGS/")) return "UNTYPED_HOLD";
  return "KERNEL_SOFTWARE";
}
