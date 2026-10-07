export type BrainStatusEvidence = "MEASURED" | "UNKNOWN" | "UNAVAILABLE";
export type BrainStatusTone = "allow" | "pending" | "subtle";

export interface BrainStatusPresentation {
  label: "Yachay index ready" | "Yachay loading" | "Yachay pulse paused" | "Yachay unavailable";
  evidence: BrainStatusEvidence;
  tone: BrainStatusTone;
}

/**
 * Present the in-browser Yachay index honestly.
 *
 * `alive` is only the user's pulse switch. It is not evidence that the public
 * corpus loaded or that the index was built, so it can never produce a green
 * status before `ready` is true in the current session.
 */
export function brainStatusPresentation({
  ready,
  alive,
  error,
}: {
  ready: boolean;
  alive: boolean;
  error: string | null;
}): BrainStatusPresentation {
  if (error !== null) {
    return { label: "Yachay unavailable", evidence: "UNAVAILABLE", tone: "subtle" };
  }

  if (!ready) {
    return { label: "Yachay loading", evidence: "UNKNOWN", tone: "pending" };
  }

  return alive
    ? { label: "Yachay index ready", evidence: "MEASURED", tone: "allow" }
    : { label: "Yachay pulse paused", evidence: "MEASURED", tone: "subtle" };
}
