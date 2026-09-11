// Shot V-H1: chụp màn Start có delta-bar (seed best 120, last 0) + case ẩn (best 0) → PNG vào outbox.
import { createRequire } from 'node:module';
const gReq = createRequire('/usr/lib/node_modules/noop.js');
const { chromium } = gReq('playwright');

const PORT = process.argv[2] || 5408;
const OUT = process.argv[3] || '/data/agents/fe-dev/outbox/t_8f6172c4';

async function shot(browser, seedObj, name) {
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  if (seedObj) {
    const seed = JSON.stringify(seedObj);
    await page.addInitScript({ content: `try { localStorage.setItem('game_save', ${JSON.stringify(seed)}); } catch {}` });
  }
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => {
    if (!window.__game) return false;
    const sc = window.__game.scene.getScene('StartScene');
    return sc && sc.children.list.some((o) => o.getData && o.getData('testid') === 'delta-bar');
  }, { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1200));
  const bar = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('StartScene');
    const b = sc.children.list.find((o) => o.getData && o.getData('testid') === 'delta-bar');
    return { text: b ? b.text : null, visible: b ? b.visible : null };
  });
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path });
  console.log(JSON.stringify({ name, ...bar, shot: path }));
  await page.close();
}

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
await shot(browser, { schema_version: 2, best_score: 120, bestScore: 120, total_fish: 0, totalFish: 0, total_games_played: 2, totalGamesPlayed: 2 }, 'V-H1-start-deltabar-120');
await shot(browser, { schema_version: 2, best_score: 0, bestScore: 0, total_fish: 0, totalFish: 0, total_games_played: 0, totalGamesPlayed: 0 }, 'V-H1-start-hidden-best0');
await browser.close();
