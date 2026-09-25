"""Offline tests for KHIPU-HOLO / ATLAS-KNOT. No network. No weights."""
from __future__ import annotations

import unittest

from khipu_holo import (
    bitcos_bits_per_weight,
    knot,
    rs_encode,
    rs_syndromes,
    verify,
)


PAYLOAD = b"szl-holdings/a11oy@a2244bde + claim:deepseek-v4.1-flash.kv_bytes=890 REPORTED"


class KhipuHoloTests(unittest.TestCase):
    def test_doctrine_locks(self):
        r = knot(PAYLOAD)
        self.assertFalse(r.ready)
        self.assertFalse(r.authorized)
        self.assertEqual(r.energy, "UNAVAILABLE")
        self.assertEqual(r.production_disposition, "HOLD")
        self.assertEqual(r.signing, "UNSIGNED_ATOMIC")
        self.assertFalse(r.inherits_qualification)
        self.assertEqual(r.hop2_composition, "HOLD")
        self.assertEqual(r.phi_label, "MODELED")
        self.assertIsNone(r.bitcos_z)
        self.assertIsNone(r.bitcos_bpw)

    def test_stereotypy_and_verify(self):
        a = knot(PAYLOAD)
        b = knot(PAYLOAD)
        self.assertEqual(a.phi_hex, b.phi_hex)
        self.assertEqual(verify(PAYLOAD, a), "MATCH_SIM")
        self.assertEqual(verify(PAYLOAD + b"x", a), "HOLD")

    def test_rs_syndromes_clean_and_erasure(self):
        r = knot(PAYLOAD)
        self.assertEqual(r.syndromes, [0, 0, 0, 0])
        cw = bytearray.fromhex(r.codeword_hex)
        cw[-1] = 0
        cw[-2] = 0
        self.assertTrue(any(s != 0 for s in rs_syndromes(bytes(cw), 4)))
        self.assertEqual(len(rs_encode(bytes.fromhex(r.phi_hex), 4)), 12)

    def test_second_integrator_labels(self):
        r = knot(PAYLOAD)
        match = knot(PAYLOAD, second_integrator_phi_hex=r.phi_hex)
        hold = knot(PAYLOAD, second_integrator_phi_hex="00" * 8)
        self.assertEqual(match.phi_label, "MATCH")
        self.assertEqual(hold.phi_label, "HOLD")

    def test_bitcos_formula_only(self):
        self.assertIsNone(bitcos_bits_per_weight(None))
        self.assertAlmostEqual(bitcos_bits_per_weight(0.375), 1.625)
        self.assertAlmostEqual(bitcos_bits_per_weight(0.515), 1.485)
        with self.assertRaises(ValueError):
            bitcos_bits_per_weight(1.2)


if __name__ == "__main__":
    unittest.main()
