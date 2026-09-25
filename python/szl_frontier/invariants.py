# SPDX-License-Identifier: Apache-2.0
"""Eight falsifiable SOFTWARE receipt invariants.

Catalog is the szl-invariants set. Not CUDA. Not a theorem about Λ.
An extra cycle-bind block (G1–G3) closes gaps the eight names do not cover:
recomputed gate, non-executable arithmetic shadow, deny monotonicity.
"""

from __future__ import annotations

import re
from typing import Any, Mapping

from .lambda_gate import (
    AxisEvidence,
    evaluate_lambda_gate,
    scores_match,
)
from .receipts import RECEIPT_SCHEMA, EvidenceReceipt, ReceiptError

INVARIANT_CATALOG = (
    {"id": "I1", "name": "unsigned_honest", "note": "signed=true with empty signatures is a fabricated claim"},
    {"id": "I2", "name": "payload_digest_binds", "note": "receipt must carry payload bytes or a digest"},
    {"id": "I3", "name": "lambda_not_a_theorem", "note": "Λ uniqueness stays Conjecture 1"},
    {"id": "I4", "name": "proposal_only", "note": "cycle cannot self-execute or promote"},
    {"id": "I5", "name": "consensus_not_measured", "note": "no fake swarm IQ"},
    {"id": "I6", "name": "hash_chain_closed", "note": "turn chain is SOFTWARE, not DSSE"},
    {"id": "I7", "name": "receipts_in_eq_out", "note": "receipts.in ≡ receipts.out — prior head is this input"},
    {"id": "I8", "name": "no_fabricated_energy", "note": "no joule invented on this organ"},
)
SHA256_HEX = re.compile(r"^[0-9a-f]{64}$")
THEOREM_CLAIM = re.compile(
    r"\b(theorem|qed|lean_proved|proven_uniqueness|lambda_theorem)\b",
    re.I,
)


def _add(results: list[dict[str, Any]], iid: str, name: str, ok: bool, note: str) -> None:
    results.append({"id": iid, "name": name, "ok": ok, "note": note})


