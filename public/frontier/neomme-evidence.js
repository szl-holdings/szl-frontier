/* SPDX-License-Identifier: Apache-2.0. Read-only archived evidence, never inference. */
'use strict';
const EXPECTED_BYTES_SHA256 = '532bd787585fcde19c3b4f90b62bcde7e584ec0ef71bc4b3e65733e158aad9f2';
const IDS = ['battery', 'solar', 'water', 'library', 'freight', 'seeds'];
const QUERIES = [
  'Where should used lithium batteries be taken?',
  'What converts rooftop direct current to alternating current?',
  'Which facility checks chlorine in drinking water?',
  'When must borrowed books be returned?',
  'Which document lists shipment weight and transport charges?',
  'Where are crop varieties kept cold and dry?',
  'How can we tell whether stored seeds will grow?',
  'What should be inspected if a solar inverter overheats?',
];
const byId = (id) => document.getElementById(id);
const median = (items) => {
  const values = [...items].sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
};
async function loadEvidence() {
  const response = await fetch('./neomme-smoke.v1.json', {cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000)});
  if (!response.ok || !response.body) throw new Error('missing evidence');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) throw new Error('evidence too large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) => b.toString(16).padStart(2, '0')).join('');
  if (hash !== EXPECTED_BYTES_SHA256) throw new Error('evidence identity mismatch');
  const report = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  if (report.status !== 'SMOKE_EXECUTED' || report.production_promotion !== false || report.runtime_qualification !== 'UNQUALIFIED') throw new Error('posture mismatch');
  return report;
}
function draw(report) {
  const key = byId('mode').value;
  const index = Number(byId('query').value);
  const entry = report.cases[key];
  const lane = key.split(':')[0];
  byId('top1').textContent = `${Math.round(entry.metrics.top1 * report.queries)} / ${report.queries}`;
  byId('rss').textContent = `${(report.max_rss_bytes_process_including_dependencies / 1073741824).toFixed(2)} GiB`;
  byId('time').textContent = `${(median(report.encoding_seconds_by_item[lane]) * 1000).toFixed(0)} ms`;
  byId('question').textContent = QUERIES[index];
  const rows = entry.rankings[index].map((id, position) => {
    const row = document.createElement('div'); row.className = 'rank';
    const title = document.createElement('span'); title.textContent = `${position + 1}. ${id}`;
    const score = document.createElement('span'); score.textContent = entry.scores[index][IDS.indexOf(id)].toFixed(4);
    row.append(title, score); return row;
  });
  byId('ranks').replaceChildren(...rows);
  byId('observed').textContent = `Recorded ${report.observed_at} · CPU float32 · 6 documents · 8 queries.`;
}
loadEvidence().then((report) => {
  QUERIES.forEach((_question, i) => {
    const option = document.createElement('option'); option.value = String(i); option.textContent = `Query ${i + 1}`; byId('query').append(option);
  });
  draw(report);
  byId('mode').addEventListener('change', () => draw(report));
  byId('query').addEventListener('change', () => draw(report));
  byId('results').hidden = false;
  byId('status').textContent = 'Archived smoke record verified against its pinned file digest. Production remains HOLD.';
}).catch(() => {
  byId('results').hidden = true;
  byId('status').textContent = 'Evidence unavailable or integrity check failed. No metrics are displayed. Production remains HOLD.';
});
