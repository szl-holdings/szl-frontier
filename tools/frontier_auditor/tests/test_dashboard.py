"""Safety and evidence boundary tests for the offline dashboard."""

import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import unittest


MODULE_PATH = Path(__file__).resolve().parents[1] / "frontier_dashboard.py"
SPEC = importlib.util.spec_from_file_location("frontier_dashboard", MODULE_PATH)
dashboard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(dashboard)


class DashboardTests(unittest.TestCase):
    def extract_data(self, html):
        match = re.search(
            r'<script id="frontier-data" type="application/json">(.*?)</script>',
            html,
            re.DOTALL | re.IGNORECASE,
        )
        self.assertIsNotNone(match)
        return match.group(1), json.loads(match.group(1))

    def test_hostile_remote_text_cannot_end_json_script(self):
        hostile = '</script><script>alert("x")</script>&\u2028\u2029'
        manifest = {"github": [{"name": hostile}], "errors": [hostile]}
        html = dashboard.render_dashboard(manifest, {}, [{"message": hostile}])
        encoded, decoded = self.extract_data(html)
        self.assertNotIn("<", encoded)
        self.assertNotIn(">", encoded)
        self.assertNotIn("&", encoded)
        self.assertNotIn("\u2028", encoded)
        self.assertNotIn("\u2029", encoded)
        self.assertEqual(decoded["manifest"], manifest)
        self.assertEqual(decoded["findings"][0]["message"], hostile)
        self.assertEqual(html.count("</script>"), 2)

    def test_json_unicode_roundtrips(self):
        manifest = {"github": [{"name": "SZL/Δ-evidence", "license": None}]}
        _, data = self.extract_data(dashboard.render_dashboard(manifest, {}, []))
        self.assertEqual(data["manifest"], manifest)

    def test_no_dynamic_html_or_background_network(self):
        html = dashboard.render_dashboard({}, {}, [])
        for unsafe in [".innerHTML", ".outerHTML", "insertAdjacentHTML", "document.write", "eval(", "fetch(", "XMLHttpRequest", "WebSocket("]:
            self.assertNotIn(unsafe, html)
        self.assertIn("connect-src 'none'", html)
        self.assertIn("url.protocol===\"https:\"||url.protocol===\"http:\"", html)
        self.assertIn('link.rel="noopener noreferrer"', html)
        self.assertNotRegex(html, r'<(?:script|link|img)\b[^>]+(?:src|href)=["\']https?:')

    def test_integrity_defaults_to_cli_and_remains_unsigned(self):
        html = dashboard.render_dashboard({}, {}, [])
        _, data = self.extract_data(html)
        self.assertIsNone(data["verification"])
        self.assertIn('id="integrityStatus">Verify with CLI</span>', html)
        self.assertIn("This bundle is unsigned.", html)
        self.assertIn("data.verification.pass===true", html)
        self.assertIn("Snapshot integrity verified at generation", html)
        self.assertIn("--expected-bundle-sha256 HASH", html)

    def test_verification_is_data_not_rendered_markup(self):
        receipt = {"pass": True, "reason": "</script><img src=x>"}
        html = dashboard.render_dashboard({}, {}, [], receipt)
        _, data = self.extract_data(html)
        self.assertEqual(data["verification"], receipt)
        self.assertEqual(html.count("</script>"), 2)

    def test_accessibility_and_scope_boundaries_are_present(self):
        html = dashboard.render_dashboard({}, {}, [])
        for expected in [
            'href="#main"', 'aria-live="polite"', 'aria-labelledby="detailsTitle"',
            'type="search"', 'prefers-reduced-motion:reduce', 'max-width:600px',
            "Readiness: UNKNOWN", "No background requests. No live refresh.",
            "No assets were collected.", "dialog.showModal()",
        ]:
            self.assertIn(expected, html)

    def test_non_json_numbers_are_rejected(self):
        with self.assertRaises(ValueError):
            dashboard.render_dashboard({"invalid": float("nan")}, {}, [])

    def test_render_is_deterministic_and_does_not_mutate_input(self):
        manifest = {"status": "PARTIAL", "github": [{"name": "a", "revision": {"commit_sha": "abc"}}]}
        before = json.dumps(manifest, sort_keys=True)
        first = dashboard.render_dashboard(manifest, {}, [])
        self.assertEqual(first, dashboard.render_dashboard(manifest, {}, []))
        self.assertEqual(json.dumps(manifest, sort_keys=True), before)

    def run_dashboard_script(self, manifest, assertions, plan=None):
        """Exercise the actual script against a small DOM adapter, not a browser."""
        node = shutil.which("node")
        if not node:
            self.skipTest("Node is unavailable; dashboard JS behavior was NOT RUN")
        html = dashboard.render_dashboard(manifest, plan or {}, [])
        encoded, _ = self.extract_data(html)
        script = re.search(r"<script>(.*?)</script>", html, re.DOTALL).group(1)
        ids = re.findall(r'\bid="([^"]+)"', html)
        adapter = r"""
const assert=require('node:assert/strict'), vm=require('node:vm');
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.ownText='';this.value='';this.events={};this.classList={add:()=>{}};this.disabled=false;}
 set textContent(value){this.ownText=String(value);this.children=[];}
 get textContent(){return this.ownText+this.children.map(c=>c.textContent).join('');}
 append(...children){for(const child of children){if(child.tag==='#fragment')this.children.push(...child.children);else this.children.push(child);}}
 replaceChildren(...children){this.children=[];this.ownText='';this.append(...children);}
 setAttribute(name,value){this[name]=value;}
 addEventListener(name,fn){this.events[name]=fn;}
 querySelector(tag){return this.children.find(c=>c.tag===tag)||new Element(tag);}
 showModal(){this.open=true;}close(){this.open=false;}focus(){}
}
class FixedDate extends Date {static now(){return Date.parse('2026-10-05T14:09:27Z');}}
const elements=Object.fromEntries(IDS.map(id=>[id,new Element()]));
elements['frontier-data'].textContent=DATA;
const document={getElementById:id=>elements[id],createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('#fragment')};
vm.runInNewContext(SCRIPT,{document,Date:FixedDate,URL,setTimeout:fn=>fn()});
const get=id=>elements[id];
"""
        program = (
            "const IDS=" + json.dumps(ids) + ";const DATA=" + json.dumps(encoded)
            + ";const SCRIPT=" + json.dumps(script) + ";\n" + adapter + assertions
        )
        result = subprocess.run(
            [node, "-"], input=program, text=True, capture_output=True,
            encoding="utf-8", timeout=15, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_script_separates_coverage_and_evidence_and_dates_snapshot(self):
        manifest = {
            "generated_at": "2026-09-19T14:09:27Z", "status": "PARTIAL",
            "github": [{"name": "coverage-only", "audit_state": "OBSERVED"}],
            "huggingface": {"models": [{
                "id": "fixture/legacy", "audit_state": "PARTIAL",
                "evidence_class": "REPORTED",
            }]},
        }
        self.run_dashboard_script(manifest, r"""
assert.equal(get('snapshotStatus').textContent,'Collection coverage: PARTIAL');
assert.match(get('snapshotAge').textContent,/Saved on 2026-09-19.*16 days old.*refresh for current state/);
const rows=get('assetRows').children;
assert.match(rows[0].children[2].textContent,/OBSERVEDEvidence: UNKNOWN/);
assert.match(rows[1].children[2].textContent,/PARTIALEvidence: DECLARED/);
assert.deepEqual(get('status').children.map(option=>option.value),['OBSERVED','PARTIAL']);
rows[1].children[0].children[0].events.click();
assert.equal(get('assetDialog').open,true);
assert.match(get('detailsBody').textContent,/Evidence classDECLARED/);
assert.match(get('detailsBody').textContent,/legacy REPORTED label/);
""")

    def test_script_paginates_all_results_and_resets_on_filter(self):
        manifest = {"github": [
            {"name": "fixture-" + str(index), "audit_state": "OBSERVED", "evidence_class": "DECLARED"}
            for index in range(121)
        ]}
        self.run_dashboard_script(manifest, r"""
assert.equal(get('assetRows').children.length,50);
assert.equal(get('visibleCount').textContent,'121 of 121 assets');
assert.equal(get('pageSummary').textContent,'Rows 1–50 · Page 1 of 3');
assert.equal(get('previousPage').disabled,true);
get('nextPage').events.click();get('nextPage').events.click();
assert.equal(get('assetRows').children.length,21);
assert.equal(get('pageSummary').textContent,'Rows 101–121 · Page 3 of 3');
assert.equal(get('nextPage').disabled,true);
get('search').value='fixture-120';get('search').events.input();
assert.equal(get('assetRows').children.length,1);
assert.equal(get('visibleCount').textContent,'1 of 121 assets');
assert.equal(get('pageSummary').textContent,'Rows 1–1 · Page 1 of 1');
get('search').value='no-match';get('search').events.input();
assert.equal(get('pageSummary').textContent,'0 rows');
assert.equal(get('visibleCount').textContent,'0 of 121 assets');
assert.equal(get('nextPage').disabled,true);
assert.equal(get('previousPage').disabled,true);
""")

    def test_script_invalid_and_future_dates_do_not_invent_age(self):
        self.run_dashboard_script({"generated_at": "not-a-date"}, r"""
assert.doesNotMatch(get('snapshotAge').textContent,/days old/);
""")
        self.run_dashboard_script({"generated_at": "2026-10-06T14:09:27Z"}, r"""
assert.match(get('snapshotAge').textContent,/ahead of this device.*age UNKNOWN/);
assert.doesNotMatch(get('snapshotAge').textContent,/-1 days/);
""")

    def test_plan_reference_matches_written_artifact(self):
        html = dashboard.render_dashboard({}, {}, [])
        self.assertIn("recorded in migration_plan.json.", html)
        self.assertNotIn("recorded in plan.json.", html)


if __name__ == "__main__":
    unittest.main()
