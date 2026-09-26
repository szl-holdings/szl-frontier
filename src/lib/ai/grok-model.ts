/**
 * The one pinned Grok model id for this organ. The provider call and the model
 * registry both read this value, so the pin cannot drift between them.
 * Changing it is a model change and needs its own review.
 */
export const GROK_MODEL_ID = "grok-4.5";
