/* Local presentation qualification; never a production/runtime receipt.
 * Build first, then run with FRONTIER_BROWSER=... and optionally FRONTIER_QA_OUT.
 * This starts only the source-owned local preview, blocks external requests and
 * write methods, and never activates inference, evaluation, or corpus writes.
 */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createWriteStream, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = resolve(__dirname, '..');
const out = resolve(process.env.FRONTIER_QA_OUT || resolve(root, 'artifacts/native-frontend'));
const port = Number(process.env.FRONTIER_QA_PORT || 7884);
const origin = `http://127.0.0.1:${port}`;
const routes = ['/', '/memory', '/ingest', '/models', '/intel', '/actions', '/adversary', '/brain', '/harbor', '/mesh', '/proof', '/gates'];
const tabs = ['workstreams', 'cycle', 'flotation', 'estate', 'triad', 'pin', 'codex', 'kernels', 'leases', 'optional', 'audit', 'journeys', 'lab'];
const workspaces = [...routes, ...tabs.map(tab => `/frontier?tab=${tab}`)];
const rows = [], checks = [];
function check(name, value, detail = null) { checks.push({ name, pass: Boolean(value), detail }); }
function digest(data) { return createHash('sha256').update(data).digest('hex'); }

// Visible text contrast against actual computed solid and gradient endpoint
// composites. These conservative color-pair checks are not a WCAG certification.
async function inspect(page, forced = false) {
  return page.evaluate(({ forced }) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    function rgba(value) {
      if (!CSS.supports('color', value)) throw new Error('Unsupported computed color: ' + value);
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
      const c = [...ctx.getImageData(0, 0, 1, 1).data]; c[3] /= 255; return c;
    }
    function over(a, b) { const alpha = a[3] + b[3] * (1 - a[3]); return alpha ? [0, 1, 2].map(i => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alpha).concat(alpha) : [0, 0, 0, 0]; }
    function luminance(c) { return c.slice(0, 3).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((n, x, i) => n + x * [.2126, .7152, .0722][i], 0); }
    function ratio(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
    const backgrounds = new WeakMap();
    function backdrop(el) {
      if (!el) return [[255, 255, 255, 1]];
      if (backgrounds.has(el)) return backgrounds.get(el);
      const s = getComputedStyle(el), lower = backdrop(el.parentElement), base = lower.map(c => over(rgba(s.backgroundColor), c));
      const colors = s.backgroundImage === 'none' ? [] : (s.backgroundImage.match(/(?:rgba?|color)\([^()]+\)/g) || []).map(rgba);
      const values = colors.length ? base.flatMap(c => [c, ...colors.map(stop => over(stop, c))]) : base;
      const unique = [...new Map(values.map(c => [c.map(x => Math.round(x)).join(','), c])).values()].slice(0, 24);
      backgrounds.set(el, unique); return unique;
    }
    function visible(el) { return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().height > 0; }
    function boundedScroller(el) { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p), r = p.getBoundingClientRect(); if (/(auto|scroll)/.test(s.overflowX) && r.left >= -1 && r.right <= innerWidth + 1) return true; } return false; }
    const textFailures = [], overflow = [], uncertain = [];
    let textPairs = 0;
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let text; (text = walk.nextNode());) {
      const label = text.textContent.trim(), el = text.parentElement;
      if (!label || !el || el.closest('script,style,svg') || !visible(el) || el.closest('[disabled]')) continue;
      const s = getComputedStyle(el), range = document.createRange(); range.selectNodeContents(text);
      const rect = range.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
      if ((rect.left < -1 || rect.right > innerWidth + 1) && !boundedScroller(el) && !el.closest('.frontier-skip-link')) overflow.push({ text: label.slice(0, 90), left: rect.left, right: rect.right });
      if (forced) continue;
      if (Number(s.opacity) !== 1) { uncertain.push(label.slice(0, 70)); continue; }
      const foreground = rgba(s.color), bg = backdrop(el), measured = Math.min(...bg.map(c => ratio(over(foreground, c), c)));
      const large = Number.parseFloat(s.fontSize) >= 24 || (Number.parseFloat(s.fontSize) >= 18.6667 && Number.parseFloat(s.fontWeight) >= 700);
      const minimum = large ? 3 : 4.5; textPairs++;
      if (measured < minimum) textFailures.push({ text: label.slice(0, 110), foreground: s.color, ratio: +measured.toFixed(3), minimum });
    }
    const targets = [], unlabeled = [];
    for (const el of document.querySelectorAll('button,input:not([type="hidden"]),select,textarea,nav a')) {
      if (!visible(el)) continue;
      const box = (el.matches('input[type="checkbox"]') && el.closest('label') || el).getBoundingClientRect();
      if (!el.disabled && (box.width < 43.9 || box.height < 43.9)) targets.push({ text: (el.textContent || el.getAttribute('aria-label') || el.name).trim().slice(0, 90), tag: el.tagName, width: box.width, height: box.height });
      if (el.matches('button,input,select,textarea') && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.labels?.length && !el.textContent.trim() && !el.getAttribute('title')) unlabeled.push(el.outerHTML.slice(0, 200));
    }
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, h1Count: [...document.querySelectorAll('h1')].filter(visible).length, textPairs, textFailures, uncertain, overflow, targets, unlabeled, animations: document.getAnimations().filter(a => a.playState === 'running').length };
  }, { forced });
}

