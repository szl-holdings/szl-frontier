import type { CovenantRule } from "./types";

export const COVENANT_RULES: CovenantRule[] = [
  {
    id: "MC-R1",
    name: "Tenant isolation",
    rule: "identity.tenant ≠ record.tenant ⇒ deny",
    evidenceClass: "DECLARED",
  },
  {
    id: "MC-R2",
    name: "Domain isolation",
    rule: "identity.domain ≠ record.domain ∧ ¬auditor ⇒ deny",
    evidenceClass: "DECLARED",
  },
  {
    id: "MC-R3",
    name: "Purpose bind",
    rule: "purpose ∉ write-set ⇒ deny mutation",
    evidenceClass: "DECLARED",
  },
  {
    id: "MC-R4",
    name: "Class authority",
    rule: "policy_memory ⇐ auditor only",
    evidenceClass: "DECLARED",
  },
  {
    id: "MC-R5",
    name: "Clearance rank",
    rule: "sensitivity > clearance ⇒ deny recall",
    evidenceClass: "DECLARED",
  },
  {
    id: "MC-R6",
    name: "Provenance",
    rule: "evidence requires sourceRefs ∧ contentSha256",
    evidenceClass: "DECLARED",
  },
  {
    id: "MC-R7",
    name: "Injection",
    rule: "override-covenant text ⇒ quarantine, never index",
    evidenceClass: "DECLARED",
  },
  {
    id: "MC-R8",
    name: "Embed generation",
    rule: "revision ≠ current ⇒ cannot serve recall",
    evidenceClass: "DECLARED",
  },
  {
    id: "MC-R9",
    name: "Hard deny",
    rule: "approval ⇏ lift recon | foreign-write | weaponize",
    evidenceClass: "DECLARED",
  },
];
