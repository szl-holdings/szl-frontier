# Memory Covenant implementation readback — 2026-11-16

## Verdict

**Component implementation exists; integrated production qualification remains HOLD.**
A proved policy model, source-level signature checks, and a running HTTP handler
are different claims. This readback corrects the dated proposal's obsolete
implementation state and the blueprint's overly broad runtime wording.

## Source readback

| Surface | Evidence inspected | What is established | What is not established |
| --- | --- | --- | --- |
| DenyMonotonic | [Lean module at 5e8a929](https://github.com/szl-holdings/lutar-lean/blob/5e8a92917d2d4bfeb371a2372f87a4c7660d996d/Lutar/Covenant/DenyMonotonic.lean), merged [#358](https://github.com/szl-holdings/lutar-lean/pull/358) | Twelve theorem declarations model hard-deny absorption under approval steps, including a benign release control. | A refinement proof connecting this model to every runtime gate, full-system security, or an SLA guarantee. |
| STH v2 and recall eligibility | [STH source](https://github.com/szl-holdings/khipu-consensus/blob/a5ccc9574dd921dd001bcf4ddd8eef785ccab11c/python/khipu_consensus/sth.py), [receipt tree](https://github.com/szl-holdings/khipu-consensus/blob/a5ccc9574dd921dd001bcf4ddd8eef785ccab11c/python/khipu_consensus/receipt_tree.py) | Versioned signed-header verification, distinct-key quorum checks, inclusion evidence, explicit trusted scope/time and hard-deny context. | Host/operator independence, live witness availability, tenant authorization, or direct execution permission. Eligibility results retain execution_authorized=false and policy_authorized=false. |
| Read-only adjudication | [Merged source](https://github.com/szl-holdings/khipu-consensus/blob/a5ccc9574dd921dd001bcf4ddd8eef785ccab11c/python/khipu_consensus/adjudicate.py), [repair #71](https://github.com/szl-holdings/khipu-consensus/pull/71) | An adjudication implementation exists. The bounded evidence/transport repair is a separate draft with checks, not a qualified public deployment. | A measured authenticated public endpoint, operational SLO, or permission to lift a deny. |
| Historical mutation evidence | [November 15 report](https://github.com/szl-holdings/szl-eclipse/blob/a47855873dd0e2e399dbe573b1ed2e486ca867b7/evidence/2026-11-15/covenant-v04-mutation-report-20261115.json) | Historical controls for the Khipu a07aa207 source named in that report. | Qualification of current v2. Historical bytes must be preserved; a later source revision requires a separately pinned run with a passing positive control. |
| Crosscheck | [Package at 08d8eb6](https://github.com/szl-holdings/szl-crosscheck/tree/08d8eb6a4cd13c51d721ea99fad820c7552cca43) | Existing measurement comparison tooling. | The historical Eclipse adapter's embedded reference does not establish a package-level independent STH signature verifier. New chain/Merkle crosschecks must identify their exact scope. |
| Frontier TypeScript | [Engine at a0f7fe3](https://github.com/szl-holdings/szl-frontier/blob/a0f7fe3e0acae82a40dddb536e6ab9f8ac2051a2/src/lib/covenant/engine.ts) | In-process SHA-256 receipt chain and policy behavior. | A call from recall to the v2 witness gate. Source changes elsewhere do not automatically connect this path. |
| Python reference | [Gateway at a0f7fe3](https://github.com/szl-holdings/szl-frontier/blob/a0f7fe3e0acae82a40dddb536e6ab9f8ac2051a2/covenant-spec/covenant/gateway.py), [policy repair #335](https://github.com/szl-holdings/szl-frontier/pull/335) | SHA3-256 reference receipts labeled UNSIGNED_HONEST; policy/admission controls. | Signed receipts, witness-backed recall, or durable concurrent multi-process operation. |

## Active qualification work

- Make immutable policy snapshots and their reference conformance tests part of
  native CI. The digest must continue to describe the rules actually evaluated.
- Guard every DenyMonotonic theorem against forbidden transitive axiom
  dependencies and test the guard with deliberate proof mutations.
- Serialize TypeScript operations and own their inputs/outputs, so concurrent
  actions cannot fork receipts or expose unreceipted state.
- Produce fresh STH v2 mutation evidence with positive controls, trusted
  context, and hashes of the code actually imported. Use a separately
  implemented chain/Merkle crosscheck and state its limits precisely.

Each candidate needs its own exact-head validation and protected admission.
These are actions and acceptance criteria, not claims that all candidates are
merged or deployed.

## Production acceptance remains separate

Before a witness-backed Frontier release, the actual recall path must invoke the
verified evidence gate using trusted tenant/session/root/size/time/TTL/policy
context. Missing context, hard denial and failed sealing must prevent release.
Durable multi-writer receipt semantics, witness host/key separation, public
transport/authentication, rollback and observed request/receipt readback require
their own evidence. Distinct synthetic fixture keys do not prove distinct hosts.

The November 15 Windows grind log now ends in a successful 9,235-job build after
four passes. That old log does not record its source commit; it is historical
completion evidence and must not be relabeled as verification of today's head.
Fresh verification must bind the exact revision, inputs and native exit codes.

The v0.4 proposal is preserved as a dated proposal. Lambda remains Conjecture 1.
Nothing here claims a mathematically guaranteed SLA, legal assurance, universal
competitive superiority, or production authorization.
