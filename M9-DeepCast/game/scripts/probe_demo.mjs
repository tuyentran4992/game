// Temp QA diagnostic (read-only): 1) sample overlays.demo phase/fishX timeline on
// the title screen; 2) after a real catch, scan scene children for '+$' Text
// floats. No game state is mutated. Run: node scripts/probe_demo.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/node_modules/playwright');

const URL = 'http://127.0.0.1:5209/';
const GAME_W = 480;
const GAME_H = 854;

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 480, height: 854 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));

await page.goto(URL);
await page.waitForSelector('#qa-testids', { state: 'attached' });
await page.waitForFunction(
  () => document.querySelector('[data-testid=screen-title]')?.textContent === '1',
  undefined,
  { timeout: 20000 },
);

// --- 1) demo timeline -------------------------------------------------------
const SAMPLE = () => {
  const d = window.__game.scene.getScene('Game').overlays?.demo;
  if (!d) return { none: true };
  return { shown: d.shown, phase: d.phase, fishX: Math.round(d.fishX),
           probe: 240 - d.fishX < 70 };
};
const t0 = Date.now();
const seen = [];
const phasesSeen = new Map();
while (Date.now() - t0 < 35000) {
  const s = await page.evaluate(SAMPLE);
  if (!s.none) {
    const p = phasesSeen.get(s.phase) || { count: 0, fishX: [] };
    p.count++;
    if (!p.fishX.includes(s.fishX)) p.fishX.push(s.fishX);
    phasesSeen.set(s.phase, p);
    const last = seen[seen.length - 1];
    if (!last || last.phase !== s.phase) {
      console.log(`demo t=${Date.now() - t0}ms phase->${s.phase}`, JSON.stringify(s));
    }
    seen.push(s);
  }
  await page.waitForTimeout(50);
}
for (const [ph, p] of phasesSeen) {
  console.log('phase', ph, 'samples', p.count, 'fishX range', Math.min(...p.fishX), '-', Math.max(...p.fishX));
}

// --- 2) catch float probe ---------------------------------------------------
const box = await page.locator('#game canvas').boundingBox();
const toScreen = (gx, gy) => ({ x: box.x + (gx / GAME_W) * box.width, y: box.y + (gy / GAME_H) * box.height });
const play = toScreen(240, 457);
await page.mouse.click(play.x, play.y);
await page.waitForFunction(() => window.__game.scene.getScene('Game').state.phase === 'dive', undefined, { timeout: 5000 });
const hold = toScreen(240, 640);
await page.mouse.move(hold.x, hold.y);
await page.mouse.down();
await page.waitForFunction(() => window.__game.scene.getScene('Game').state.hookY > 240, undefined, { timeout: 30000 });
await page.mouse.up();
await page.waitForTimeout(250);
await page.mouse.down();
try {
  await page.waitForFunction(() => {
    const s = window.__game.scene.getScene('Game').state;
    if (s.phase !== 'dive' || s.hookMode !== 'hold') return false;
    return s.fish.some((f) => f.alive && !s.hooked.includes(f.uid)
      && Math.hypot(f.x - s.hookX, f.y - s.hookY) < 52);
  }, undefined, { timeout: 12000 });
  console.log('NEAR: natural prospect arrived');
} catch {
  // same staged fallback shots_v3.mjs uses (throwaway session, not game source)
  console.log('NEAR: natural timeout -> staging prospect (fallback path)');
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game').state;
    s.hookMode = 'hold';
    s.hookX = 240;
    s.hookY = 96 + 260;
    s.tension = 5;
    s.fish.push({ uid: 8888, defId: 'f3', x: 288, y: 96 + 260, vx: -30, phase: 0, alive: true });
  });
  await page.waitForTimeout(400);
}

const FLOATS = () => {
  const sc = window.__game.scene.getScene('Game');
  const texts = sc.children.list
    .filter((c) => (c.text !== undefined || c.style?.text !== undefined))
    .map((c) => ({ text: String(c.text ?? c.style?.text ?? ''), x: Math.round(c.x), y: Math.round(c.y), alpha: +c.alpha.toFixed(2) }));
  return { hooked: sc.state.hooked.length, texts };
};
const f0 = Date.now();
let hookedAt = null;
while (Date.now() - f0 < 12000) {
  const st = await page.evaluate(FLOATS);
  if (st.hooked > 0) { hookedAt = Date.now() - f0; break; }
  await page.waitForTimeout(15);
}
console.log('hooked at', hookedAt, 'ms after NIN');
if (hookedAt !== null) {
  for (let i = 0; i < 10; i++) {
    const st = await page.evaluate(FLOATS);
    console.log(`float t=+${Math.round(i * 100)}ms`, JSON.stringify(st));
    await page.waitForTimeout(100);
  }
}
await browser.close();
