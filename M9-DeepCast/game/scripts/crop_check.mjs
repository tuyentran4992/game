// Temp QA helper: crop + zoom regions of the v3 PNGs for visual verification.
// Run: node scripts/crop_check.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/node_modules/playwright');

const OUT = '/data/youtube-playables/M9-DeepCast/assets';
const CROPS = [
  { src: `${OUT}/v3_first_catch.png`, name: 'crop_fc8', x: 340, y: 540, w: 280, h: 220, zoom: 3.4 },
];

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
for (const c of CROPS) {
  const vw = Math.round(c.w * c.zoom);
  const vh = Math.round(c.h * c.zoom);
  await page.setViewportSize({ width: vw, height: vh });
  const b64 = readFileSync(c.src).toString('base64');
  const html = `<body style="margin:0;overflow:hidden">
    <img src="data:image/png;base64,${b64}"
         style="position:absolute;left:${-c.x * c.zoom}px;top:${-c.y * c.zoom}px;width:${960 * c.zoom}px;height:${1708 * c.zoom}px;image-rendering:auto">
  </body>`;
  await page.setContent(html);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${c.name}.png` });
  console.log('wrote', c.name, `${vw}x${vh}`);
}
await browser.close();
