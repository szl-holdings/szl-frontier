// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
// Additive T28 materiality helper. Does not replace release-catalog scoring.

/** @typedef {"rights" | "presentation" | "substantive"} FileClass */
/** @typedef {{name: string, oid: string | null, size: number | null}} ClassifiedFile */
/** @typedef {{private?: unknown, gated?: unknown, disabled?: unknown}} AccessFlags */
/**
 * @typedef {{
 *   id: string,
 *   kind: string,
 *   inventoryComplete: boolean,
 *   fingerprints: Record<FileClass, string | null>,
 *   accessFlags?: AccessFlags,
 *   licenseMetadata?: string | null,
 * }} ClassifiedSnapshot
 */
/** @typedef {{name?: string, rfilename?: string, oid?: string, blobId?: string, size?: number, lfs?: {oid?: string, size?: number}}} HubFileRow */

const LICENSE_NAMES = new Set(["license", "license.txt", "license.md", "notice", "notice.txt", "copying"]);
/** @type {readonly FileClass[]} */
const FILE_CLASSES = ["rights", "presentation", "substantive"];
export const FIRST_OBSERVATION = "FIRST_OBSERVATION_NOT_PROOF_OF_NEW_RELEASE";
export const UNKNOWN_IDENTITIES = "UNKNOWN_INCOMPLETE_ARTIFACT_IDENTITIES";
export const ACCESS_CHANGE = "ACCESS_CHANGE_REVIEW";
export const RIGHTS_CHANGE = "RIGHTS_CHANGE_REVIEW";
export const SUBSTANTIVE_CHANGE = "SUBSTANTIVE_ARTIFACT_CHANGE_REVIEW";
export const NO_MATERIAL = "NO_MATERIAL_ARTIFACT_CHANGE";
export const ALERTABLE = new Set([ACCESS_CHANGE, RIGHTS_CHANGE, SUBSTANTIVE_CHANGE]);

/**
 * @param {string} name
 * @returns {FileClass}
 */
export function classifyFile(name) {
  const base = String(name).split("/").pop()?.toLowerCase() ?? "";
  if (LICENSE_NAMES.has(base) || base.startsWith("license-")) return "rights";
  if (
    base === "readme.md" ||
    base === ".gitattributes" ||
    base.endsWith(".png") ||
    base.endsWith(".jpg") ||
    base.endsWith(".jpeg") ||
    base.endsWith(".gif") ||
    base.endsWith(".svg") ||
    base.endsWith(".webp")
  ) {
    return "presentation";
  }
  return "substantive";
}

/**
 * @param {HubFileRow[] | null | undefined} rows
 * @param {(value: string) => string} sha256
 */
export function classifyHubFiles(rows, sha256) {
  /** @type {Record<FileClass, ClassifiedFile[]>} */
  const groups = { rights: [], presentation: [], substantive: [] };
  let inventoryComplete = Array.isArray(rows) && rows.length > 0;
  const names = new Set();
  for (const item of rows ?? []) {
    const name = item?.name ?? item?.rfilename;
    if (typeof name !== "string" || !name) {
      inventoryComplete = false;
      continue;
    }
    if (names.has(name) || name.startsWith("/") || name.split("/").includes("..")) {
      throw new Error("INVALID_OR_DUPLICATE_HUB_FILE");
    }
    names.add(name);
    const oid = item.oid ?? item.lfs?.oid ?? item.blobId ?? null;
    const rawSize = item.size ?? item.lfs?.size ?? null;
    const size = typeof rawSize === "number" && Number.isInteger(rawSize) && rawSize >= 0 ? rawSize : null;
    const valid =
      typeof oid === "string" && /^(?:sha256:)?(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(oid) && size !== null;
    if (!valid) inventoryComplete = false;
    groups[classifyFile(name)].push({
      name,
      oid: typeof oid === "string" ? oid.replace(/^sha256:/, "").toLowerCase() : null,
      size,
    });
  }
  /** @type {Record<FileClass, string | null>} */
  const fingerprints = {
    rights: null,
    presentation: null,
    substantive: null,
  };
  for (const key of FILE_CLASSES) {
    const complete = groups[key].every((row) => row.oid && row.size !== null);
    const payload = JSON.stringify(
      [...groups[key]]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((row) => ({ name: row.name, oid: row.oid, size: row.size })),
    );
    fingerprints[key] = complete ? sha256(payload) : null;
  }
  if (FILE_CLASSES.some((key) => !fingerprints[key])) inventoryComplete = false;
  return { groups, fingerprints, inventoryComplete, fileCount: names.size };
}

/**
 * @param {ClassifiedSnapshot | null | undefined} previous
 * @param {ClassifiedSnapshot} current
 */
export function materialArtifactDelta(previous, current) {
  if (!previous) return FIRST_OBSERVATION;
  if (previous.id !== current.id || previous.kind !== current.kind) {
    throw new Error("COMPARISON_IDENTITY_MISMATCH");
  }
  if (!previous.inventoryComplete || !current.inventoryComplete) return UNKNOWN_IDENTITIES;
  for (const snap of [previous, current]) {
    for (const key of FILE_CLASSES) {
      const value = snap.fingerprints?.[key];
      if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
        return UNKNOWN_IDENTITIES;
      }
    }
  }
  if (JSON.stringify(previous.accessFlags) !== JSON.stringify(current.accessFlags)) return ACCESS_CHANGE;
  if (previous.licenseMetadata !== current.licenseMetadata || previous.fingerprints.rights !== current.fingerprints.rights) {
    return RIGHTS_CHANGE;
  }
  if (previous.fingerprints.substantive !== current.fingerprints.substantive) return SUBSTANTIVE_CHANGE;
  return NO_MATERIAL;
}

/**
 * @param {{delta: string, seeded: boolean, alreadyAlertedKey: string | null | undefined, lastAlertKey: string | null | undefined}} args
 */
export function shouldDeliverAlert({ delta, seeded, alreadyAlertedKey, lastAlertKey }) {
  if (!ALERTABLE.has(delta)) return false;
  if (seeded && delta === FIRST_OBSERVATION) return false;
  if (alreadyAlertedKey && alreadyAlertedKey === lastAlertKey) return false;
  return true;
}