async function contextPage(browser, options = {}, failCorpus = false) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage(); const errors = [], writes = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) { external.push(url.origin + url.pathname); return route.abort(); }
    if (!['GET', 'HEAD'].includes(request.method())) { writes.push(request.method() + ' ' + url.pathname); return route.abort(); }
    if (failCorpus && url.pathname === '/brain-corpus.public.jsonl') return route.fulfill({ status: 503, contentType: 'text/plain', body: 'Unavailable fixture' });
    return route.continue();
  });
  return { context, page, errors, writes, external };
}

(async () => {
  mkdirSync(out, { recursive: true });
  const log = createWriteStream(resolve(out, 'preview.log'));
  const server = spawn(process.execPath, ['scripts/with-app-env.mjs', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root, env: { ...process.env, PATH: root + '/node_modules/.bin:' + process.env.PATH, DATABASE_URL: '' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.pipe(log); server.stderr.pipe(log);
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 240; i++) {
      if (server.exitCode !== null) throw new Error('Local preview exited');
      try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Source-owned preview must become ready');
    browser = await chromium.launch({ headless: true, ...(process.env.FRONTIER_BROWSER ? { executablePath: process.env.FRONTIER_BROWSER } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    for (const mode of [
      { name: 'desktop', viewport: { width: 1440, height: 1000 } },
      { name: 'mobile', viewport: { width: 375, height: 900 }, isMobile: true, hasTouch: true },
      { name: 'narrow', viewport: { width: 320, height: 900 } },
      { name: 'forced', viewport: { width: 375, height: 900 }, forcedColors: 'active' },
    ]) {
      const { name, ...options } = mode;
      const active = await contextPage(browser, options);
      for (const path of workspaces) {
        await active.page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await active.page.locator('main .frontier-page-header h1').waitFor({ timeout: 30000 });
        const result = await inspect(active.page, name === 'forced');
        rows.push({ mode: name, path, ...result });
        check(`${name} ${path}: layout, targets, labels and computed text pairs`, result.documentWidth <= result.viewport + 1 && result.h1Count === 1 && !result.textFailures.length && !result.overflow.length && !result.targets.length && !result.unlabeled.length && !result.uncertain.length && !result.animations, result);
        if (['/', '/frontier?tab=workstreams', '/frontier?tab=codex', '/memory'].includes(path)) {
          await active.page.screenshot({ path: resolve(out, `${name}-${path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'command'}.png`), fullPage: false });
        }
      }
      check(`${name}: no passive external requests, writes, or page errors`, !active.errors.length && !active.writes.length && !active.external.length, { errors: active.errors, writes: active.writes, external: active.external });
      await active.context.close();
      console.log(`${name}: ${workspaces.length} workspaces inspected`);
    }

    // 1440px / factor reproduces the CSS viewport of desktop page zoom, with
    // matching pixel density. CSS `zoom` leaves viewport media queries unchanged
    // (1440px even at 4x) and is not a valid browser-page-zoom reflow instrument.
    // These are equivalent reflow checks, not a claim to exercise browser UI zoom.
    for (const zoom of [2, 4]) {
      const active = await contextPage(browser, { viewport: { width: 1440 / zoom, height: 1000 / zoom }, deviceScaleFactor: zoom });
      for (const path of ['/', '/frontier?tab=workstreams']) {
        await active.page.goto(origin + path); await active.page.locator('main h1').waitFor();
        const result = await inspect(active.page);
        check(`${zoom * 100}% equivalent viewport ${path}: document reflow and contrast`, result.documentWidth <= result.viewport + 1 && !result.overflow.length && !result.textFailures.length, result);
      }
      check(`${zoom * 100}% equivalent viewport: no passive writes, externals, or page errors`, !active.writes.length && !active.external.length && !active.errors.length);
      await active.context.close();
    }
    for (const path of ['/', '/frontier']) {
      const active = await contextPage(browser, { javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
      await active.page.goto(origin + path, { waitUntil: 'domcontentloaded' });
      const result = await inspect(active.page);
      check(`no JavaScript ${path}: useful source links, no inert menu or first-paint motion`, await active.page.getByRole('heading', { name: 'Explore the Frontier source' }).isVisible() && !await active.page.getByRole('button', { name: 'Open menu' }).isVisible() && result.documentWidth === 320 && !result.animations && !result.textFailures.length, result);
      await active.page.screenshot({ path: resolve(out, `no-js-${path === '/' ? 'command' : 'frontier'}.png`), fullPage: true });
      await active.context.close();
    }

    const interactive = await contextPage(browser, { viewport: { width: 375, height: 900 } });
    const page = interactive.page;
    await page.goto(origin); await page.locator('main .frontier-page-header h1').waitFor();
    await page.keyboard.press('Tab');
    check('keyboard skip link is first and visibly focused', await page.locator('.frontier-skip-link').evaluate(el => document.activeElement === el && el.getBoundingClientRect().top >= 0));
    await page.keyboard.press('Enter');
    check('skip link reaches workspace', await page.locator('main').evaluate(el => document.activeElement === el));
    const toggle = page.locator('.frontier-menu-toggle');
    await toggle.click();
    check('mobile menu discloses all 13 routes', await toggle.getAttribute('aria-expanded') === 'true' && await page.locator('#frontier-mobile-nav a:visible').count() === 13);
    await page.keyboard.press('Escape');
    check('Escape closes menu and restores focus', await toggle.getAttribute('aria-expanded') === 'false' && await toggle.evaluate(el => document.activeElement === el));
    await toggle.click(); await page.locator('#frontier-mobile-nav').getByRole('link', { name: 'Memory', exact: true }).click();
    await page.getByRole('heading', { name: 'Write, recall, prove' }).waitFor();
    check('menu navigation closes and transfers focus to workspace', await toggle.getAttribute('aria-expanded') === 'false' && await page.locator('main').evaluate(el => document.activeElement === el));
    await page.goto(origin + '/frontier?tab=workstreams'); await page.getByRole('tab', { name: 'workstreams', exact: true }).waitFor();
    const first = page.getByRole('tab', { name: 'workstreams', exact: true }); await first.focus(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('#frontier-tab-cycle')?.getAttribute('aria-selected') === 'true');
    check('tabs activate with arrows and keep focus', await page.getByRole('tab', { name: 'cycle', exact: true }).evaluate(el => document.activeElement === el));
    await page.keyboard.press('End'); await page.waitForFunction(() => document.querySelector('#frontier-tab-lab')?.getAttribute('aria-selected') === 'true');
    await page.keyboard.press('Home'); await page.waitForFunction(() => document.querySelector('#frontier-tab-workstreams')?.getAttribute('aria-selected') === 'true');
    check('Home and End preserve one tab stop and named panel', await page.locator('[role=tab][tabindex="0"]').count() === 1 && await page.getByRole('tabpanel').getAttribute('aria-labelledby') === 'frontier-tab-workstreams');
    await page.getByRole('region', { name: 'Workstreams table' }).focus();
    const before = await page.getByRole('region', { name: 'Workstreams table' }).evaluate(el => el.scrollLeft); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('[aria-label="Workstreams table"]').scrollLeft > 0);
    check('wide table remains keyboard scrollable', await page.getByRole('region', { name: 'Workstreams table' }).evaluate(el => el.scrollLeft) > before);
    check('interactive navigation makes no write calls or external requests', !interactive.writes.length && !interactive.external.length && !interactive.errors.length, interactive.errors);
    await interactive.context.close();

    const failure = await contextPage(browser, {}, true);
    await failure.page.goto(origin); await failure.page.getByText('Yachay unavailable · UNAVAILABLE', { exact: true }).waitFor();
    check('failed corpus is explicitly unavailable, never a measured index or zero', await failure.page.getByText('brain —', { exact: true }).isVisible() && !await failure.page.getByText('Yachay index ready · MEASURED', { exact: true }).count());
    await failure.page.screenshot({ path: resolve(out, 'corpus-unavailable.png'), fullPage: false });
    check('failure path issues no writes or external requests', !failure.writes.length && !failure.external.length && !failure.errors.length);
    await failure.context.close();

    const projection = JSON.parse(readFileSync(resolve(root, 'public/szl/PROJECTION.json'), 'utf8'));
    // A manifest supplies expected hashes, never network destinations. Requests
    // use this fixed source-owned URL list and cannot follow an external redirect.
    const servedAssets = [
      ['public/szl/szl-tokens.css', '/szl/szl-tokens.css'],
      ['public/szl/SOURCE.json', '/szl/SOURCE.json'],
      ['public/szl/szl-icon-32.svg', '/szl/szl-icon-32.svg'],
      ['public/__grok/icon-180.png', '/__grok/icon-180.png'],
      ['public/favicon.svg', '/favicon.svg'],
    ];
    assert.deepEqual(projection.assets.map(asset => asset.installed_path).sort(), servedAssets.map(([installedPath]) => installedPath).sort());
    for (const [installedPath, urlPath] of servedAssets) {
      const asset = projection.assets.find(candidate => candidate.installed_path === installedPath);
      const response = await fetch(origin + urlPath, { redirect: 'error', signal: AbortSignal.timeout(10000) });
      check(`built preview serves exact ${installedPath}`, response.ok && digest(Buffer.from(await response.arrayBuffer())) === asset.sha256);
    }
  } finally {
    if (browser) await browser.close(); server.kill(); log.end();
    const failures = checks.filter(c => !c.pass);
    writeFileSync(resolve(out, 'results.json'), JSON.stringify({ schema: 'szl.local-presentation-observation.v1', unsigned: true, scope: 'Local built-source presentation only; not a runtime or production receipt', createdAt: new Date().toISOString(), checks, rows }, null, 2) + '\n');
    console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failures: failures.map(c => ({ name: c.name, detail: c.detail })) }, null, 2));
    if (failures.length) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
