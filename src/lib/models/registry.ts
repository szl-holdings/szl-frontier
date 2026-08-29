import type { ModelDef } from "@/lib/covenant/types";
import { EMBED_REVISION } from "@/lib/covenant/index-engine";

export const MODELS: ModelDef[] = [
  {
    id: "grok-4.5",
    name: "Grok 4.5",
    kind: "reasoner",
    revision: "grok-4.5",
    status: "active",
    mandate: "Frontier idea compilation and RFC expansion. User-initiated only.",
  },
  {
    id: "lexhash-v1",
    name: "SZL lexhash",
    kind: "embedder",
    revision: EMBED_REVISION,
    status: "active",
    mandate: "Derived retrieval vectors. Current generation. Mixing forbidden.",
  },
  {
    id: "lexhash-v0",
    name: "SZL lexhash (retired)",
    kind: "embedder",
    revision: "szl-lexhash-v0",
    status: "retired",
    mandate: "Prior embedding generation. Must not serve recall.",
  },
  {
    id: "nemotron-specialist",
    name: "NVIDIA specialist (reference)",
    kind: "specialist",
    revision: "open-ref",
    status: "shadow",
    mandate: "Reference specialist for later evaluation plane. Not an authority.",
  },
];

export function routeModel(input: {
  task: "recall" | "expand" | "classify" | "evaluate";
  requestedModel: string;
  embedRevision: string;
}): { allowed: boolean; selected: ModelDef | null; reason: string } {
  const model = MODELS.find((m) => m.id === input.requestedModel);
  if (!model) return { allowed: false, selected: null, reason: "unknown model" };
  if (model.status === "retired") {
    return { allowed: false, selected: model, reason: "retired model cannot serve" };
  }
  if (input.task === "recall") {
    if (model.kind !== "embedder") {
      return { allowed: false, selected: model, reason: "recall requires the active embedder" };
    }
    if (model.revision !== input.embedRevision) {
      return {
        allowed: false,
        selected: model,
        reason: "embedding-generation isolation — mixed vector spaces forbidden",
      };
    }
  }
  if (input.task === "expand" && model.kind !== "reasoner") {
    return { allowed: false, selected: model, reason: "expand requires an active reasoner" };
  }
  if (model.status === "shadow" && input.task !== "evaluate") {
    return { allowed: false, selected: model, reason: "shadow models are evaluation-only" };
  }
  return { allowed: true, selected: model, reason: `routed ${input.task} → ${model.id}` };
}
