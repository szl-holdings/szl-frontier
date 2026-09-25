"""KHIPU-HOLO / ATLAS-KNOT v0.1 — EVAL only.

The analog trajectory is the signing body.
Poincaré section Φ is the memory. Reed-Solomon locked-8 shards
carry Φ. Verify = re-integrate + RS syndrome. Mismatch = HOLD.

Doctrine v11 LOCKED:
  energy UNAVAILABLE, ready=false, authorized=false,
  productionDisposition=HOLD, signing=UNSIGNED_ATOMIC,
  inheritsQualification=false, hop-2 composition=HOLD,
  phi_label=MODELED unless two integrators MATCH.

Does not load weights, mint DSSE, write Hub, or create Spaces.
Vendor KV/bpw claims stay REPORTED. BITCOS z stays null unless a
local tile histogram is supplied. Never convert z into joules.

Citations (cite, do not vendor):
  Berloff, Attractor-Keyed Memory, arXiv:2603.17049 (v2 2026-06-26)
  Agnuxo1/Holographic-Reservoir Apache-2.0 (SHA-256 sim default)
  Kumar holographic hop-2 failure arXiv:2606.24948
  Intel BITCOS arXiv:2609.16338 (14 Sep 2026)
  prism-ml/Ternary-Bonsai-2-27B-gguf Apache-2.0 (EVAL readout only)
"""
from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass
from typing import Iterable, List, Optional, Sequence, Tuple

LOCKED_8 = ("F1", "F4", "F7", "F11", "F12", "F18", "F19", "F22")
PRIM = 0x11D
EXP = [0] * 512
LOG = [0] * 256
_x = 1
for _i in range(255):
    EXP[_i] = _x
    LOG[_x] = _i
    _x <<= 1
    if _x & 0x100:
        _x ^= PRIM
for _i in range(255, 512):
    EXP[_i] = EXP[_i - 255]


def _gf_mul(a: int, b: int) -> int:
    if a == 0 or b == 0:
        return 0
    return EXP[LOG[a] + LOG[b]]


def _poly_mul(p: List[int], q: List[int]) -> List[int]:
    r = [0] * (len(p) + len(q) - 1)
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            r[i + j] ^= _gf_mul(a, b)
    return r


def _rs_generator(nsym: int) -> List[int]:
    g = [1]
    for i in range(nsym):
        g = _poly_mul(g, [1, EXP[i]])
    return g


def rs_encode(data: bytes, nsym: int = 4) -> bytes:
    g = _rs_generator(nsym)
    msg = list(data) + [0] * nsym
    for i in range(len(data)):
        coef = msg[i]
        if coef:
            for j in range(len(g)):
                msg[i + j] ^= _gf_mul(g[j], coef)
    return bytes(list(data) + msg[-nsym:])


def rs_syndromes(code: bytes, nsym: int = 4) -> List[int]:
    out = []
    for i in range(nsym):
        acc = 0
        for c in code:
            acc = _gf_mul(acc, EXP[i]) ^ c
        out.append(acc)
    return out


def lorenz_rk4(
    state: Tuple[float, float, float],
    dt: float = 0.01,
    sigma: float = 10.0,
    rho: float = 28.0,
    beta: float = 8.0 / 3.0,
) -> Tuple[float, float, float]:
    x, y, z = state

    def f(x: float, y: float, z: float) -> Tuple[float, float, float]:
        return (sigma * (y - x), x * (rho - z) - y, x * y - beta * z)

    k1 = f(x, y, z)
    k2 = f(x + 0.5 * dt * k1[0], y + 0.5 * dt * k1[1], z + 0.5 * dt * k1[2])
    k3 = f(x + 0.5 * dt * k2[0], y + 0.5 * dt * k2[1], z + 0.5 * dt * k2[2])
    k4 = f(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2])
    return (
        x + dt * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) / 6.0,
        y + dt * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) / 6.0,
        z + dt * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) / 6.0,
    )


def key_ic(payload: bytes, base: Tuple[float, float, float] = (0.1, 0.0, 0.0)) -> Tuple[float, float, float]:
    h = hashlib.sha256(payload).digest()
    return (
        base[0] + (h[0] - 127) / 127000.0,
        base[1] + (h[1] - 127) / 127000.0,
        base[2] + (h[2] - 127) / 127000.0,
    )


