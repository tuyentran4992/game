// Node port of scripts/qa_input.py (python3 is permission-blocked in this env).
// Real Chromium via global Playwright install (/usr/lib/node_modules/playwright),
// browsers resolved from /data/.cache/ms-playwright (chromium-1234).
// Same 4 assertions + latency prints as the Python original, plus console capture.
// Run: node scripts/qa_input.mjs
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/node_modules/playwright');

const URL = 'http://127.0.0.1:5209/';
const GAME_W = 480;
const GAME_H = 854;
const SHOT_DIR = '/data/youtube-playables/M9-DeepCast/game';

const getState = () => {
  const sc = window.__game.scene.getScene('Game');
  const s = sc.state;
  return {
    phase: s.phase,
    diveCount: s.diveCount,
    money: Math.round(s.money),
    air: +s.air.toFixed(1),
    mode: s.hookMode,
    charges: s.sonarCharges,
    sonarTimer: s.sonarTimer,
    holding: sc.holding,
    lose: document.querySelector('[data-testid=screen-lose]')?.textContent,
  };
};

async function main() {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({
    viewport: { width: 420, height: 746 },
    deviceScaleFactor: 1,
  });
  const pageErrors = [];
  const consoleErrors = [];
  const consoleAll = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    const line = `[${m.type()}] ${m.text()}`;
    consoleAll.push(line);
    if (m.type() === 'error') consoleErrors.push(line);
  });

  const summary = { play: 'DEAD', tryAgain: 'DEAD', assertions: [] };

  try {
    await page.goto(URL);
    // container is display:none -> must wait for attached, not visible
    await page.waitForSelector('#qa-testids', { state: 'attached' });
    await page.waitForFunction(
      () => document.querySelector('[data-testid=screen-title]')?.textContent === '1',
      undefined,
      { timeout: 20000 },
    );
    const box = await page.locator('#game canvas').boundingBox();
    console.log('canvas box:', JSON.stringify(box));
    if (!box) throw new Error('canvas boundingBox null');

    const toScreen = (gx, gy) => ({
      x: box.x + (gx / GAME_W) * box.width,
      y: box.y + (gy / GAME_H) * box.height,
    });

    // poll phase over CDP every ~5ms, like the Python original
    const waitPhase = async (target, timeoutMs) => {
      const t0 = performance.now();
      while (performance.now() - t0 < timeoutMs) {
        const ph = await page.evaluate(
          () => window.__game?.scene?.getScene('Game')?.state?.phase,
        );
        if (ph === target) return performance.now() - t0;
        await page.waitForTimeout(5);
      }
      return null;
    };

    const assertStep = (step, cond, msg) => {
      if (!cond) throw new Error(`STEP ${step} FAILED: ${msg}`);
      summary.assertions.push(`STEP ${step}: PASS (${msg})`);
      console.log(`   STEP ${step} assertion: PASS (${msg})`);
    };

    // --- 1) PLAY: exactly one click --------------------------------------
    try {
      const { x, y } = toScreen(240, 457);
      await page.mouse.click(x, y); // one press + one release, nothing else
      const lat = await waitPhase('dive', 500);
      const st = await page.evaluate(getState);
      if (lat !== null) {
        summary.play = `${lat.toFixed(1)}ms`;
        console.log(`PLAY     : FIRED latency=${lat.toFixed(1)}ms`);
      } else {
        console.log('PLAY     : DEAD (>500ms)');
      }
      console.log('   after :', JSON.stringify(st));
      assertStep(1, lat !== null, 'PLAY entered dive within 500ms');
      assertStep(1, st.diveCount === 1 && st.money === 450, `dive 1 PAID (diveCount=${st.diveCount}, money=${st.money}, fuel 600-150)`);
      assertStep(1, st.holding === false, 'holding not stuck after PLAY tap');
    } catch (e) {
      await page.screenshot({ path: `${SHOT_DIR}/qa-shot-1.png` });
      summary.assertions.push(`STEP 1: FAIL (${e.message})`);
      throw e;
    }

    // --- 2) hold to descend, then force fuel lose -------------------------
    // NOTE: headless SwiftShader frames take ~0.5-0.6s while the game caps dt at
    // 0.1s/frame -> sim advances ~0.17x wall clock. 106->400px needs ~12s real
    // (140px/s sim = ~24px/s here) and the reel-home + lose ~20s more, so the
    // budgets below are wall-clock-adjusted for THIS environment only. On a 60fps
    // machine the original 15s/20s budgets from qa_input.py are appropriate.
    try {
      const hold = toScreen(240, 640);
      await page.mouse.move(hold.x, hold.y);
      await page.mouse.down(); // hold = descend
      await page.waitForFunction(
        () => window.__game.scene.getScene('Game').state.hookY > 400,
        undefined,
        { timeout: 60000 },
      );
      await page.evaluate(() => {
        const s = window.__game.scene.getScene('Game').state;
        s.money = 0;
        s.air = 0.5; // force OUT OF FUEL on next surface
      });
      await page.mouse.up(); // release -> reel home -> resolveSurface -> lose
      const lat = await waitPhase('lose', 60000);
      console.log(
        `forced lose reached: ${lat !== null}` + (lat !== null ? ` (${lat.toFixed(1)}ms)` : ''),
      );
      assertStep(2, lat !== null, 'game reached lose after money=0');
      const st = await page.evaluate(getState);
      console.log('   after :', JSON.stringify(st));
      assertStep(2, st.lose === '1', `lose overlay visible (screen-lose=${st.lose})`);
    } catch (e) {
      await page.screenshot({ path: `${SHOT_DIR}/qa-shot-2.png` });
      summary.assertions.push(`STEP 2: FAIL (${e.message})`);
      throw e;
    }

    // --- 3) TRY AGAIN: exactly one click ----------------------------------
    try {
      const { x, y } = toScreen(240, 557);
      await page.mouse.click(x, y);
      const lat = await waitPhase('dive', 500);
      const st = await page.evaluate(getState);
      if (lat !== null) {
        summary.tryAgain = `${lat.toFixed(1)}ms`;
        console.log(`TRY AGAIN: FIRED latency=${lat.toFixed(1)}ms`);
      } else {
        console.log('TRY AGAIN: DEAD (>500ms)');
      }
      console.log('   after :', JSON.stringify(st));
      assertStep(3, lat !== null, 'TRY AGAIN restarted within 500ms');
      assertStep(3, st.diveCount === 1 && st.money === 450, `retry is a fresh PAID dive (diveCount=${st.diveCount}, money=${st.money})`);
      assertStep(3, st.lose === '0', `lose overlay cleared (screen-lose=${st.lose})`);
    } catch (e) {
      await page.screenshot({ path: `${SHOT_DIR}/qa-shot-3.png` });
      summary.assertions.push(`STEP 3: FAIL (${e.message})`);
      throw e;
    }

    // --- 4) sonar button via hud.sonarHit ---------------------------------
    try {
      await page.evaluate(() => {
        window.__game.scene.getScene('Game').state.sonarCharges = 2;
      });
      const { x, y } = toScreen(436, 782);
      await page.mouse.click(x, y); // one tap on the sonar button
      await page.waitForTimeout(120);
      const st = await page.evaluate(getState);
      console.log('SONAR    :', st.charges === 1 ? 'FIRED' : 'DEAD', JSON.stringify(st));
      assertStep(4, st.charges === 1 && st.sonarTimer > 0, `sonar tap registered (charges=${st.charges}, sonarTimer=${st.sonarTimer})`);
      assertStep(4, st.holding === false, 'holding not stuck after sonar tap');
    } catch (e) {
      await page.screenshot({ path: `${SHOT_DIR}/qa-shot-4.png` });
      summary.assertions.push(`STEP 4: FAIL (${e.message})`);
      throw e;
    }

    console.log('pageerrors:', pageErrors.length ? pageErrors : 'none');
    console.log('console errors:', consoleErrors.length ? consoleErrors : 'none');
    console.log('QA-INPUT RESULT: ALL PASS');
    console.log('SUMMARY:', JSON.stringify(summary));
  } catch (e) {
    console.error('pageerrors so far:', pageErrors.length ? pageErrors : 'none');
    console.error(`console errors (${consoleErrors.length}):`);
    for (const line of consoleErrors) console.error('  ', line);
    console.error(`all console messages (${consoleAll.length}) last 15:`);
    for (const line of consoleAll.slice(-15)) console.error('  ', line);
    console.error('QA-INPUT RESULT: FAIL');
    console.error('SUMMARY:', JSON.stringify(summary));
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
