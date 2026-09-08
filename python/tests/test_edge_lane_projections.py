"""Verify deterministic public/HF projections and the scheduled integration."""
import json
import unittest
from pathlib import Path

from szl_frontier.edge_lane import build_plan

ROOT = Path(__file__).resolve().parents[2]


class EdgeProjectionTests(unittest.TestCase):
    def test_public_and_hf_projections_equal_the_canonical_plan(self):
        expected = json.dumps(build_plan(), sort_keys=True, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
        for relative in ("public/frontier/edge-agent-evaluation.v1.json", "hf/dataset/frontier-edge-agent.v1.json"):
            with self.subTest(path=relative):
                self.assertEqual((ROOT / relative).read_text(encoding="utf-8"), expected)

    def test_existing_watch_includes_edge_evidence_and_complete_coverage(self):
        workflow = (ROOT / ".github/workflows/frontier-watch.yml").read_text(encoding="utf-8")
        self.assertIn("id: edge_scan", workflow)
        self.assertIn("python3 -m szl_frontier.edge_lane watch", workflow)
        self.assertIn("edge-frontier-watch-output.json > combined-frontier-watch-output.json", workflow)
        self.assertIn("EDGE_FRONTIER_SCAN_OUTCOME: ${{ steps.edge_scan.outcome }}", workflow)
        self.assertIn('if [[ "$EDGE_FRONTIER_SCAN_OUTCOME" != "success" ]]', workflow)
        self.assertIn("scripts/open-frontier-alerts.mjs combined-frontier-watch-output.json", workflow)
        self.assertIn("and (.productionPromotion == false)", workflow)

    def test_plan_cannot_claim_promotion_or_measured_performance(self):
        plan = build_plan()
        self.assertEqual(plan["productionDisposition"], "HOLD")
        self.assertIsNone(plan["benchmarks"])
        self.assertFalse(plan["runtimeVerified"])
        self.assertFalse(plan["trainingAuthorized"])
        self.assertEqual(plan["publication"]["source"], "existing protected-main publisher only")


if __name__ == "__main__":
    unittest.main()
