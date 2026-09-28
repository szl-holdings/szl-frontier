/**
 * The one pinned Grok model id for this organ. The provider call and the model
 * registry both read this value, so the pin cannot drift between them.
 * Changing it is a model change and needs its own review.
 *
 * There is deliberately no environment override: rollback is a code revert.
 */
export const GROK_MODEL_ID = "grok-4.7";

/** Display label for the pinned model, derived from the id so the two cannot disagree. */
export const GROK_MODEL_LABEL = `Grok ${GROK_MODEL_ID.slice("grok-".length)}`;
