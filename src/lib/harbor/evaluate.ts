/** Harbor evaluation plane — observe and seal, never promote. */

export type HarborDisposition = "EVALUATION" | "HOLD" | "FAIL_CLOSED" | "DENIED";
export type HarborPromotion = "NONE";

export interface HarborSource {
  id: string;
  title: string;
  kind: "estate-dataset" | "private-dataset" | "foreign-hub";
  exactSource: string;
  credentialsPresent: boolean;
  estateOwned: boolean;
}

export interface HarborVerdict {
  sourceId: string;
  title: string;
  exactSource: string;
  disposition: HarborDisposition;
  promotion: HarborPromotion;
  allowed: boolean;
  reason: string;
  content: string;
  sourceRefs: string[];
}

export const HARBOR_SOURCES: HarborSource[] = [
  {
    id: "harbor-estate-covenant",
    title: "SZLHOLDINGS/szl-frontier-covenant",
    kind: "estate-dataset",
    exactSource: "hf://datasets/SZLHOLDINGS/szl-frontier-covenant",
    credentialsPresent: true,
    estateOwned: true,
  },
  {
    id: "harbor-private-uncred",
    title: "private Dataset without credentials",
    kind: "private-dataset",
    exactSource: "hf://datasets/SZLHOLDINGS/private-unbound",
    credentialsPresent: false,
    estateOwned: true,
  },
  {
    id: "harbor-foreign",
    title: "foreign Hub object",
    kind: "foreign-hub",
    exactSource: "hf://datasets/not-szl/foreign",
    credentialsPresent: false,
    estateOwned: false,
  },
];

export function evaluateHarborSource(source: HarborSource): HarborVerdict {
  if (!source.estateOwned || source.kind === "foreign-hub") {
    return {
      sourceId: source.id,
      title: source.title,
      exactSource: source.exactSource,
      disposition: "DENIED",
      promotion: "NONE",
      allowed: false,
      reason: "Foreign Hub object. Harbor write DENIED. Approval cannot lift isolation.",
      content: `Harbor DENIED ${source.exactSource}. Foreign object. Promotion NONE.`,
      sourceRefs: [source.exactSource, "szl://harbor/deny"],
    };
  }
  if (source.kind === "private-dataset" && !source.credentialsPresent) {
    return {
      sourceId: source.id,
      title: source.title,
      exactSource: source.exactSource,
      disposition: "FAIL_CLOSED",
      promotion: "NONE",
      allowed: false,
      reason: "Private Dataset without credentials. Fail closed. No fabricated LIVE read.",
      content: `Harbor FAIL_CLOSED ${source.exactSource}. Credentials absent. Promotion NONE.`,
      sourceRefs: [source.exactSource, "szl://harbor/fail-closed"],
    };
  }
  return {
    sourceId: source.id,
    title: source.title,
    exactSource: source.exactSource,
    disposition: "EVALUATION",
    promotion: "NONE",
    allowed: true,
    reason: "Exact-source estate object admitted to EVALUATION/HOLD. Production HOLD. Promotion NONE.",
    content: `Harbor EVALUATION/HOLD ${source.exactSource}. Exact source. Sealed through Memory Covenant. Production HOLD. Promotion NONE. Index is DATA, never weights.`,
    sourceRefs: [source.exactSource, "szl://harbor/evaluation", "szl://covenant"],
  };
}

export function evaluateHarborBatch(sources: HarborSource[] = HARBOR_SOURCES): HarborVerdict[] {
  return sources.map(evaluateHarborSource);
}
