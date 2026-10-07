"""Dependency-free, offline rendering for observed SZL Frontier evidence.

The dashboard is a view of a saved snapshot, not a source of deployment claims.
Remote values are embedded as inert JSON and rendered only with textContent.
"""

from __future__ import annotations

import json
from typing import Any


def _safe_json(value: Any) -> str:
    """Encode JSON for a script data block without permitting HTML termination."""
    return (
        json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
        .replace("&", "\\u0026")
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def render_dashboard(
    manifest: dict,
    plan: dict,
    findings: list,
    verification: dict | None = None,
) -> str:
    """Return a standalone HTML dashboard; this function performs no I/O.

    A successful verification is deliberately narrowly scoped to checksum
    integrity at generation time. It never establishes authenticity, current
    provider state, publication authority, or runtime readiness.
    """
    payload = {
        "manifest": manifest,
        "plan": plan,
        "findings": findings,
        "verification": verification,
    }
    return _HTML.replace("__FRONTIER_DATA__", _safe_json(payload))


_HTML = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; base-uri 'none'; form-action 'none'">
<title>SZL Frontier · Estate evidence</title>
<style>
:root{--bg:#080f1a;--panel:#101b2b;--raised:#152236;--border:#28364b;--text:#eef3fb;--muted:#a7b6cb;--dim:#91a3be;--teal:#68e2c5;--amber:#efc37b;--red:#f5a0ac;--radius:16px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-size:14px;line-height:1.55}button,input,select{font:inherit}button,a,input,select,summary{outline-offset:4px}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--teal)}button{cursor:pointer}a{color:var(--teal);text-decoration-thickness:1px;text-underline-offset:4px}a:hover{color:#a7f7e4}button:disabled{cursor:default}::selection{background:#1e6b60;color:white}.skip{position:fixed;left:14px;top:-70px;z-index:10;background:var(--teal);color:#08121c;padding:10px 16px;border-radius:8px}.skip:focus{top:12px}.shell{max-width:1440px;margin:0 auto;padding:0 44px}.masthead{height:86px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid var(--border)}.brand{display:flex;align-items:center;gap:12px;font-size:13px;letter-spacing:.2em;font-weight:750}.mark{width:30px;height:30px;display:grid;grid-template-columns:1fr 1fr;gap:4px;transform:rotate(-8deg)}.mark i{background:var(--teal);border-radius:2px}.mark i:nth-child(2){opacity:.3}.mark i:nth-child(3){opacity:.55}.nav{display:flex;gap:24px;align-items:center}.nav a{font-size:12px;color:var(--muted);text-decoration:none}.nav a:hover{color:var(--text)}.pill{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--border);border-radius:100px;padding:5px 10px;font-size:11px;font-weight:650;letter-spacing:.025em;max-width:100%;overflow-wrap:anywhere}.pill::before{content:"";width:5px;height:5px;flex:none;border-radius:50%;background:currentColor}.teal{color:var(--teal)}.amber{color:var(--amber)}.red{color:var(--red)}.muted{color:var(--muted)}.eyebrow{color:var(--teal);font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:700}.hero{padding:44px 0 28px;display:flex;align-items:flex-end;justify-content:space-between;gap:36px}.hero h1{font-size:clamp(30px,3.6vw,47px);line-height:1.13;letter-spacing:-.055em;margin:13px 0 16px;font-weight:640}.hero p{color:var(--muted);max-width:600px;font-size:14px;margin:0;line-height:1.8}.snapshot-meta{min-width:190px;max-width:360px;text-align:right;font-size:12px;color:var(--muted)}.snapshot-meta strong{display:block;font-size:12px;color:var(--text);font-weight:550;margin-top:8px;overflow-wrap:anywhere}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin:10px 0 22px}.metric{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:20px 22px}.metric-label{font-size:12px;color:var(--muted)}.metric strong{display:block;font-weight:550;font-size:34px;line-height:1.25;letter-spacing:-.04em;margin:9px 0 5px}.metric small{font-size:11px;color:var(--muted)}.scope-bar{display:flex;align-items:flex-start;gap:12px;padding:15px 18px;border:1px solid #244f4b;background:#0d2428;border-radius:12px;color:#c3dedc;margin-bottom:30px;font-size:12px}.scope-bar .symbol{font-size:16px;color:var(--teal);line-height:1.3}.scope-bar p{margin:0}.scope-bar strong{color:#e2f3ef;font-weight:600}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:32px 0 15px}.section-heading h2{font-size:19px;font-weight:580;letter-spacing:-.03em;margin:0}.section-heading p{font-size:12px;color:var(--muted);margin:3px 0 0}.count{font-size:12px;color:var(--muted);white-space:nowrap}.inventory{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}.filters{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:18px;border-bottom:1px solid var(--border)}.field{display:flex;flex-direction:column;gap:6px;min-width:140px;flex:1}.field.search{flex:2.2;min-width:220px}.field label{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:650}.field input,.field select{width:100%;border:1px solid #324158;border-radius:8px;background:#0d1726;color:var(--text);height:40px;padding:0 12px}.field input::placeholder{color:var(--dim)}.reset{height:40px;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:8px;padding:0 14px;font-size:12px}.reset:hover{background:var(--raised);color:var(--text)}.table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;min-width:850px}thead{background:#0d1726}th{font-size:10px;font-weight:650;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:13px 20px}td{padding:16px 20px;border-top:1px solid #233044;vertical-align:middle;font-size:12px}tbody tr:hover{background:#152338}.asset-button{background:transparent;padding:0;border:0;color:var(--text);font-weight:620;font-size:12px;text-align:left;word-break:break-word}.asset-button:hover{color:var(--teal)}.subline{display:block;color:var(--muted);font-size:10px;margin-top:4px}.platform-label{font-size:11px}.revision{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#b5c7dd;font-size:11px}.evidence-cell{max-width:260px}.evidence-cell .pill{font-size:10px;padding:3px 8px}.row-count{display:inline-flex;align-items:center;justify-content:center;min-width:25px;height:25px;border-radius:7px;background:#223149;color:var(--muted);font-size:11px}.row-count.flagged{color:var(--amber);background:#393122}.table-footer{display:flex;justify-content:space-between;gap:16px;padding:13px 20px;border-top:1px solid var(--border);color:var(--muted);font-size:11px}.empty{padding:38px 22px;text-align:center;color:var(--muted)}.empty strong{display:block;color:var(--text);font-weight:550;margin-bottom:6px}.lower-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:22px;margin-top:28px}.card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:22px;min-width:0}.card h2{font-size:17px;letter-spacing:-.025em;font-weight:580;margin:0 0 6px}.card-intro{font-size:12px;color:var(--muted);margin:0 0 19px;line-height:1.7}.finding{padding:14px 0;border-top:1px solid var(--border);display:flex;align-items:flex-start;gap:11px}.finding-dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--amber);margin-top:6px}.finding-dot.critical,.finding-dot.high,.finding-dot.error{background:var(--red)}.finding-dot.info,.finding-dot.low{background:var(--muted)}.finding-body{min-width:0;flex:1}.finding-title{font-size:12px;font-weight:570;overflow-wrap:anywhere}.finding-body p{font-size:11px;margin:4px 0 0;color:var(--muted);overflow-wrap:anywhere}.severity{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);flex:none}.task{border-top:1px solid var(--border);padding:15px 0}.task-top{display:flex;justify-content:space-between;gap:10px;font-size:12px;font-weight:600;overflow-wrap:anywhere}.task p{font-size:11px;color:var(--muted);margin:6px 0 0;line-height:1.7}.task ol{font-size:11px;line-height:1.75;color:var(--muted);margin:9px 0 0;padding-left:18px}.priority{color:var(--teal);font-family:ui-monospace,Consolas,monospace;font-size:10px;white-space:nowrap}.integrity{margin:22px 0 34px;background:#0c1725;border:1px solid var(--border);border-radius:var(--radius);padding:21px 22px;display:grid;grid-template-columns:1fr 1.15fr;gap:24px}.integrity h2{font-size:13px;font-weight:600;margin:0 0 8px}.integrity p{font-size:11px;color:var(--muted);line-height:1.7;margin:9px 0 0}.command{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;display:block;background:#07111e;border:1px solid var(--border);border-radius:9px;padding:13px 15px;color:#bdcfe7;font-size:11px;overflow-wrap:anywhere;white-space:pre-wrap}.integrity details{margin-top:12px}.integrity summary{font-size:11px;cursor:pointer;color:var(--muted)}pre{font-size:11px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;color:#bfcee1}.footer{display:flex;justify-content:space-between;gap:20px;color:var(--dim);font-size:10px;letter-spacing:.03em;border-top:1px solid var(--border);padding:20px 0 26px}.footer span:last-child{text-align:right}dialog{position:fixed;inset:0 0 0 auto;margin:0;height:100%;max-height:100%;width:min(550px,100%);max-width:100%;background:var(--panel);color:var(--text);border:0;border-left:1px solid var(--border);padding:0}dialog::backdrop{background:rgba(2,7,15,.7)}.drawer-head{position:sticky;top:0;background:var(--panel);border-bottom:1px solid var(--border);padding:24px;display:flex;justify-content:space-between;align-items:flex-start;gap:14px;z-index:1}.drawer-head h2{font-size:19px;font-weight:580;margin:8px 0 0;word-break:break-word}.close{background:var(--raised);color:var(--text);border:1px solid var(--border);border-radius:8px;width:34px;height:34px;font-size:20px;flex:none}.drawer-body{padding:24px}.drawer-body h3{font-size:12px;margin:26px 0 12px;font-weight:650}.drawer-body p{font-size:12px;color:var(--muted);line-height:1.8}.details-grid{display:grid;grid-template-columns:115px 1fr;gap:12px;font-size:11px;margin:0}.details-grid dt{color:var(--muted)}.details-grid dd{margin:0;overflow-wrap:anywhere}.drawer-body details{border:1px solid var(--border);border-radius:9px;padding:12px;margin-top:24px}.drawer-body summary{cursor:pointer;font-size:12px}.drawer-body pre{margin-bottom:0}.source-link{display:inline-block;font-size:12px;margin-top:20px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}[hidden]{display:none!important}
.snapshot-age{padding:12px 16px;margin:0 0 21px;border:1px solid var(--border);border-left:3px solid var(--amber);border-radius:8px;font-size:12px;color:var(--muted);overflow-wrap:anywhere}.pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;border-top:1px solid var(--border);font-size:11px;color:var(--muted)}.page-actions{display:flex;gap:8px}.page-button{border:1px solid var(--border);background:var(--raised);color:var(--text);padding:7px 11px;border-radius:7px;font-size:11px}.page-button:disabled{opacity:.45}.page-button:not(:disabled):hover{border-color:var(--teal)}
@media(min-width:1600px){.shell{padding:0 55px}.hero{padding-top:54px}.metric{padding:25px}.metrics{gap:18px}}
@media(max-width:900px){.shell{padding:0 24px}.hero{gap:20px}.snapshot-meta{min-width:170px}.lower-grid{grid-template-columns:1fr}.integrity{grid-template-columns:1fr;gap:17px}.metric{padding:18px}.nav{gap:15px}.field{min-width:125px}.field.search{min-width:100%}}
@media(max-width:600px){.shell{padding:0 16px}.masthead{height:72px}.brand{font-size:11px;letter-spacing:.12em;gap:10px}.mark{width:25px;height:25px}.nav a{display:none}.nav .pill{font-size:9px;padding:4px 8px}.hero{display:block;padding:31px 0 22px}.hero h1{font-size:35px}.hero p{font-size:12px}.snapshot-meta{text-align:left;margin-top:21px;max-width:none}.snapshot-meta strong{display:inline;margin-left:6px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.metric{padding:16px}.metric strong{font-size:30px}.metric-label{font-size:11px}.metric small{font-size:10px}.scope-bar{padding:13px;font-size:11px;margin-bottom:25px}.section-heading h2{font-size:18px}.section-heading p{font-size:11px}.filters{padding:13px;gap:10px}.field{flex:1 1 calc(50% - 10px);min-width:0}.field.search{min-width:100%}.reset{flex:1}.table-footer{padding:12px 14px;font-size:10px}.table-footer span:last-child{max-width:130px;text-align:right}.card{padding:18px}.lower-grid{gap:16px}.integrity{padding:18px}.footer{font-size:9px;align-items:flex-start}.drawer-head,.drawer-body{padding:20px}.details-grid{grid-template-columns:93px 1fr;gap:10px}.section-heading{align-items:flex-start}.count{font-size:10px;margin-top:5px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to evidence</a>
<div class="shell">
<header class="masthead"><div class="brand"><span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>SZL / FRONTIER</span></div><nav class="nav" aria-label="Sections"><a href="#inventory">Inventory</a><a href="#gaps">Evidence gaps</a><span class="pill muted">Offline snapshot</span></nav></header>
<main id="main">
<section class="hero" aria-labelledby="pageTitle"><div><div class="eyebrow">Estate evidence workbench</div><h1 id="pageTitle">A clear view of what’s real.</h1><p>Inspect source revisions, provider observations, and unresolved evidence. Every record belongs to this saved collection; readiness requires its own proof.</p></div><div class="snapshot-meta"><span class="pill" id="snapshotStatus">Snapshot</span><strong id="snapshotTime">Collection time unavailable</strong><div id="scopeNames"></div></div></section>
<p class="snapshot-age" id="snapshotAge" role="note">Collection time UNKNOWN; refresh for current state.</p>
<section class="metrics" aria-label="Snapshot totals"><article class="metric"><span class="metric-label">Collected assets</span><strong id="assetTotal">0</strong><small>Within the collected scope</small></article><article class="metric"><span class="metric-label">GitHub repositories</span><strong id="githubTotal">0</strong><small>Source inventory</small></article><article class="metric"><span class="metric-label">Hugging Face assets</span><strong id="hfTotal">0</strong><small>Provider inventory</small></article><article class="metric"><span class="metric-label">Recorded findings</span><strong id="findingTotal">0</strong><small id="findingCaption">Evidence to review</small></article></section>
<div class="scope-bar"><span class="symbol" aria-hidden="true">◈</span><p><strong>Observed does not establish operational readiness.</strong> Repository presence, model files, and a provider runtime label each prove different things. This snapshot does not by itself prove training, publication authority, deployment, or witnessed inference.</p></div>
<section id="inventory" aria-labelledby="inventoryTitle"><div class="section-heading"><div><h2 id="inventoryTitle">Asset inventory</h2><p>Open any asset to inspect its evidence and verification tasks.</p></div><span class="count" id="visibleCount" aria-live="polite"></span></div><div class="inventory"><form class="filters" id="filterForm" role="search"><div class="field search"><label for="search">Find an asset</label><input id="search" type="search" placeholder="Search names, revisions, or findings…" autocomplete="off"></div><div class="field"><label for="platform">Platform</label><select id="platform"><option value="">All platforms</option><option value="GitHub">GitHub</option><option value="Hugging Face">Hugging Face</option></select></div><div class="field"><label for="kind">Kind</label><select id="kind"><option value="">All kinds</option></select></div><div class="field"><label for="status">Collection coverage</label><select id="status"><option value="">All collection coverage</option></select></div><button class="reset" type="reset">Reset</button></form><div class="table-scroll" tabindex="0" role="region" aria-label="Asset inventory table; scroll horizontally on narrow screens"><table><caption class="sr-only">Collected assets, collection coverage, and separate evidence classes. Each asset name opens its evidence details.</caption><thead><tr><th scope="col">Asset</th><th scope="col">Platform / kind</th><th scope="col">Collection coverage</th><th scope="col">Source revision</th><th scope="col">Findings</th></tr></thead><tbody id="assetRows"></tbody></table></div><div class="empty" id="emptyInventory" hidden><strong>No assets match these filters.</strong><span>Clear the search or choose a broader scope.</span></div><div class="pagination"><span id="pageSummary" aria-live="polite"></span><div class="page-actions"><button type="button" id="previousPage" class="page-button" aria-label="Previous asset page">Previous</button><button type="button" id="nextPage" class="page-button" aria-label="Next asset page">Next</button></div></div><div class="table-footer"><span id="collectionMode">Saved observations</span><span>Readiness UNKNOWN</span></div></div></section>
<div class="lower-grid" id="gaps"><section class="card" aria-labelledby="findingsTitle"><h2 id="findingsTitle">Evidence gaps & findings</h2><p class="card-intro">Collection failures and unresolved claims stay visible.</p><div id="findingList"></div><details id="moreFindings" hidden><summary>Show remaining findings</summary><div id="remainingFindings"></div></details></section><section class="card" aria-labelledby="nextTitle"><h2 id="nextTitle">Next verification work</h2><p class="card-intro" id="pilotCaption">No pilot has been qualified by this snapshot.</p><div id="taskList"></div></section></div>
<section class="integrity" aria-labelledby="integrityTitle"><div><h2 id="integrityTitle">Snapshot integrity</h2><span class="pill muted" id="integrityStatus">Verify with CLI</span><p>This bundle is unsigned. Checksum agreement detects changes against the supplied manifest; it does not establish authorship or the truth of a claim. Retain the bundle hash separately to anchor later checks.</p></div><div><code class="command">python szl_frontier_codex.py verify --output &lt;snapshot-directory&gt;
# Optional retained anchor: --expected-bundle-sha256 HASH</code><details><summary>Collection coverage and errors</summary><pre id="coverageDetails"></pre></details></div></section>
</main><footer class="footer"><span>SZL FRONTIER · OBSERVATION → EVIDENCE → VERIFICATION</span><span>No background requests. No live refresh.</span></footer>
</div>
<dialog id="assetDialog" aria-labelledby="detailsTitle"><div class="drawer-head"><div><div class="eyebrow" id="detailsEyebrow">Asset evidence</div><h2 id="detailsTitle"></h2></div><button class="close" id="closeDialog" type="button" aria-label="Close asset details">×</button></div><div class="drawer-body" id="detailsBody"></div></dialog>
<script id="frontier-data" type="application/json">__FRONTIER_DATA__</script>
<script>
"use strict";
(() => {
 const data=JSON.parse(document.getElementById("frontier-data").textContent);
 const manifest=data.manifest||{}, plan=data.plan||{}, rawFindings=Array.isArray(data.findings)?data.findings:[];
 const byId=id=>document.getElementById(id);
 const asArray=value=>Array.isArray(value)?value:[];
 const printable=value=>value===null||value===undefined?"Unavailable":typeof value==="object"?JSON.stringify(value):String(value);
 const human=value=>printable(value).replace(/_/g," ");
 const node=(tag,text,cls)=>{const item=document.createElement(tag);if(text!==undefined)item.textContent=printable(text);if(cls)item.className=cls;return item;};
 const evidenceTone=value=>/fail|error|missing|blocked|unknown|unavailable|partial|truncat/i.test(value)?"amber":"muted";
 const evidenceLabels=new Set(["MEASURED","REPORTED","DECLARED","SIMULATED","SAMPLE","MODELED","ROADMAP","UNKNOWN","UNAVAILABLE","BLOCKED"]);
 const evidenceClass=item=>{const label=item.evidence_class;if(label==="REPORTED")return "DECLARED";return evidenceLabels.has(label)?label:"UNKNOWN";};
 const identity=item=>item.id||item.full_name||((item.owner&&item.name&&!String(item.name).includes("/"))?item.owner+"/"+item.name:item.name)||"Unnamed asset";
 const revision=item=>{const r=item.revision;if(r&&typeof r==="object")return r.commit_sha||r.sha||r.tree_sha||"Unavailable";return r||item.default_branch_sha||item.sha||"Unavailable";};
 const normalizeFinding=f=>typeof f==="object"&&f!==null?f:{code:"COLLECTION_ERROR",message:printable(f),severity:"error",platform:"Collection"};
 const findings=rawFindings.map(normalizeFinding);
 const errors=asArray(manifest.errors).map(normalizeFinding);
 const assets=[];
 for(const item of asArray(manifest.github))assets.push({raw:item,name:identity(item),platform:"GitHub",kind:"repository",status:item.audit_state||"UNKNOWN",evidence:evidenceClass(item),revision:revision(item)});
 const hf=manifest.huggingface||{};
 for(const [collection,kind] of [["models","model"],["datasets","dataset"],["spaces","space"],["collections","collection"]])for(const item of asArray(hf[collection]))assets.push({raw:item,name:identity(item),platform:"Hugging Face",kind:item.kind||kind,status:item.audit_state||"UNKNOWN",evidence:evidenceClass(item),revision:revision(item)});
 const matchesAsset=(finding,asset)=>{
   if(finding.platform){const platform=String(finding.platform).toLowerCase().replace(/[ _-]/g,"");if(platform!==asset.platform.toLowerCase().replace(/[ _-]/g,"")&&!(platform==="hf"&&asset.platform==="Hugging Face"))return false;}
   const target=String(finding.asset||finding.repo_id||finding.repository||"");
   return target!==""&&(target===asset.name||target===asset.raw.name||target===asset.raw.id||target===asset.raw.full_name);
 };
 for(const asset of assets){asset.findings=findings.filter(f=>matchesAsset(f,asset));asset.search=[asset.name,asset.platform,asset.kind,asset.status,asset.evidence,asset.revision,asset.raw.archetype,...asset.findings.map(f=>f.code)].join(" ").toLowerCase();}
 byId("assetTotal").textContent=assets.length.toLocaleString();
 byId("githubTotal").textContent=assets.filter(a=>a.platform==="GitHub").length.toLocaleString();
 byId("hfTotal").textContent=assets.filter(a=>a.platform==="Hugging Face").length.toLocaleString();
 byId("findingTotal").textContent=findings.length.toLocaleString();
 byId("findingCaption").textContent=errors.length?errors.length+" collection error"+(errors.length===1?"":"s")+" also recorded":"Evidence to review";
 const snapshotStatus=manifest.status||"UNKNOWN";
 byId("snapshotStatus").textContent="Collection coverage: "+human(snapshotStatus);
 byId("snapshotStatus").className="pill "+(snapshotStatus==="OBSERVED"?"teal":"amber");
 byId("snapshotTime").textContent=manifest.generated_at?printable(manifest.generated_at):"Collection time unavailable";
 const savedAt=Date.parse(manifest.generated_at),ageMs=Date.now()-savedAt;
 if(Number.isFinite(savedAt)&&ageMs>=0){const ageDays=Math.floor(ageMs/86400000),ageHours=Math.floor(ageMs/3600000),ageText=ageDays>0?ageDays+" day"+(ageDays===1?"":"s")+" old":ageHours>0?ageHours+" hour"+(ageHours===1?"":"s")+" old":"less than one hour old";byId("snapshotAge").textContent="Saved on "+new Date(savedAt).toISOString().replace("T"," ").replace(".000Z"," UTC")+" ("+ageText+" at page load, using this device’s clock); refresh for current state.";}
 else if(Number.isFinite(savedAt)){byId("snapshotAge").textContent="Saved on "+printable(manifest.generated_at)+"; timestamp is ahead of this device’s clock. Snapshot age UNKNOWN; refresh for current state.";}
 byId("scopeNames").textContent=[manifest.github_org,manifest.huggingface_org].filter(Boolean).join(" / ");
 byId("collectionMode").textContent=manifest.mode?human(manifest.mode)+" · saved observations":"Saved observations";
 byId("coverageDetails").textContent=JSON.stringify({coverage:manifest.coverage||{},endpoint_coverage:manifest.endpoint_coverage||{},errors:manifest.errors||[]},null,2);
 if(data.verification&&data.verification.pass===true){byId("integrityStatus").textContent="Snapshot integrity verified at generation";byId("integrityStatus").className="pill teal";}
 const addOptions=(id,values)=>{for(const value of [...new Set(values)].sort((a,b)=>String(a).localeCompare(String(b)))){const option=node("option",human(value));option.value=String(value);byId(id).append(option);}};
 addOptions("kind",assets.map(a=>a.kind));addOptions("status",assets.map(a=>a.status));
 const renderFinding=(finding)=>{const row=node("div",undefined,"finding"),severity=String(finding.severity||(finding.error?"error":"info")).toLowerCase(),dot=node("span",undefined,"finding-dot");if(["critical","high","error","info","low"].includes(severity))dot.classList.add(severity);dot.setAttribute("aria-hidden","true");const body=node("div",undefined,"finding-body");body.append(node("div",human(finding.code||finding.title||"Evidence gap"),"finding-title"));const context=[finding.platform,finding.asset||finding.scope,finding.path].filter(Boolean).map(printable).join(" · ");if(context)body.append(node("p",context));const description=finding.message||finding.description||finding.detail||finding.reason||(finding.evidence&&finding.evidence.detail)||finding.claim_scope;if(description)body.append(node("p",description));row.append(dot,body,node("span",severity,"severity"));return row;};
 const allFindings=[...findings,...errors.filter(error=>!findings.some(finding=>finding.evidence&&finding.evidence.scope===error.scope&&error.scope))];
 if(!allFindings.length)byId("findingList").append(node("p","No findings were recorded. This does not establish that all evidence has been collected.","card-intro"));
 allFindings.forEach((finding,index)=>byId(index<8?"findingList":"remainingFindings").append(renderFinding(finding)));
 if(allFindings.length>8){byId("moreFindings").hidden=false;byId("moreFindings").querySelector("summary").textContent="Show "+(allFindings.length-8)+" more findings";}
 const ranked=asArray(plan.github_ranked);
 if(plan.pilot_candidate)byId("pilotCaption").textContent="Proposed pilot: "+printable(plan.pilot_candidate)+". Qualification requires the verification tasks below.";
 if(!ranked.length)byId("taskList").append(node("p","No ranked verification tasks were supplied. Inspect collection coverage before selecting a pilot.","card-intro"));
 for(const task of ranked.slice(0,5)){const card=node("div",undefined,"task"),top=node("div",undefined,"task-top");top.append(node("span",task.asset||task.name||"Verification task"),node("span",task.priority===undefined?"REVIEW":"Score "+printable(task.priority),"priority"));card.append(top);if(asArray(task.reasons).length)card.append(node("p",task.reasons.map(printable).join(" · ")));const steps=asArray(task.verification_tasks);if(steps.length){const list=node("ol");for(const step of steps)list.append(node("li",typeof step==="object"?(step.description||step.task||step.name||printable(step)):step));card.append(list);}if(task.eligible_for_pilot!==true)card.append(node("p","Pilot eligibility not established."));byId("taskList").append(card);}
 if(ranked.length>5)byId("taskList").append(node("p",(ranked.length-5)+" additional ranked assets are recorded in migration_plan.json.","card-intro"));
 const addDetail=(list,label,value)=>{list.append(node("dt",label),node("dd",value));};
 const dialog=byId("assetDialog");
 const openAsset=asset=>{
   byId("detailsTitle").textContent=asset.name;byId("detailsEyebrow").textContent=asset.platform+" / "+human(asset.kind);
   const body=byId("detailsBody");body.replaceChildren();
   body.append(node("span","Collection coverage: "+human(asset.status),"pill "+evidenceTone(asset.status)));
   body.append(node("p","This record captures observed evidence at collection time. Operational readiness and current provider state require separate verification."));
   const list=node("dl",undefined,"details-grid");
   addDetail(list,"Source revision",asset.revision);addDetail(list,"Readiness","UNKNOWN");
   if(asset.raw.revision&&asset.raw.revision.binding)addDetail(list,"Revision binding",human(asset.raw.revision.binding));
   addDetail(list,"Collection coverage",human(asset.status));
   addDetail(list,"Evidence class",asset.evidence);
   if(asset.raw.provider_runtime&&asset.raw.provider_runtime.stage)addDetail(list,"Provider stage",asset.raw.provider_runtime.stage);
   addDetail(list,"License",asset.raw.license||"Not recorded");
   for(const [key,label] of [["artifact_type","Artifact type"],["runtime_state","Runtime state"],["provider_stage","Provider stage"],["archetype","Archetype"],["default_branch","Default branch"]])if(asset.raw[key]!==undefined)addDetail(list,label,printable(asset.raw[key]));
   if(asset.raw.tree_truncated!==undefined)addDetail(list,"Tree coverage",asset.raw.tree_truncated?"Truncated; incomplete":"Provider did not mark tree truncated");
   body.append(list);
   if(asset.raw.evidence_class==="REPORTED")body.append(node("p","The saved record uses the legacy REPORTED label. This view displays DECLARED because no owner signature is verified by this dashboard. The raw record is preserved below."));
   if(asset.raw.url){try{const url=new URL(String(asset.raw.url));if(url.protocol==="https:"||url.protocol==="http:"){const link=node("a","Open source record ↗","source-link");link.href=url.href;link.target="_blank";link.rel="noopener noreferrer";body.append(link);}}catch(_){}}
   body.append(node("h3","Recorded findings"));
   if(!asset.findings.length)body.append(node("p","No findings are linked to this asset. Absence of findings is not a readiness result."));
   for(const finding of asset.findings)body.append(renderFinding(finding));
   const task=asset.platform==="GitHub"?ranked.find(t=>String(t.asset||t.name)===asset.name||String(t.asset||t.name)===String(asset.raw.name)):asArray(plan.huggingface_tasks).find(t=>String(t.asset)===asset.name);
   const taskSteps=task?asArray(task.verification_tasks||task.tasks):[];
   if(taskSteps.length){body.append(node("h3","Verification tasks"));const steps=node("ol");for(const step of taskSteps)steps.append(node("li",typeof step==="object"?(step.description||step.task||step.name||printable(step)):step));body.append(steps);}
   if(asset.raw.ci){body.append(node("h3","Checks collected for this revision"));const checks=[...asArray(asset.raw.ci.check_runs),...asArray(asset.raw.ci.workflow_runs),...asArray(asset.raw.ci.statuses)];body.append(node("p",checks.length?checks.length+" check, workflow, and status records collected. Evidence: DECLARED provider metadata. Release eligibility: UNKNOWN.":"No check, workflow, or status records were collected. Review endpoint coverage in the raw record."));for(const check of checks){const line=node("p",[check.name||check.context||"Unnamed check",check.conclusion||check.status||check.state||"UNKNOWN"].join(" · "));body.append(line);}}
   const raw=node("details"),summary=node("summary","Raw collected record"),pre=node("pre",JSON.stringify(asset.raw,null,2));raw.append(summary,pre);body.append(raw);
   dialog.showModal();byId("closeDialog").focus();
 };
 const pageSize=50;let pageIndex=0;
 const renderRows=()=>{
   const search=byId("search").value.trim().toLowerCase(),platform=byId("platform").value,kind=byId("kind").value,status=byId("status").value;
   const filtered=assets.filter(a=>(!search||a.search.includes(search))&&(!platform||a.platform===platform)&&(!kind||String(a.kind)===kind)&&(!status||String(a.status)===status));
   const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));pageIndex=Math.min(Math.max(0,pageIndex),pageCount-1);const start=pageIndex*pageSize,pageAssets=filtered.slice(start,start+pageSize);
   const rows=byId("assetRows");rows.replaceChildren();const fragment=document.createDocumentFragment();
   for(const asset of pageAssets){const row=node("tr"),nameCell=node("td"),button=node("button",asset.name,"asset-button");button.type="button";button.setAttribute("aria-label","Inspect evidence for "+asset.name);button.addEventListener("click",()=>openAsset(asset));nameCell.append(button);if(asset.raw.archetype)nameCell.append(node("span",human(asset.raw.archetype),"subline"));const platformCell=node("td");platformCell.append(node("span",asset.platform,"platform-label"),node("span",human(asset.kind),"subline"));const stateCell=node("td",undefined,"evidence-cell");stateCell.append(node("span",human(asset.status),"pill "+evidenceTone(asset.status)),node("span","Evidence: "+asset.evidence+" · Readiness: UNKNOWN","subline"));const revisionCell=node("td"),revisionText=printable(asset.revision),revisionLabel=/^[a-f0-9]{20,64}$/i.test(revisionText)?revisionText.slice(0,12):revisionText;const revisionNode=node("span",revisionLabel,"revision");revisionNode.title=revisionText;revisionCell.append(revisionNode);const findingCell=node("td");findingCell.append(node("span",asset.findings.length,"row-count"+(asset.findings.length?" flagged":"")));row.append(nameCell,platformCell,stateCell,revisionCell,findingCell);fragment.append(row);}
   rows.append(fragment);byId("visibleCount").textContent=filtered.length+" of "+assets.length+" assets";byId("emptyInventory").hidden=filtered.length!==0;
   byId("pageSummary").textContent=filtered.length?"Rows "+(start+1)+"–"+(start+pageAssets.length)+" · Page "+(pageIndex+1)+" of "+pageCount:"0 rows";byId("previousPage").disabled=pageIndex===0;byId("nextPage").disabled=pageIndex>=pageCount-1;
   if(assets.length===0){byId("emptyInventory").querySelector("strong").textContent="No assets were collected.";byId("emptyInventory").querySelector("span").textContent="Review collection coverage and errors below.";}
 };
 byId("filterForm").addEventListener("submit",event=>event.preventDefault());
 for(const id of ["search","platform","kind","status"])byId(id).addEventListener(id==="search"?"input":"change",()=>{pageIndex=0;renderRows();});
 byId("filterForm").addEventListener("reset",()=>{pageIndex=0;setTimeout(renderRows,0);});
 byId("previousPage").addEventListener("click",()=>{pageIndex-=1;renderRows();});
 byId("nextPage").addEventListener("click",()=>{pageIndex+=1;renderRows();});
 byId("closeDialog").addEventListener("click",()=>dialog.close());
 dialog.addEventListener("click",event=>{if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();}});
 renderRows();
})();
</script>
</body>
</html>
"""
