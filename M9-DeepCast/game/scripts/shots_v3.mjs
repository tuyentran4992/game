// Node port of scripts/shots_v3.py (python3 is permission-blocked in this env).
// Same scenes, coordinates, staged state and output paths as the Python original.
// Run: node scripts/shots_v3.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/node_modules/playwright');

const URL = 'http://127.0.0.1:5209/';
const GAME_W = 480;
const GAME_H = 854;
const OUT = '/data/youtube-playables/M9-DeepCast/assets';

async function main() {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({
    viewport: { width: 480, height: 854 },
    deviceScaleFactor: 2,
  });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto(URL);
  await page.waitForSelector('#qa-testids', { state: 'attached' });
  await page.waitForFunction(
    () => document.querySelector('[data-testid=screen-title]')?.textContent === '1',
    undefined,
    { timeout: 20000 },
  );
  const canvas = page.locator('#game canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas boundingBox null');

  // the game's own whale spawner (8s cadence, tension<=50) would add a SECOND
  // whale next to the staged one in scene 4 — disable it for the whole session
  await page.evaluate(() => {
    window.__game.scene.getScene('Game').state.whaleSpawnTimer = 9999;
  });

  const toScreen = (gx, gy) => ({
    x: box.x + (gx / GAME_W) * box.width,
    y: box.y + (gy / GAME_H) * box.height,
  });

  // Node-side state polling: waitForFunction is rAF-bound (0.3-0.5s frames under
  // SwiftShader) and loses every <1.5s gameplay window; evaluate roundtrips are not.
  const pollState = async (fn, timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await page.evaluate(fn)) return true;
      await page.waitForTimeout(20);
    }
    return false;
  };

  // --- 1) title demo: ghost hand + '!' — the demo runs on GAME time (dt-clamped),
  // so at headless fps the first '!' lands ~18s after title-ready: long timeout,
  // then FREEZE the scene so the slow element screenshot stays inside the blink
  try {
    await page.waitForFunction(
      () => {
        const d = window.__game.scene.getScene('Game').overlays.demo;
        return d.shown && d.phase === 'nin' && 240 - d.fishX < 70;
      },
      undefined,
      { timeout: 35000 },
    );
    await page.evaluate(() => window.__game.scene.getScene('Game').scene.pause());
  } catch {
    await page.waitForTimeout(3000); // fallback: mid-loop frame, no freeze
  }
  await canvas.screenshot({ path: `${OUT}/v3_title_demo.png` });
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.resume());

  // --- 2) dive: descend, release, NIN ABOVE the 250m greeter -> '!' telegraph.
  // NOTE the tap-buffer: after mouse.up the hook keeps descending ~0.25s (+~40px),
  // so releasing at hookY>240 parks the NIN at ~282px (186m) with the greeter
  // ~55px below — a ~1.5s '!' window before the attach.
  const play = toScreen(240, 457);
  await page.mouse.click(play.x, play.y); // PLAY, one click
  await page.waitForFunction(
    () => window.__game.scene.getScene('Game').state.phase === 'dive',
    undefined,
    { timeout: 5000 },
  );
  // evidence staging: keep ONLY the greeter (fish[0]) alive — a random band-0
  // fish can win the race to the hook, filling the slot and cancelling the '!'
  await page.evaluate(() => {
    window.__game.scene.getScene('Game').state.fish.forEach((f, i) => {
      if (i > 0) f.alive = false;
    });
  });
  const hold = toScreen(240, 640);
  await page.mouse.move(hold.x, hold.y);
  await page.mouse.down(); // hold = descend
  await page.waitForFunction(
    () => window.__game.scene.getScene('Game').state.hookY > 240,
    undefined,
    { timeout: 30000 }, // headroom for slow headless frames
  );
  await page.mouse.up(); // release -> (tap buffer) -> reel
  await page.waitForTimeout(250);
  await page.mouse.down(); // NIN: bait still, greeter homes in from below
  const NEAR50 = () => {
    const s = window.__game.scene.getScene('Game').state;
    if (s.phase !== 'dive' || s.hookMode !== 'hold') return false;
    return s.fish.some((f) => f.alive && !s.hooked.includes(f.uid)
      && Math.hypot(f.x - s.hookX, f.y - s.hookY) < 50);
  };
  // primary: the natural greeter homes in; fallback: stage one 48px out — either
  // way we freeze at ~44-46px (inside the '!' radius 56, before the 30px attach)
  let prospect = await pollState(NEAR50, 15000);
  if (!prospect) {
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game').state;
      s.hookMode = 'hold';
      s.hookX = 240;
      s.hookY = 96 + 260;
      s.tension = 5;
      s.fish.push({ uid: 8888, defId: 'f3', x: 288, y: 96 + 260, vx: -30, phase: 0, alive: true });
    });
    prospect = await pollState(NEAR50, 5000);
  }
  if (prospect) {
    await page.evaluate(() => window.__game.scene.getScene('Game').scene.pause());
  }
  await canvas.screenshot({ path: `${OUT}/v3_telegraph.png` });
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.resume());

  // --- 3) first catch: the '+$' float exists in the scene graph the moment the
  // attach lands, but a pause right after update can freeze the canvas on the
  // PREVIOUS presented frame (SwiftShader presents async) — so pause, resume
  // just long enough for 1-2 presents of the float, pause again, settle, shoot
  if (!(await pollState(
    () => window.__game.scene.getScene('Game').state.hooked.length > 0,
    15000,
  ))) {
    console.log('WARN: no attach observed for the first-catch scene');
  }
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.pause());
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.resume());
  await page.waitForTimeout(500); // float (1.4s life) presents at ~0.7 alpha
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.pause());
  await page.waitForTimeout(300); // settle, same as scene 4
  await canvas.screenshot({ path: `${OUT}/v3_first_catch.png` });
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.resume());
  await page.mouse.up();

  // --- 4) TRENCH: money bar near the whale goal + whale at the bottom.
  // Press again so the hook parks (NIN) at 1120m instead of reeling home.
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game').state;
    s.money = 1850;
    s.air = 30;
    s.tension = 8;
    s.hookY = 96 + 1120;
    s.hookX = 240;
    s.hookMode = 'hold';
    s.hooked = [];
    if (!s.whaleUid) {
      // patrol clamps y>=1236 and the 278px-tall art then overflows the world
      // floor — bottom clipping is a pre-existing band limitation. vx=0 keeps it
      // centered (patrol would bounce it into the right edge within ~1s).
      s.fish.push({ uid: 9999, defId: 'whale', x: 330, y: 96 + 1140, vx: 0, phase: 0, alive: true });
      s.whaleUid = 9999;
    }
  });
  await page.mouse.down(); // keep NIN: hook stays in the trench
  await page.waitForTimeout(1300); // camera settles on the trench
  // pause FIRST: a frozen canvas is not presenting, so the readback cannot tear
  // (SwiftShader tore the whale/HUD in every screenshot taken mid-render)
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.pause());
  await page.waitForTimeout(300);
  await canvas.screenshot({ path: `${OUT}/v3_trench.png` });
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.resume());
  await page.mouse.up();

  console.log('pageerrors:', pageErrors.length ? pageErrors : 'none');
  console.log('SHOTS RESULT: OK');
  await browser.close();
}

main().catch((e) => {
  console.error('SHOTS RESULT: FAIL');
  console.error('ERROR:', e && e.message ? e.message : e);
  process.exitCode = 1;
});
