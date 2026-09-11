// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
// Additive T28 materiality helper. Does not replace release-catalog scoring.

const LICENSE_NAMES = new Set(["license", "license.txt", "license.md", "notice", "notice.txt", "copying"]);
const FILE_CLASSES = ["rights", "presentation", "substantive"];
export const FIRST_OBSERVATION = "FIRST_OBSERVATION_NOT_PROOF_OF_NEW_RELEASE";
export const UNKNOWN_IDENTITIES = "UNKNOWN_INCOMPLETE_ARTIFACT_IDENTITIES";
export const ACCESS_CHANGE = "ACCESS_CHANGE_REVIEW";
export const RIGHTS_CHANGE = "RIGHTS_CHANGE_REVIEW";
export const SUBSTANTIVE_CHANGE = "SUBSTANTIVE_ARTIFACT_CHANGE_REVIEW";
export const NO_MATERIAL = "NO_MATERIAL_ARTIFACT_CHANGE";
export const ALERTABLE = new Set([ACCESS_CHANGE, RIGHTS_CHANGE, SUBSTANTIVE_CHANGE]);

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

export function classifyHubFiles(rows, sha256) {
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
    const size = item.size ?? item.lfs?.size ?? null;
    const valid =
      typeof oid === "string" && /^(?:sha256:)?(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(oid) && Number.isInteger(size) && size >= 0;
    if (!valid) inventoryComplete = false;
    groups[classifyFile(name)].push({
      name,
      oid: typeof oid === "string" ? oid.replace(/^sha256:/, "").toLowerCase() : null,
      size: Number.isInteger(size) && size >= 0 ? size : null,
    });
  }
  const fingerprints = Object.fromEntries(
    FILE_CLASSES.map((key) => {
      const payload = JSON.stringify(
        [...groups[key]]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((row) => ({ name: row.name, oid: row.oid, size: row.size })),
      );
      const complete = groups[key].every((row) => row.oid && Number.isInteger(row.size));
      return [key, complete ? sha256(payload) : null];
    }),
  );
  if (FILE_CLASSES.some((key) => !fingerprints[key])) inventoryComplete = false;
  return { groups, fingerprints, inventoryComplete, fileCount: names.size };
}

export function materialArtifactDelta(previous, current) {
  if (!previous) return FIRST_OBSERVATION;
  if (previous.id !== current.id || previous.kind !== current.kind) {
    throw new Error("COMPARISON_IDENTITY_MISMATCH");
  }
  if (!previous.inventoryComplete || !current.inventoryComplete) return UNKNOWN_IDENTITIES;
  for (const snap of [previous, current]) {
    for (const key of FILE_CLASSES) {
      if (typeof snap.fingerprints?.[key] !== "string" || !/^[a-f0-9]{64}$/.test(snap.fingerprints[key])) {
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

export function shouldDeliverAlert({ delta, seeded, alreadyAlertedKey, lastAlertKey }) {
  if (!ALERTABLE.has(delta)) return false;
  if (seeded && delta === FIRST_OBSERVATION) return false;
  if (alreadyAlertedKey && alreadyAlertedKey === lastAlertKey) return false;
  return true;
}