def check_receipt(
    receipt: EvidenceReceipt,
    *,
    incoming: EvidenceReceipt | None = None,
    hmac_key: bytes | None = None,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    payload = dict(receipt.payload)

    try:
        receipt.verify(hmac_key=hmac_key)
        identity_ok = True
        identity_note = "content address and payload digest bind"
    except ReceiptError as exc:
        identity_ok = False
        identity_note = str(exc)

    signed = bool(payload.get("signed"))
    signatures = payload.get("signatures") or []
    if receipt.signature is not None:
        signed = True
        signatures = signatures or [receipt.signature.as_mapping()]
    _add(
        results,
        "I1",
        "unsigned_honest",
        (not signed and not signatures) or (signed and bool(signatures)),
        "signed=true with empty signatures is a fabricated claim",
    )

    _add(
        results,
        "I2",
        "payload_digest_binds",
        identity_ok and bool(receipt.payload_digest) and SHA256_HEX.fullmatch(receipt.payload_digest) is not None,
        identity_note,
    )

    lam = payload.get("lambda")
    never = payload.get("lambdaNeverATheorem") is True
    claimed = THEOREM_CLAIM.search(str(payload.get("lambdaClaim") or payload.get("honesty") or ""))
    _add(
        results,
        "I3",
        "lambda_not_a_theorem",
        lam == "CONJECTURE_1" and never and claimed is None,
        "Λ uniqueness stays Conjecture 1",
    )

    _add(
        results,
        "I4",
        "proposal_only",
        payload.get("authority") == "PROPOSAL_ONLY"
        and payload.get("state") == "PROPOSAL_ONLY"
        and payload.get("productionAuthorized") is False
        and payload.get("trainingAdmission") is False,
        "cycle cannot self-execute or promote",
    )

    converge = payload.get("converge") if isinstance(payload.get("converge"), dict) else {}
    _add(
        results,
        "I5",
        "consensus_not_measured",
        converge.get("semantic_consensus") == "NOT_MEASURED",
        "no fake swarm IQ",
    )

    chain_kind = payload.get("kind")
    head = payload.get("chainHead") or receipt.digest
    _add(
        results,
        "I6",
        "hash_chain_closed",
        chain_kind == "SOFTWARE"
        and isinstance(head, str)
        and SHA256_HEX.fullmatch(head) is not None
        and receipt.schema == RECEIPT_SCHEMA,
        "turn chain is SOFTWARE, not DSSE",
    )

    if incoming is None:
        in_eq_out = receipt.previous_receipt_digest is None or SHA256_HEX.fullmatch(
            str(receipt.previous_receipt_digest)
        ) is not None
        in_note = "genesis or well-formed parent digest"
    else:
        in_eq_out = receipt.previous_receipt_digest == incoming.digest
        in_note = "receipts.in ≡ receipts.out — prior head is this input"
    _add(results, "I7", "receipts_in_eq_out", in_eq_out, in_note)

    energy = payload.get("energy", "UNAVAILABLE")
    _add(
        results,
        "I8",
        "no_fabricated_energy",
        energy in (None, "UNAVAILABLE") and "joule" not in payload and "joules" not in payload,
        "no joule invented on this organ",
    )

    _add_cycle_binds(results, receipt, incoming, payload)

    failed = [row for row in results if not row["ok"]]
    catalog_ok = [row for row in results if row["id"].startswith("I") and row["ok"]]
    return {
        "schema": "szl.frontier.invariants/v1",
        "source": "https://github.com/szl-holdings/szl-invariants",
        "kind": "SOFTWARE",
        "count": 8,
        "passed": len(catalog_ok),
        "failed": [row["id"] for row in failed],
        "ok": not failed,
        "results": results,
        "lambda": "CONJECTURE_1",
        "honesty": "Stdlib receipt checks. Not the torch kernel binary. Not a Λ theorem.",
    }


def _add_cycle_binds(
    results: list[dict[str, Any]],
    receipt: EvidenceReceipt,
    incoming: EvidenceReceipt | None,
    payload: Mapping[str, Any],
) -> None:
    try:
        axes = [AxisEvidence.from_mapping(row) for row in payload.get("axes") or []]
        threshold = float(payload.get("threshold") or 0.7)
        recomputed = evaluate_lambda_gate(axes, threshold=threshold)
        bind_ok = (
            recomputed.verdict == payload.get("verdict")
            and scores_match(payload.get("lambdaScore"), recomputed.lambda_score)
            and scores_match(payload.get("arithmeticScore"), recomputed.arithmetic_score)
        )
        bind_note = "declared gate matches recomputation from axes"
    except Exception as exc:  # noqa: BLE001 - fail closed on any recompute error
        bind_ok = False
        bind_note = f"gate recompute failed: {exc}"
        recomputed = None
    _add(results, "G1", "verdict_binds_recomputed_gate", bind_ok, bind_note)

    shadow = payload.get("shadow")
    divergent = bool(payload.get("divergent"))
    if divergent:
        shadow_ok = (
            isinstance(shadow, dict)
            and shadow.get("kind") == "ARITHMETIC_COUNTERFACTUAL"
            and shadow.get("executable") is False
            and payload.get("verdict") != "ALLOW"
        )
        shadow_note = "divergent arithmetic world is recorded and cannot act"
    else:
        shadow_ok = shadow is None or (
            isinstance(shadow, dict) and shadow.get("executable") is False
        )
        shadow_note = "no executable shadow"
    _add(results, "G2", "shadow_not_executable", shadow_ok, shadow_note)

    if incoming is None:
        mono_ok = True
        mono_note = "genesis has no parent deny to honor"
    else:
        parent_verdict = incoming.payload.get("verdict")
        child_verdict = payload.get("verdict")
        blocked = parent_verdict in {"HARD_DENY", "LAMBDA_VETO"}
        mono_ok = not (blocked and child_verdict == "ALLOW")
        mono_note = "ALLOW cannot lift a parent HARD_DENY or LAMBDA_VETO"
    _add(results, "G3", "deny_is_monotonic", mono_ok, mono_note)
