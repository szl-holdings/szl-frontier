import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const script = resolve(import.meta.dirname, 'frontier-native-browser.cjs');
const source = readFileSync(script, 'utf8');

async function interruptedObservation(stage) {
  let report, visits = 0, closed = false, stopped = false;
  const process = { env: {}, execPath: 'fixture-node', exitCode: 0 };
  const page = {
    on() {}, async route() {},
    async goto() { if (++visits > 1) throw new Error('fixture locator timeout after completed checks'); },
    locator() { return { async waitFor() {} }; },
    async evaluate(_callback, value) {
      if (typeof value === 'string') return { count: 21, mismatches: [], headerRadius: '16px' };
      return { viewport: 1440, documentWidth: 1440, h1Count: 1, textFailures: [], overflow: [], targets: [], unlabeled: [], uncertain: [], animations: 0 };
    },
    async screenshot() {},
  };
  const browser = {
    async newContext() { return { async newPage() { return page; } }; },
    async close() { closed = true; if (stage === 'cleanup') throw new Error('fixture browser close failure'); },
  };
  const mockRequire = name => {
    if (name === 'playwright') return { chromium: { async launch() { if (stage === 'launch') throw new Error('fixture browser launch failure'); return browser; } } };
    if (name === 'node:child_process') return { spawn() { return { exitCode: null, on() {}, stdout: { pipe() {} }, stderr: { pipe() {} }, kill() { stopped = true; } }; } };
    if (name === 'node:fs') return {
      mkdirSync() {}, createWriteStream() { return { end() {} }; }, readFileSync,
      writeFileSync(path, body) { assert.equal(path.endsWith('results.json'), true); report = JSON.parse(body); },
    };
    return require(name);
  };
  await runInNewContext(source, {
    require: mockRequire, __dirname: dirname(script), process,
    console: { log() {}, error() {} }, fetch: async () => ({ ok: true }), URL, setTimeout,
  }, { filename: script });
  assert.equal(stopped, true, 'preview cleanup still runs');
  assert.equal(closed, stage !== 'launch');
  assert.equal(process.exitCode, 1);
  assert.equal(report.complete, false);
  assert.equal(report.verdict, 'FAIL');
  assert.equal(report.checks.find(c => c.name === 'qualification completes').pass, false);
  assert.match(report.checks.find(c => c.name === 'qualification completes').detail, /fixture/);
  return report;
}

test('browser startup failure writes an explicit incomplete failure observation', async () => {
  const report = await interruptedObservation('launch');
  assert.equal(report.checks.filter(c => c.pass).length, 0);
  assert.equal(report.rows.length, 0);
});

test('a later timeout cannot make completed checks look like complete qualification', async () => {
  const report = await interruptedObservation('partial');
  assert.equal(report.checks.filter(c => c.pass).length, 2);
  assert.equal(report.rows.length, 1);
});

test('browser cleanup failure is retained alongside the original interruption', async () => {
  const report = await interruptedObservation('cleanup');
  assert.equal(report.checks.filter(c => !c.pass).length, 2);
  assert.match(report.checks.find(c => c.name === 'browser cleanup completes').detail, /fixture browser close failure/);
});
