import type { PolicyFormula } from "./types";

export const FORMULAS: PolicyFormula[] = [
  { id: "F1", name: "Tenant isolation", rule: "identity.tenant ≠ record.tenant ⇒ deny" },
  { id: "F2", name: "Domain isolation", rule: "identity.domain ≠ record.domain ∧ ¬auditor ⇒ deny" },
  { id: "F3", name: "Purpose bind", rule: "purpose ∉ write-set ⇒ deny mutation" },
  { id: "F4", name: "Class authority", rule: "policy_memory ⇐ auditor only" },
  { id: "F5", name: "Clearance rank", rule: "sensitivity > clearance ⇒ deny recall" },
  { id: "F6", name: "Provenance", rule: "evidence requires sourceRefs ∧ contentSha256" },
  { id: "F7", name: "Injection", rule: "override-covenant text ⇒ quarantine, never index" },
  { id: "F8", name: "Embed generation", rule: "revision ≠ current ⇒ cannot serve recall" },
  { id: "F9", name: "Hard deny", rule: "approval ⇏ lift recon | foreign-write | weaponize" },
];
