// SPDX-License-Identifier: Apache-2.0
/** Load an organ cycle receipt if the Space published one. Missing is UNAVAILABLE. */

import { CYCLE_SCHEMA, type CyclePaintSource } from "./paint";

export const CYCLE_URL = "/frontier/ouroboros-cycle.v1.json";

export async function loadPublishedCycle(
  fetchImpl: typeof fetch = fetch,
): Promise<CyclePaintSource | null> {
  try {
    const response = await fetchImpl(CYCLE_URL, { method: "GET" });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return null;
    const cycle = body as CyclePaintSource;
    if (cycle.schema !== CYCLE_SCHEMA) return null;
    return cycle;
  } catch {
    return null;
  }
}
