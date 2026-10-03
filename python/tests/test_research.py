from __future__ import annotations

import contextlib
import hashlib
import io
import json
import subprocess
import tempfile
import unittest
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path

from szl_frontier.catalog import CatalogLoader
from szl_frontier.cli import run
from szl_frontier.domain import GateState
from szl_frontier.engine import FrontierEngine
from szl_frontier.receipts import EvidenceReceipt, ReceiptFactory
from szl_frontier.research import MAX_EVIDENCE_BYTES, ResearchError, evaluate_research

from helpers import write_manifest


def _stamp(value: datetime) -> str:
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


class ResearchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source_temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.source_temp.cleanup)
        cls.source = Path(cls.source_temp.name) / "source"
        cls.source.mkdir()
        cls._git("init", "-q")
        cls._git("config", "user.name", "Fixture")
        cls._git("config", "user.email", "fixture@example.test")
        (cls.source / "README.md").write_text("Pinned source\n", encoding="utf-8")
        cls._git("add", "README.md")
        cls._git("commit", "-qm", "fixture")
        cls._git("remote", "add", "origin", "https://github.com/szl-holdings/szl-frontier.git")
        cls.revision = cls._git("rev-parse", "HEAD").stdout.strip()

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.now = datetime.now(timezone.utc).replace(microsecond=0)
        self.evidence = self._file("baseline.json", b'{"metrics":{"task_success_rate":0.4}}\n')
        self.observation = self._file("candidate.json", b'{"metrics":{"task_success_rate":0.6}}\n')
        self.proposal = {
            "schema": "szl.frontier.research-proposal.v1",
            "proposalId": "task-success-eval",
            "authority": "evaluation-only",
            "productionPromotion": False,
            "dataUse": "evaluation-only",
            "source": {"repository": "szl-holdings/szl-frontier", "revision": self.revision},
            "hypothesis": "A bounded candidate improves held-out task success.",
            "claims": [{"text": "The fixture records the baseline.", "evidenceIds": ["baseline"]}],
            "evidence": [self._entry("baseline", "baseline.json", self.evidence)],
            "metrics": [{
                "name": "task_success_rate", "direction": "higher", "baseline": 0.4,
                "minDelta": 0.1, "baselineEvidenceId": "baseline",
            }],
            "stopConditions": ["unsupported-claim", "authority-bypass"],
            "maxRuntimeSeconds": 600,
            "targetPaths": ["python/szl_frontier/evaluation.py"],
        }
        self._proposal()
        self.result = {
            "schema": "szl.frontier.research-result.v1",
            "proposalSha256": self.proposal_hash,
            "authority": "evaluation-only",
            "productionPromotion": False,
            "observations": [self._entry("candidate", "candidate.json", self.observation)],
            "metrics": [{
                "name": "task_success_rate", "value": 0.6,
                "observationEvidenceId": "candidate",
            }],
            "triggeredStops": [],
            "elapsedSeconds": 45,
        }
        self._result()

    @classmethod
    def _git(cls, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["git", "-C", str(cls.source), *args],
            check=True, capture_output=True, text=True,
        )

    def _file(self, name: str, raw: bytes) -> str:
        (self.root / name).write_bytes(raw)
        return hashlib.sha256(raw).hexdigest()

    def _entry(self, identity: str, path: str, digest: str) -> dict[str, str]:
        return {
            "id": identity,
            "path": path,
            "sha256": digest,
            "observedAt": _stamp(self.now - timedelta(days=1)),
            "expiresAt": _stamp(self.now + timedelta(days=1)),
        }

    def _proposal(self) -> None:
        raw = (json.dumps(self.proposal, sort_keys=True) + "\n").encode()
        (self.root / "proposal.json").write_bytes(raw)
        self.proposal_hash = hashlib.sha256(raw).hexdigest()

    def _result(self) -> None:
        self.result["proposalSha256"] = self.proposal_hash
        (self.root / "result.json").write_text(
            json.dumps(self.result, sort_keys=True) + "\n", encoding="utf-8",
        )

    def _candidate(self, value: float) -> None:
        raw = (json.dumps({"metrics": {"task_success_rate": value}}) + "\n").encode()
        self.result["observations"][0]["sha256"] = self._file("candidate.json", raw)
        self.result["metrics"][0]["value"] = value

    def _evaluate(self, *, result: bool = True) -> dict:
        return evaluate_research(
            self.root, self.source, "proposal.json", "result.json" if result else None,
            now=self.now,
        )

    def test_pass_binds_source_evidence_and_unsigned_non_authorizing_receipt(self) -> None:
        report = self._evaluate()
        self.assertEqual(report["status"], "PASS")
        self.assertFalse(report["productionPromotion"])
        self.assertEqual(report["claimValidation"], "REFERENCE_CLOSURE_ONLY")
        receipt = EvidenceReceipt.from_mapping(report["receipt"])
        receipt.verify()
        self.assertFalse(receipt.sealed)
        self.assertEqual(receipt.subject, "frontier-research-evaluation-only")
        self.assertFalse(receipt.payload["productionAuthorized"])
        self.assertEqual(receipt.payload["source"]["revision"], self.revision)

    def test_proposal_check_has_no_result_claim(self) -> None:
        report = self._evaluate(result=False)
        self.assertEqual(report["status"], "PROPOSAL_CHECKED")
        self.assertNotIn("receipt", report)

    def test_metric_failure_and_stop_condition_are_holds(self) -> None:
        self._candidate(0.49)
        self.result["triggeredStops"] = ["authority-bypass"]
        self.result["elapsedSeconds"] = 601
        self._result()
        report = self._evaluate()
        self.assertEqual(report["status"], "HOLD")
        self.assertEqual(
            set(report["reasons"]),
            {"metric:task_success_rate", "stop:authority-bypass", "runtime-limit-exceeded"},
        )
        self.assertEqual(report["receipt"]["payload"]["status"], "HOLD")

    def test_claim_reference_must_resolve_to_retained_evidence(self) -> None:
        self.proposal["claims"][0]["evidenceIds"] = ["invented"]
        self._proposal()
        with self.assertRaisesRegex(ResearchError, "unknown evidence"):
            self._evaluate(result=False)

    def test_stale_future_and_overlong_evidence_are_rejected(self) -> None:
        item = self.proposal["evidence"][0]
        for observed, expires in (
            (self.now - timedelta(days=3), self.now - timedelta(days=1)),
            (self.now + timedelta(days=1), self.now + timedelta(days=2)),
            (self.now - timedelta(days=1), self.now + timedelta(days=31)),
        ):
            with self.subTest(observed=observed):
                item["observedAt"] = _stamp(observed)
                item["expiresAt"] = _stamp(expires)
                self._proposal()
                with self.assertRaises(ResearchError):
                    self._evaluate(result=False)

    def test_noncanonical_time_and_evidence_path_escape_are_rejected(self) -> None:
        item = self.proposal["evidence"][0]
        item["observedAt"] = "2026-1-02T12:00:00Z"
        self._proposal()
        with self.assertRaisesRegex(ResearchError, "UTC RFC 3339"):
            self._evaluate(result=False)
        item["observedAt"] = _stamp(self.now - timedelta(days=1))
        item["path"] = "../outside.json"
        self._proposal()
        with self.assertRaisesRegex(ResearchError, "escapes its root"):
            self._evaluate(result=False)

    def test_evidence_tamper_and_result_binding_fail_closed(self) -> None:
        (self.root / "baseline.json").write_bytes(b'{"metrics":{"task_success_rate":0.9}}\n')
        with self.assertRaisesRegex(ResearchError, "digest mismatch"):
            self._evaluate(result=False)
        (self.root / "baseline.json").write_bytes(b'{"metrics":{"task_success_rate":0.4}}\n')
        self.result["proposalSha256"] = "0" * 64
        (self.root / "result.json").write_text(json.dumps(self.result), encoding="utf-8")
        with self.assertRaisesRegex(ResearchError, "not bound"):
            self._evaluate()

    def test_oversized_evidence_is_rejected(self) -> None:
        self.proposal["evidence"][0]["sha256"] = self._file(
            "baseline.json", b"x" * (MAX_EVIDENCE_BYTES + 1),
        )
        self._proposal()
        with self.assertRaisesRegex(ResearchError, "byte budget exceeded"):
            self._evaluate(result=False)

    def test_metric_claim_must_match_hashed_summary_bytes(self) -> None:
        self.proposal["metrics"][0]["baseline"] = 0.5
        self._proposal()
        with self.assertRaisesRegex(ResearchError, "baseline differs"):
            self._evaluate(result=False)
        self.proposal["metrics"][0]["baseline"] = 0.4
        self._proposal()
        self.result["metrics"][0]["value"] = 0.5
        self._result()
        with self.assertRaisesRegex(ResearchError, "result metric differs"):
            self._evaluate()

    def test_duplicate_and_nonfinite_json_are_rejected(self) -> None:
        (self.root / "proposal.json").write_bytes(b'{"schema":"a","schema":"b"}')
        with self.assertRaisesRegex(ResearchError, "duplicate JSON key"):
            self._evaluate(result=False)
        self.proposal["metrics"][0]["baseline"] = float("inf")
        self._proposal()
        with self.assertRaisesRegex(ResearchError, "nonfinite"):
            self._evaluate(result=False)
        self.proposal["metrics"][0]["baseline"] = 0.4
        self._proposal()
        raw = (self.root / "proposal.json").read_bytes().replace(b'"baseline": 0.4', b'"baseline": 1e999')
        (self.root / "proposal.json").write_bytes(raw)
        with self.assertRaisesRegex(ResearchError, "nonfinite"):
            self._evaluate(result=False)

    def test_invalid_authority_and_unsafe_paths_are_rejected(self) -> None:
        for field, value in (
            ("productionPromotion", True),
            ("dataUse", "model-training"),
            ("targetPaths", ["../outside.py"]),
        ):
            with self.subTest(field=field):
                original = self.proposal[field]
                self.proposal[field] = value
                self._proposal()
                with self.assertRaises(ResearchError):
                    self._evaluate(result=False)
                self.proposal[field] = original

    def test_unhashable_direction_and_missing_observation_are_rejected(self) -> None:
        self.proposal["metrics"][0]["direction"] = {"bad": "shape"}
        self._proposal()
        with self.assertRaises(ResearchError):
            self._evaluate(result=False)
        self.proposal["metrics"][0]["direction"] = "higher"
        self._proposal()
        self.result["metrics"][0]["observationEvidenceId"] = "missing"
        self._result()
        with self.assertRaisesRegex(ResearchError, "retained observation"):
            self._evaluate()

    def test_source_mismatch_and_dirty_checkout_are_rejected(self) -> None:
        self.proposal["source"]["revision"] = "0" * 40
        self._proposal()
        with self.assertRaisesRegex(ResearchError, "declared revision"):
            self._evaluate(result=False)
        self.proposal["source"]["revision"] = self.revision
        self._proposal()
        dirty = self.source / "untracked.txt"
        dirty.write_text("dirty", encoding="utf-8")
        self.addCleanup(dirty.unlink, missing_ok=True)
        with self.assertRaisesRegex(ResearchError, "must be clean"):
            self._evaluate(result=False)

    def test_cli_exits_hold_without_catalog_or_provider_access(self) -> None:
        self._candidate(0.45)
        self._result()
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = run([
                "research", "--root", str(self.root), "--source-root", str(self.source),
                "--proposal", "proposal.json", "--result", "result.json",
            ])
        self.assertEqual(code, 3)
        self.assertEqual(json.loads(output.getvalue())["status"], "HOLD")

    def test_even_a_signed_research_receipt_cannot_authorize_production(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            catalog = CatalogLoader(write_manifest(Path(directory) / "manifest.json", releases=[])).load()
        source = catalog.by_id("open-yap-1k-2026-09-03")
        release = replace(
            source, maturity="released", license_posture="clear",
            gates=tuple(replace(gate, state=GateState.PASS) for gate in source.gates),
        )
        engine = FrontierEngine(replace(catalog, releases=(release,)))
        key = b"research-receipt-test"
        signed = ReceiptFactory(hmac_key=key).create(
            release_id=release.id,
            subject="frontier-research-evaluation-only",
            payload={"productionAuthorized": True, "catalogEvaluatedAt": catalog.evaluated_at},
        )
        assessment = engine.assess(release.id, promotion_receipt=signed, hmac_key=key)
        self.assertEqual(assessment.production_disposition.value, "HOLD")


if __name__ == "__main__":
    unittest.main()
