"""Memory Covenant v0.4-draft — reference gateway, policy gate, receipt lake.

Deny-by-default governed memory plane. Stdlib only. UNSIGNED_HONEST:
no signature is ever fabricated; signed DSSE/ECDSA-P256 envelopes come
from szl-receipt per governed-receipt-spec.
"""

__version__ = "0.4.0a1"

from .policy import Policy, PolicyVerdict, ALLOW, REVIEW_REQUIRED, HARD_DENY, DENY
from .lake import ReceiptLake, canonical
from .gateway import (
    CovenantGateway,
    OperationResult,
    Provenance,
    Tier,
    Lifecycle,
)

__all__ = [
    "Policy",
    "PolicyVerdict",
    "ALLOW",
    "REVIEW_REQUIRED",
    "HARD_DENY",
    "DENY",
    "ReceiptLake",
    "canonical",
    "CovenantGateway",
    "OperationResult",
    "Provenance",
    "Tier",
    "Lifecycle",
    "__version__",
]