def poincare_section(
    ic: Tuple[float, float, float],
    steps: int = 8000,
    dt: float = 0.01,
    need: int = 16,
) -> List[Tuple[float, float]]:
    s = ic
    prev = s
    samples: List[Tuple[float, float]] = []
    for _ in range(steps):
        s = lorenz_rk4(s, dt)
        if prev[0] < 0 <= s[0]:
            t = -prev[0] / (s[0] - prev[0] + 1e-18)
            samples.append((prev[1] + t * (s[1] - prev[1]), prev[2] + t * (s[2] - prev[2])))
            if len(samples) >= need:
                break
        prev = s
    return samples


def ternary_quantize(samples: Sequence[Tuple[float, float]]) -> List[Tuple[int, int]]:
    out = []
    for y, z in samples:
        ty = -1 if y < -4 else (1 if y > 4 else 0)
        tz = -1 if z < 24 else (1 if z > 28 else 0)
        out.append((ty, tz))
    return out


def phi_bytes(samples: Sequence[Tuple[float, float]]) -> bytes:
    tq = ternary_quantize(samples[:8])
    if len(tq) < 8:
        raise RuntimeError("HOLD: Poincaré under-sampled")
    raw = bytearray(8)
    for i, (ty, tz) in enumerate(tq):
        raw[i] = ((ty + 1) << 4) | (tz + 1)
    return bytes(raw)


def bitcos_bits_per_weight(zero_density: Optional[float]) -> Optional[float]:
    """Intel BITCOS arXiv:2609.16338: bits/weight = 2 - z.
    Returns None when z is unmeasured. Never a joule."""
    if zero_density is None:
        return None
    if not (0.0 <= zero_density <= 1.0):
        raise ValueError("zero_density must be in [0,1]")
    return 2.0 - float(zero_density)


@dataclass(frozen=True)
class KnotReceipt:
    scheme: str
    formula_id: str
    analog_backend: str
    payload_sha256: str
    phi_hex: str
    phi_label: str
    codeword_hex: str
    syndromes: List[int]
    energy: str
    ready: bool
    authorized: bool
    production_disposition: str
    signing: str
    inherits_qualification: bool
    hop2_composition: str
    bitcos_z: Optional[float]
    bitcos_bpw: Optional[float]
    notes: str

    def as_dict(self) -> dict:
        return asdict(self)


def knot(
    payload: bytes,
    *,
    bitcos_z: Optional[float] = None,
    second_integrator_phi_hex: Optional[str] = None,
) -> KnotReceipt:
    samples = poincare_section(key_ic(payload))
    phi = phi_bytes(samples)
    codeword = rs_encode(phi, nsym=4)
    syn = rs_syndromes(codeword, 4)
    phi_label = "MODELED"
    if second_integrator_phi_hex is not None:
        phi_label = "MATCH" if second_integrator_phi_hex == phi.hex() else "HOLD"
    return KnotReceipt(
        scheme="KHIPU-HOLO/ATLAS-KNOT v0.1 EVAL",
        formula_id=",".join(LOCKED_8),
        analog_backend="nexus-sim",
        payload_sha256=hashlib.sha256(payload).hexdigest(),
        phi_hex=phi.hex(),
        phi_label=phi_label,
        codeword_hex=codeword.hex(),
        syndromes=syn,
        energy="UNAVAILABLE",
        ready=False,
        authorized=False,
        production_disposition="HOLD",
        signing="UNSIGNED_ATOMIC",
        inherits_qualification=False,
        hop2_composition="HOLD",
        bitcos_z=bitcos_z,
        bitcos_bpw=bitcos_bits_per_weight(bitcos_z),
        notes=(
            "sim-backend only; analog-digital twin MATCH not claimed; "
            "no joule; no new Space; vendor claims stay REPORTED"
        ),
    )


def verify(payload: bytes, receipt: KnotReceipt) -> str:
    again = knot(payload, bitcos_z=receipt.bitcos_z)
    if again.phi_hex != receipt.phi_hex or again.codeword_hex != receipt.codeword_hex:
        return "HOLD"
    if any(s != 0 for s in receipt.syndromes):
        return "HOLD"
    return "MATCH_SIM"


CLAIM_CLASS = {
    "prism-ml/Ternary-Bonsai-2-27B-gguf": {
        "license": "Apache-2.0",
        "bpw_card": 1.72,
        "bpw_class": "REPORTED",
        "inheritsQualification": False,
    },
    "deepseek-ai/DeepSeek-V4.1-Flash": {
        "license": "MIT",
        "kv_bytes_per_token_card": 890,
        "kv_class": "REPORTED",
        "inheritsQualification": False,
    },
    "deepgrove/maple-preview": {
        "license": "MIT",
        "inheritsQualification": False,
    },
}
