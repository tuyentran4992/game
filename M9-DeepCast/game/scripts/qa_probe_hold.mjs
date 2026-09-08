// Diagnostic probe: hold-to-descend trace. Samples scene state every 500ms.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/node_modules/playwright');

const URL = 'http://127.0.0.1:5209/';
const GAME_W = 480, GAME_H = 854;

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 746 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e)));
  await page.goto(URL);
  await page.waitForSelector('#qa-testids', { state: 'attached' });
  await page.waitForFunction(
    () => document.querySelector('[data-testid=screen-title]')?.textContent === '1',
    undefined, { timeout: 20000 },
  );
  const box = await page.locator('#game canvas').boundingBox();
  const toScreen = (gx, gy) => ({
    x: box.x + (gx / GAME_W) * box.width,
    y: box.y + (gy / GAME_H) * box.height,
  });

  const sample = () => page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const s = sc.state;
    return { phase: s.phase, mode: s.hookMode, hookY: Math.round(s.hookY),
             hookX: Math.round(s.hookX), cd: +s.diveStartCooldown.toFixed(2),
             sc_holding: sc.holding, whaleHooked: s.whaleHooked };
  });

  // click PLAY
  const play = toScreen(240, 457);
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(
    () => window.__game.scene.getScene('Game')?.state?.phase === 'dive',
    undefined, { timeout: 5000 },
  );
  console.log('after PLAY:', JSON.stringify(await sample()));

  const hold = toScreen(240, 640);
  console.log('hold target screen:', hold);
  console.log('mouse tracked pos before down:', await page.evaluate(() => 'n/a'));

  // variant A: down WITHOUT move (mirrors qa_input.py)
  console.log('--- A: mouse.down() with NO preceding move ---');
  await page.mouse.down();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(500);
    console.log(`A t+${(i + 1) * 0.5}s:`, JSON.stringify(await sample()));
    const s = await sample();
    if (s.hookY > 400) break;
  }
  await page.mouse.up();

  // variant B: move THEN down
  console.log('--- B: mouse.move then down ---');
  await page.mouse.move(hold.x, hold.y);
  await page.mouse.down();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(500);
    console.log(`B t+${(i + 1) * 0.5}s:`, JSON.stringify(await sample()));
    const s = await sample();
    if (s.hookY > 400) break;
  }
  await page.mouse.up();
  await browser.close();
}

main().catch((e) => { console.error('PROBE FAIL:', e.message); process.exitCode = 1; });
