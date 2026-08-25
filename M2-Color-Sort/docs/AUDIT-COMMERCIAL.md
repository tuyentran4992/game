# AUDIT — Commercial Gap Analysis · "Neon Sort: Galaxy Pour" (M2)

| | |
|---|---|
| **Audit date** | 2026-08-25 |
| **Repo / dir** | `/data/youtube-playables/M2-Color-Sort` |
| **Commit audited** | `93f94c8` — *feat(m2): juice & interface upgrade — seal VFX + pentatonic audio bus…* (2026-08-25) |
| **Target platform** | YouTube Playables (13+), Phaser 3.80 + TypeScript + Vite 5 |
| **Method** | Full read of `SPEC.md`, `DESIGN-SPEC.md`, `DATA-MODEL.md`, `E2E-TESTS.md`, `TEST-CASES.md`, `games/neon-sort.yaml` and the entire `game/src` tree; `npx tsc --noEmit` (exit 0); `npx vitest run` (**47/47 pass**, 4.65 s); byte-level measurement of `game/dist` + `build/`; numeric simulation of `logic/layout.ts` across 6 device viewports × 9 tube counts; timing benchmark of `createBoard`/`hintMove` for levels 1→35; Phaser source inspection (`node_modules/phaser/src/scene/*`) to verify lifecycle behaviour. |
| **Constraint respected** | No game source was modified. No git commit/push. |

## Verdict

The **puzzle engine is genuinely good** — rules, guaranteed-solvable generation, BFS solver/hint, undo/restart, seal VFX, synth audio bus and the pure-logic unit tests are all real, typed and tested. Everything **around** the engine — platform integration, persistence, ad economy, packaging, high-level board layout and screen polish — is at prototype level.

**Not publishable today.** There are **5 P0 blockers**:

| # | P0 blocker | Evidence |
|---|---|---|
| P0-1 | **No YouTube Playables SDK is actually loaded.** `game/index.html` has no SDK `<script>`; `sdk-handler.ts` targets a *flat* `window.ytgame` shape (`ytgame.gameReady()`, `ytgame.saveData()`) while the platform SDK is *namespaced* (`ytgame.game.*`, `ytgame.system.*`, `ytgame.engagement.*`, `ytgame.ads.*`). Every call is optional-chained, so the game silently runs with **zero** platform integration. | `game/index.html:1-16`, `game/src/sdk-handler.ts:1-92`, cf. `../M1-Rescue-Dodge/game/index.html` which *does* load its SDK |
| P0-2 | **Progress is lost on every refresh / re-entry.** `loadData()` resolves `undefined` → `ctx` falls back to level 1. There is no localStorage fallback (M1 has one) and, by design, **no board/undo-stack snapshot at all** → mid-level progress is always lost even if the SDK worked. | `game/src/context.ts:1-74`, `DATA-MODEL.md §4.2` ("KHÔNG lưu board state") |
| P0-3 | **Crash path: rewarded extra tube → Restart → rewarded extra tube → Restart.** `restartBoard()` resets `extraTubeUsed` to 0 while keeping the extra tube, so the cap is bypassed; the second restart returns a board with **fewer tubes than the UI has**, and `renderLiquid(views, undefined)` throws `TypeError: Cannot read properties of undefined (reading 'slice')` inside a `delayedCall` — the screen is left mid-fade-out (black). Simulated: 7 → 8 → (restart) 8/`used=0` → 9 → (restart) **8 tubes vs 9 tube UIs**. | `game/src/logic/color-sort.ts:388-398`, `game/src/scenes/Gameplay.ts:748-768`, `game/src/ui.ts:208-209` |
| P0-4 | **Shipped artifact is stale and missing all art.** `build/neon-sort.zip` (2026-08-22, 377 872 B, 7 files) contains only `index.html`, an **older** JS bundle (`index-BDtjmcnc.js`) and 5 mp3s — **no PNGs at all**, i.e. no space background. Current `dist` JS is `index-DqsO9Cy9.js` (1 530 890 B). | `unzip -l build/neon-sort.zip`, `game/dist/assets/` |
| P0-5 | **`gameReady()` fires before the game can be played** — it is called at module scope in `main.ts:69`, before `BootScene.preload()` has loaded ~800 KB of assets, and there is no loading UI. The platform will dismiss its loader and hand over a blank canvas. | `game/src/main.ts:60-69` |

---

## A) Summary scorecard

| Area | Status | Top gaps | Effort |
|---|---|---|---|
| **1. Save / Resume** | ❌ | No SDK actually loaded → `loadData()` always empty; no localStorage fallback; **no board/undo snapshot** so mid-level progress is always lost; mute state, hint usage, `extraTubeUsed` not persisted; `saveData()` returns `true` even when nothing was saved; `sendScore` shape mismatch | **M** |
| **2. Monetization / Ads** | ❌ | Pre-roll not handled (no gate, no `gameReady` sequencing); interstitial fires on **every** level ≥ 2 with no frequency cap / cooldown / timeout / failure UX; rewarded hint has **no once-per-level cap** (config flag `hintOncePerLevel` is dead code) and silently no-ops when the ad fails; rewarded extra-tube is reachable **only** from the stuck tooltip; restart deletes a tube the user paid an ad for | **M** |
| **3. Performance & mobile tube limit** | ⚠️ | Layout splits to 2 rows at **n = 4** and 3 rows at **n = 7-9** on phones, filling the screen edge-to-edge (14-18 px bottom slack) → the reported "crowded at 6-7 tubes"; DESIGN-SPEC §2.3 column caps unimplemented (7 cols @768 px, 12 cols @1280 px); gaps never grow (fixed 10/14 px) and collapse to 5 px @360 px; capacity ignored → 14-21 px liquid layers on small phones; **`createBoard` blocks the main thread 1 542 ms at level 30**; `hintMove` 414 ms; 3 leaked `scale.on('resize')` listeners (Phaser never calls the `shutdown()` method in `Start.ts:289`) | **L** |
| **4. Spec / business-rule compliance** | ⚠️ | 4/11 rules fully pass, 6 partial, 1 fails (M2-08 save). `level-select` testid + screen missing; **all** other `data-testid`s are Phaser `setData()` values, not DOM attributes → `E2E-TESTS.md` (33 cases) cannot run as written; `board` testid is a full-screen zone, not the board rect; `games/neon-sort.yaml` diverges from runtime `mechanics.ts` (config-as-truth broken); solvability test coverage 24 boards vs the required N ≥ 2000 | **M** |
| **5. UI / UX polish** | ⚠️ | Start tutorial line ~395 px wide at 18 px with **no `wordWrap`** → clipped on ≤390 px viewports; HUD capsules **overlap the audio button** at ≤360 px (44 px overlap at 320 px); Start layout is pure fractions → title/tubes/button/caption collide on short (landscape) viewports; system-ui font + `fontStyle:'bold'` ignores the 900/800 weight tokens ("simple title"); primary button paints a white 0.25 gloss slab (the "old glossy Play button") and fake 3 px glow instead of the spec's 24 px neon glow; empty/low tubes get **no ambient glow** while sealed tubes get frost+ring+shimmer → the "left flat/dark vs right neon" asymmetry; LevelClear is a **separate scene** that repaints the background (board disappears) with a dark panel contradicting DESIGN-SPEC §3.5, and its panel is never re-rendered on resize → clipping after rotation | **L** |
| **6. Production / commercial readiness** | ❌ | Stale zip with no art (P0-4); `dist` = 4.4 MB of which **2.07 MB is leaked `.gen_cache/*.src.png`** (Vite `publicDir: '../assets'`); 267 KB of shipped-but-never-loaded art (`ui_chrome`, `liquid_neon`, `tube_base`); single 1.46 MiB JS file vs the < 512 KB per-file target; validator under-counts the bundle (sums only `assets/raw`); no colour-blind cues / no delta-E guard; audio toggle only exists in Gameplay and is not persisted; English-only (no `getLanguage()`); metadata itself is compliant (title 22, desc 116, 3 thumbnails + preview) but was generated 3 days before the art upgrade | **M** |
| *(bonus)* **Code health** | ⚠️ | `tsc` clean, 47/47 tests pass, logic is well isolated — but 3 scene-level event-listener leaks, one crash path, dead code (`Start.shutdown`, `hintOncePerLevel`, `tube_base` preload), no error boundary / global `onerror` reporting, no CI | **S** |
| *(bonus)* **QA / E2E harness** | ❌ | Canvas-only game with zero DOM affordances; no test bridge (`window.__M2`) → the entire documented E2E suite is unexecutable; no perf budget assertions | **S** |

**Overall readiness: ~55 %** — engine 85 %, platform integration 15 %, commercial polish 45 %.

---

# B) Detailed findings

## B1. SAVE / RESUME — ❌

### What exists
- ✅ A typed save payload and a single game-context module: `game/src/context.ts:1-74` persists
  `{ schema_version: 1, best_level, current_level, best_moves, best_moves_by_level, last_updated_ts, flags: { tutorial_seen } }`.
- ✅ `save()` is called at the three sensible moments: first tutorial view (`Gameplay.ts` → `showTutorial`), on level clear (`ctx.onLevelClear()`), and on **Next Level** (`LevelClear.ts:137-141`).
- ✅ `ctx.load()` gates scene start (`main.ts:60-68`, `Gameplay.create()` awaits it) so a slow load cannot race the first frame.
- ✅ Payload is ~200 bytes — three orders of magnitude below the 3 MiB `saveData` limit (M2-10 ✔).

### What is broken or missing

| # | Finding | Severity | Evidence |
|---|---|---|---|
| S-1 | **The SDK is never loaded.** `game/index.html` contains only the module script — no `<script src="…game_api…">`. M1 by contrast loads its bridge (`../M1-Rescue-Dodge/game/index.html`). So `window.ytgame` is `undefined` in *every* environment, including inside Playables. | **P0** | `game/index.html:1-16` |
| S-2 | **Wrong API shape.** `sdk-handler.ts` assumes a flat object: `this.ytgame?.saveData?.(json)`, `this.ytgame?.loadData?.()`, `this.ytgame?.gameReady?.()`, `this.ytgame?.sendScore?.(n)`. The platform SDK is namespaced: `ytgame.game.saveData()/loadData()/gameReady()/firstFrameReady()`, `ytgame.engagement.sendScore({value})`, `ytgame.system.*`, `ytgame.ads.*`. Even if the script were added, **nothing would bind**. | **P0** | `game/src/sdk-handler.ts:20-80` |
| S-3 | **No fallback storage.** No `localStorage`, no `sessionStorage`, no in-memory carry-over across a reload. M1 ships a localStorage fallback; M2 does not. Result: refresh → level 1, always. | **P0** | `grep -rn "localStorage" game/src` → 0 hits |
| S-4 | **No mid-game state is saved at all** — by explicit design decision in `DATA-MODEL.md §4.2` ("KHÔNG lưu board state / lịch sử / giữa-level"). For a commercial casual puzzle this is a retention killer: a player 20 moves into a 12-tube board who gets a phone call loses everything. Board state is trivially serialisable (`tubes: string[][]` → colour indices ≈ 60 bytes for 12×5). | **P1** | `DATA-MODEL.md §4.2`, `game/src/logic/color-sort.ts:20-60` (BoardState shape) |
| S-5 | **False-positive success.** `saveData()` returns `true` when `window.ytgame` is missing (`return true` at the end of the optional-chained path), so the caller can never distinguish "saved" from "no-op". Any future telemetry or retry logic built on it is wrong. | **P2** | `game/src/sdk-handler.ts:44-56` |
| S-6 | **Non-persisted state that players expect to persist:** mute/audio preference (`synthAudio.isMuted()` is session-only), `hintUsedThisLevel` (does not exist), `board.extraTubeUsed`, per-level star rating, total levels cleared / play time. | **P2** | `game/src/audio.ts:1-220`, `game/src/context.ts` |
| S-7 | **`sendScore` never lands.** `ctx.onLevelClear()` calls `sdk.sendScore(this.bestLevel)`; the platform expects an object (`{value}`) on `ytgame.engagement`. No leaderboard/engagement signal will be recorded. | **P1** | `game/src/context.ts:60-70` |
| S-8 | **No save-throttling / conflict policy.** `save()` is `void`-called without awaiting or debouncing; three rapid clears fire three writes. Platform quotas and rate limits are undocumented but real — a debounce (≥1 s) plus "last write wins with `last_updated_ts` comparison on load" is standard. | **P3** | `game/src/context.ts:40-58` |

### Does a returning player resume?
**No.** Deterministic seeding (`createBoard(MECHANICS, level, level*7919+13)`, `color-sort.ts:380`) means that *if* `current_level` were restored the exact same board would be regenerated — a good property to build on. But today: refresh → `ctx.load()` → `undefined` → `currentLevel = 1` → level 1. Mid-level: even with a working SDK, `moveCount`, `history` (undo stack), `sealedTubes` and any extra tube are discarded.

### Recommended target design (minimum commercial bar)
```jsonc
{
  "schema_version": 2,
  "best_level": 27, "current_level": 27, "best_moves_by_level": { "26": 14 },
  "flags": { "tutorial_seen": true, "muted": false },
  "session": {                     // NEW — mid-level resume, ~80-200 bytes
    "level": 27, "seed": 213826, "capacity": 5,
    "tubes": [[0,3,3],[1],[],[2,2,0,1]],      // colour INDEXES into colorsForLevel(level)
    "moves": 18,
    "history": [[0,3,2],[1,4,1]],             // [from,to,count] — replayable undo stack
    "extra_tubes": 1, "hint_used": true
  },
  "last_updated_ts": 1787000000
}
```
Plus: dual-shape SDK adapter (namespaced → flat → localStorage), `firstFrameReady()` → `gameReady()` after `BootScene` completes, debounced writes, and a `session` invalidation rule (drop it if `level` no longer matches or `schema_version` is older).

---

## B2. MONETIZATION / ADS — ❌ (implemented as stubs, not as an economy)

### Inventory

| Placement | Spec | Code | Status |
|---|---|---|---|
| **Pre-roll** | SPEC §3 + §7 ("platform tự chạy… sau ad mới nhận tap") | Nothing. `gameReady()` at `main.ts:69` fires before assets load; no "wait for ad / resume input" state, no `onPause/onResume`-driven input gate | ❌ |
| **Interstitial between levels** | M2-07: between levels, never in level 1 | `LevelClear.ts:128-135`: `if (level > 1 && MECHANICS.ad.interstitialAfterClear) await sdk.requestInterstitialAd()` — correct *placement*, but fires on **100 % of clears from level 2 onward** | ⚠️ |
| **Rewarded — hint** | M2-06 + `neon-sort.yaml` `hint_once_per_level: true` | `Gameplay.ts:772-817`: `await sdk.requestRewardedAd('hint')`, then `if (!earned) return;` | ⚠️ |
| **Rewarded — extra tube** | M2-06, `max_extra: 1` | `Gameplay.ts:819-833` + button only inside `showStuckTooltip()` (`Gameplay.ts:847-896`) | ⚠️ |
| Frequency capping / cooldown | Industry standard: ≥ 60-90 s between interstitials, ≤ 1 per 2-3 levels | None anywhere | ❌ |
| Ad-failure fallback UX | Required for revenue *and* for UX | None — every failure path is a silent `return` or `catch {}` | ❌ |

### Findings

1. **`requestRewardedAd` grants the reward for free when there is no SDK** (`sdk-handler.ts:70-78` returns `true` if `!this.ytgame`). Since the SDK is never loaded (S-1/S-2), **all rewarded ads are currently free rewards in production**. Revenue = 0 while the cost (difficulty relief) is fully paid out. **P0 for monetization.**
2. **Interstitial cadence is aggressive and uncapped.** Early levels take 10-30 s → an interstitial every ~20 s from level 2. This is both a policy risk and a churn risk. Needed: `lastInterstitialTs` + `levelsSinceAd` gate (e.g. `level >= 3 && levelsSinceAd >= 2 && now - last > 75_000`), persisted in the save payload.
3. **No timeout on the interstitial await.** `await sdk.requestInterstitialAd()` inside the NEXT-LEVEL handler has no `Promise.race([ad, timeout(4000)])`; if the promise never settles the button looks dead and the player is stuck on the clear screen. **P1.**
4. **`hintOncePerLevel` is dead configuration.** `mechanics.ts:70-80` declares it; nothing reads it (`grep hintOncePerLevel` → declaration only). A player can tap 💡 unlimited times, each time firing a rewarded request → ad-spam risk (platform-side throttling / policy flags) and zero perceived scarcity. Also there is no local "first hint free" onboarding grant, which is the standard conversion funnel.
5. **Rewarded UX violates the "no surprise ads" norm.** Tapping 💡 goes straight into an ad request — there is no confirmation dialog ("Watch a short ad for a hint?"), no ad-availability check, no spinner, and on failure literally nothing happens (`Gameplay.ts:776-777`). Users will read it as a broken button.
6. **Extra tube is nearly undiscoverable.** It only appears inside a stuck tooltip that auto-hides after 4 s (`Gameplay.ts:889-895`). Water-sort monetization normally exposes "+1 tube" as a permanent toolbar slot with a small ▶ ad badge. Discoverability ≈ revenue here.
7. **Restart silently confiscates a paid reward** (see P0-3): after watching an ad for +1 tube, `Restart` regenerates the board and — on the second cycle — removes the tube and crashes. Even in the non-crashing first cycle, `extraTubeUsed` resets to 0, breaking the `max_extra: 1` business rule.
8. **Reward-tag naming drift:** code sends `'extra_tube'` (`Gameplay.ts:821`) while `TEST-CASES.md` (PC-08) specifies `'extra-tube'`. Harmless today (the real API takes no tag), but it means the documented test can never pass.
9. **No non-ad economy.** No coins, no "watch 1 ad → 3 hints", no daily free hint, no reward for streaks. For a puzzle with infinite levels this is the main missed revenue lever after interstitials.
10. **No self-monetization / external ad code** — ✅ compliant with M2-09 (verified: `grep -rn "http" game/src` finds no ad domains; `index.html` has no third-party script).

### Expected commercial impact
With the current code in a Playables environment: **pre-roll = platform only, interstitial ≈ 1 per level (policy risk), rewarded = 0 real impressions** (SDK not bound). After fixing the adapter + capping, a realistic mix for a water-sort at ~8-12 min average session is 1 interstitial per 2-3 levels (≈ 3-5/session) plus 0.5-1.5 rewarded/session — but only if hint/extra-tube are visible, capped and confirmed.

---

## B3. PERFORMANCE & THE MOBILE TUBE LIMIT — ⚠️

### The user complaint is reproducible and quantified

`logic/layout.ts` was compiled and executed with the **exact options Gameplay passes** (`hudH: 104, toolbarH: 126, marginX: 16` — `Gameplay.ts:220-271`). Measured results (tube size, grid, and remaining space below the last row):

| Viewport | n=4 | n=6 | n=7 | n=9 | n=10 | n=12 |
|---|---|---|---|---|---|---|
| **390×844** (iPhone 12/13) | **2×2** 92×236, slack 64 | 3×2 92×236, slack 64 | 4×2 77×183, slack 117 | **3×3** 78×186, **slack 14** | 4×3 77×183, slack 18 | 4×3 77×183, slack 18 |
| **412×915** (Pixel 7) | 2×2 92×236 | 3×2 92×236 | **3×3** 88×210, **slack 14** | 3×3 88×210, slack 14 | 4×3 82×196, slack 34 | 4×3 82×196, slack 34 |
| **360×640** (small Android) | 2×2 77×184, slack 14 | 3×2 77×184, slack 14 | 4×2 70×166 | 5×2 54×128 | 5×2 54×128 | 6×2 **49×116, gapX 5** |
| **320×568** (iPhone SE) | 4×1 60×142 | 3×2 62×148 | 4×2 60×142 | 5×2 46×109 | 5×2 46×109 | 4×3 **44×94** (floor) |
| **768×1024** (iPad) | 4×1 92×236 | 6×1 92×236 | **7×1** 92×236 | 5×2 | 5×2 | 6×2 |
| **1280×720** (desktop) | 4×1 | 6×1 | 7×1 | 9×1 | 10×1 | **12×1** 92×236, side margin 33 |

**Root causes of "full/crowded at 6-7 tubes":**

1. **The scoring function maximises tube *area*, not readability.** `score = tubeW*tubeH − rows*ROW_PENALTY + (tubeW ≥ 44 ? TOUCH_BONUS : 0)` with `ROW_PENALTY = 1200` (`layout.ts:58-60, 112`). At 390×844, a single row of 4 tubes scores 77×183 − 1200 + 4000 = **16 914**, while a 2×2 grid of max-size tubes scores 92×236 − 2400 + 4000 = **23 312** → the board goes **multi-row at n = 4**, i.e. at level 5. Two/three rows read as "a crowded wall of tubes" long before the tubes are actually small.
2. **The board is centred but expands to fill the whole area.** `startY = areaTop + (areaH − boardH)/2` with tube heights clamped only by `maxTubeH = 236`; at 3 rows the board occupies the *entire* space between HUD and toolbar (top = 118 = `hudH + 14`, slack below = **14-18 px**). There is no reserved "breathing room" / board padding, so tubes visually touch the HUD pips and the toolbar.
3. **Gaps never grow, only shrink.** `gapX/gapY` are pinned to `minGapX = 10 / minGapY = 14` (`layout.ts:52-53, 88, 96`) and collapse to 5 px when width is tight (`layout.ts:103`). Large tubes with 10 px gaps look packed; 6 columns with 5 px gaps at 360 px are mis-tap territory even though `tubeW` (48.8) passes the 44 px check.
4. **DESIGN-SPEC §2.3 column caps are not implemented.** The spec says "< 900 px → max 5 cols"; the code produces **7 columns at 768 px** and **12 columns in one row at 1280 px** (a 1 128 px-wide strip of tubes with 33 px side margins — unusable on desktop and nothing like the mock).
5. **Tube capacity is not an input to the layout.** From level 21 `capacity = 5` (`mechanics.ts` ramp) but `tubeH` is unchanged, so the liquid layer height (`usableH/capacity`, `ui.ts:219`) drops to **≈32 px** at 390 px, **≈20 px** at 360 px and **≈14 px** at 320 px — below the readable/aimable threshold, and the seal frost/ring detail becomes mush.
6. **`minTubeH` floor is bypassed.** `layout.ts:108` allows `tubeH` down to `minTubeH*0.6 = 62.4`, and the SE case lands at 94 px — under DESIGN-SPEC §3.1's stated minimum tube of **44×120**.
7. **Touch targets pass the letter of the rule, not the spirit.** `hitW/hitH = max(44, tube)` (`layout.ts:131-132`) inflates the *hit box* when the tube is smaller than 44 px, so at very small viewports hit boxes overlap the neighbouring tube's visual area → taps land on the wrong tube. The unit test only asserts `tubeW ≥ 44` at 390×844 (`layout.test.ts:35-42`); 320 px-wide phones and gap adequacy are untested.

### Recommended scalable grid (design, not applied)

```ts
// 1) Cap columns by width band (DESIGN-SPEC §2.3) and by row aesthetics
const maxColsByWidth = w < 380 ? 4 : w < 480 ? 5 : w < 900 ? 6 : w < 1500 ? 7 : 8;
const maxRows        = h / w > 1.5 ? 3 : 2;             // portrait may use 3 rows, landscape 2
// 2) Reserve breathing room *before* fitting: 6 % of board area, min 16 px each side
const padY = Math.max(16, areaH * 0.06), padX = Math.max(12, availW * 0.04);
// 3) Elastic gaps: gap = clamp(tubeW * 0.18, 8, 22) — grows with tube size
// 4) Capacity-aware minimum: tubeH >= capacity * MIN_LAYER_PX (MIN_LAYER_PX = 26)
//    → if unsatisfiable, add a row before shrinking the tube
// 5) Score for readability, not area:
//    score = layerH * 60            // legibility of a single liquid slice
//          + Math.min(tubeW, 92) * 8
//          - rows * 240             // mild row penalty (was 1200)
//          - (gap < 10 ? 5000 : 0)  // never mush
//          + (tubeW >= 44 && layerH >= 26 ? 6000 : 0);
// 6) Fill order: bottom row first, wide rows on top (players scan bottom-up when pouring),
//    and centre-align every row (tubePosition() already does this).
```
Expected outcome at 390×844: n≤5 → 1 row of 5 (70×167, layer 36); n=6-10 → 2 rows (≤5 cols, 70×167); n=11-12 → 2 rows of 6 (58×138, layer 28) or 3 rows only when `capacity ≥ 5`; ≥ 20 px gaps; 40-60 px slack retained. Desktop 1280×720 → 2 rows of ≤7, tubes at max size, board centred.

### Main-thread performance (measured, single run, Node 20 on this machine)

| Level | tubes×colors×cap | `createBoard` | `hintMove` |
|---|---|---|---|
| 1 | 3×2×4 | 2 ms | 0 ms |
| 12 | 7×6×4 | 2 ms | 1 ms |
| 16 | 9×7×4 | 49 ms | 36 ms |
| 21 | 10×8×5 | 105 ms | 115 ms |
| 25 | 10×8×5 | 169 ms | 155 ms |
| **30** | **12×10×5** | **1 542 ms** | 275 ms |
| 35 | 12×10×5 | 876 ms | 414 ms |

- `createBoard` runs **synchronously inside `Gameplay.create()`** (`Gameplay.ts:74`) → at level 30 the game freezes for ~1.5 s **with no loading indicator**, right after a fade-out. On a mid-range phone (3-5× slower than this machine) that is a **3-8 s black freeze** per level entry — likely read as a crash, and a hard fail against the < 5 s interaction budget.
- Cause: up to 25 generate attempts × `solveBoard(…, 15000 states)` verification (`color-sort.ts:300-360`), plus BFS `maxStates = 40000` / `25000` for hints (`color-sort.ts:405`).
- Fixes (cheap → thorough): (a) show a "generating…" overlay + defer generation one frame; (b) memoise the verified board per `(level, seed)` in the save/session payload; (c) cap attempts and fall back to "scramble-only" boards, which are solvable **by construction** (the reverse-scramble already guarantees it — the BFS is a belt-and-braces check that costs 1.5 s); (d) move solver to a Web Worker or an incremental time-sliced loop; (e) pre-generate level N+1 during the LevelClear animation.

### Other performance / stability findings

| # | Finding | Severity | Evidence |
|---|---|---|---|
| P-1 | **Listener leak in all 3 scenes.** `this.scale.on('resize', …)` is registered in `create()` and never removed. Phaser only auto-invokes `init/preload/create` (verified in `node_modules/phaser/src/scene/SceneManager.js` `bootScene`) — the `shutdown()` method at `Start.ts:289` is **never called**, and no scene registers `events.once('shutdown')`. After 20 levels, one resize event triggers ~20 full rebuilds of bg + HUD + board + toolbar (Gameplay re-creates dozens of Graphics/Text objects each time) → multi-second hitch + garbage churn on rotation. Start's stale handler also mutates destroyed objects. | **P1** | `Gameplay.ts:105`, `Start.ts:192,289`, `LevelClear.ts:152` |
| P-2 | Full-screen interactive `Zone` at `z.bg` (`Gameplay.ts:266-268`) is used as the `board` testid target; it also swallows nothing and does not deselect on background tap (missed UX affordance). | P3 | `Gameplay.ts:260-270` |
| P-3 | `bgm_main.mp3` is started with `this.sound.play` on every `GameplayScene.create()` (`Gameplay.ts:106-108`) — i.e. a **new looping instance per level**; volumes stack. | **P2** | `Gameplay.ts:106-108` |
| P-4 | 1.46 MiB single JS chunk, no code-splitting, full Phaser build (physics/tilemaps/particles unused). Parse+compile is ~200-400 ms on mid-range mobile. | P2 | `dist/assets/index-DqsO9Cy9.js` = 1 530 890 B |
| P-5 | No FPS/frame-budget instrumentation, no `devicePixelRatio` cap. `Scale.RESIZE` at native CSS pixels means a 1440p desktop renders a huge canvas with `ADD`-blend glow layers and shimmer tweens on every sealed tube. | P3 | `main.ts:36-44`, `ui.ts` seal shimmer loops |
| P-6 | Confetti spawns 46 burst particles + 18-30 falling streaks with per-particle tweens (`LevelClear.ts:160-186`) — acceptable, but it runs *while* the interstitial may be loading. | P3 | `LevelClear.ts:160-186` |

---

## B4. SPEC / BUSINESS-RULE COMPLIANCE — ⚠️

### M2-01 … M2-11

| ID | Rule (SPEC §6) | Status | Evidence / gap |
|---|---|---|---|
| **M2-01** | Pour only when destination empty **or** (has ≥1 space **and** same top colour); illegal → board unchanged + shake/sfx | ✅ | `color-sort.ts:isLegal()/topRun()/pourAmount()`; invalid feedback = shake + `playBuzz()` + `sfx_error` in `Gameplay.ts` pour handler; covered by `color-sort.test.ts` (33 tests) |
| **M2-02** | Win = every tube empty or single-colour → Clear popup + confetti + next level | ✅ | `isWin()`; `Gameplay.onLevelClear` → `LevelClearScene` with confetti (`LevelClear.ts:160-186`). ⚠️ popup is a *scene swap* that hides the finished board (see B5) |
| **M2-03** | No lose / no timer; when stuck → guide to Undo/Restart/Hint | ✅ / ⚠️ | No timer anywhere ✔. Stuck tooltip exists (`Gameplay.ts:847-896`) but fires **immediately** after the pour that caused it, whereas DESIGN-SPEC §6 asks for a 1.2 s delay; it auto-hides after 4 s and never returns unless another move is attempted; no persistent "stuck" indicator |
| **M2-04** | Board **always** solvable (reverse generation); never emit unsolvable | ✅ | `generateBoard()` reverse-scramble + `solveBoard()` verification with up to 25 attempts (`color-sort.ts:208-380`); `solutionPath`/`optimalMoves` stored. ⚠️ test coverage is 6 levels × 4 seeds = 24 boards vs `TEST-CASES.md` GL-20's **N ≥ 2000**; ⚠️ verification cost = the 1.5 s freeze (B3) |
| **M2-05** | Undo one move; Restart resets to the **original** board | ✅ / ⚠️ | `undoMove()` reverse-applies with count (unlimited undo) ✔. `restartBoard()` *regenerates* from the same seed — deterministically identical ✔ — **but** resets `extraTubeUsed` (cap bypass) and can desync tube count vs UI → **P0-3 crash**; `moveCount` reset ✔ |
| **M2-06** | Rewarded: hint + extra tube (max per level design) | ⚠️ | Both exist but: hint uncapped (`hintOncePerLevel` dead), no confirm/availability/fallback, extra tube hidden in the stuck tooltip, reward tag naming drift, free rewards when SDK absent (B2) |
| **M2-07** | Interstitial between levels, never during level 1 | ⚠️ | Correct gate `level > 1` (`LevelClear.ts:128`) but **every** clear, no cap/cooldown/timeout (B2) |
| **M2-08** | Persist best-level / current-level / best-moves via `saveData`; never crash, has fallback | ❌ | Payload correct in shape, but no SDK script, wrong API shape, no fallback → nothing persists (B1). "No crash" holds only because every call is optional-chained |
| **M2-09** | No external network, no 3rd-party ads, no self-monetization | ✅ | `index.html` loads only the local module; all audio is synthesised or local mp3; no fetch/XHR/WebSocket in `game/src`. (Ironically the one script that *should* be there — the ytgame SDK — is missing) |
| **M2-10** | < 30 MB initial (target < 5 MB), per-file < 30 MB (target < 512 KB), load < 5 s, save < 3 MB, no compression tricks | ⚠️ | `dist` = 4.4 MB but **2.07 MB is leaked build cache**; real payload 2.3 MB ✔ < 5 MB; **JS 1.46 MiB and `bg_space.png` 572 KiB exceed the 512 KB per-file target**; load time never measured; 267 KB of never-loaded art shipped; save ≈ 200 B ✔ |
| **M2-11** | Responsive all aspects, touch + mouse, obey pause/mute, 13+ | ⚠️ | Board layout is genuinely responsive (no overflow across 7 viewports, `layout.test.ts`) but violates DESIGN-SPEC §2.3 column rules, HUD overlaps at ≤360 px, Start/LevelClear only reposition (never re-flow), pause only pauses `GameplayScene` (`main.ts:50-58`), mute not persisted, no orientation-change re-render of the clear panel. Content is 13+ safe ✔ |

**Score: 4 ✅ / 6 ⚠️ / 1 ❌.**

### `data-testid` coverage (SPEC §5)

| testid | Present | How | Problem |
|---|---|---|---|
| `game-canvas` | ✅ | real DOM attribute (`main.ts:32`) | — |
| `start-btn` | ⚠️ | `setData('testid', …)` (`Start.ts:121` → `ui.ts:831-835`) | not queryable from the DOM |
| `level-select` | ❌ | — | no LevelSelect / continue screen exists at all |
| `level-label` | ⚠️ | `Gameplay.ts:133` | canvas-only |
| `move-count` | ⚠️ | `Gameplay.ts:148` | canvas-only |
| `board` | ⚠️ | `Gameplay.ts:267` | it is a **full-screen** Zone, not the board rect → bounding-box assertions are meaningless |
| `tube-<i>` | ⚠️ | `Gameplay.ts:244` | canvas-only |
| `undo-btn` / `restart-btn` / `hint-btn` | ⚠️ | `Gameplay.ts:681-693` | canvas-only |
| `next-level-btn` | ⚠️ | `LevelClear.ts:118` | canvas-only |
| extras | ✅ | `seal-progress`, `audio-toggle`, `extra-tube-btn` | canvas-only |

**Consequence:** `E2E-TESTS.md` (E2E-01 … E2E-33) and `TEST-CASES.md` GL-44 are **unexecutable as written** — Playwright cannot see `setData` values, and the documented `localStorage` reset keys (`m2_save` / `neon_sort_save`) do not exist. A commercial project needs a deliberate test surface, e.g.:

```ts
// dev/E2E build only — 20 lines, zero prod cost behind import.meta.env
window.__M2 = {
  state: () => ({ level, moves, tubes, selected, sealed, win }),
  tap: (testid: string) => { /* dispatch pointerdown on the matching object */ },
  rect: (testid: string) => ({ x, y, w, h }),
  reset: () => { /* clear save + restart */ },
};
```
plus an invisible DOM mirror (`<div data-testid="tube-3" style="position:absolute;…">`) for the ~12 interactive elements if the QA plan must stay DOM-based.

### Config-as-truth drift (`games/neon-sort.yaml` vs `logic/mechanics.ts`)

| Item | YAML (source of truth) | Runtime code | Impact |
|---|---|---|---|
| Starting tubes / colours | 4 tubes / 3 colours | **3 tubes / 2 colours** | level 1 is easier than designed |
| Palette size | 8 colours | **12 colours** (`tokens.ts:31-44`) | different difficulty curve; palette also does not match DESIGN-SPEC §1.3's 12 hexes |
| Ramp | L1 4/3 · L3 5/4 · L6 6/5 · L10 8/6 · L15 10/7 · L22 12/9 | L1 3/2 · L3 · L6 · L9 · L12 · L16 · L21 · L30 (8 steps, scramble 5→70) | published difficulty tuning is not what the config says |
| `shuffle_back_steps` | 60 | per-step 5…70 | — |
| `hint_once_per_level` | true | declared, **unused** | rule not enforced |
| `ad.interstitial_after_levels` | `DATA-MODEL.md` mentions 2 | not implemented (every level) | pacing |

The pipeline is supposed to be config-driven (`SPEC.md §2`); today the YAML is decorative for gameplay. Either generate `mechanics.ts` from the YAML during `pipeline scaffold`, or make the YAML the shipped JSON that `mechanics.ts` reads.

---

## B5. UI / UX POLISH — ⚠️ (good juice, weak layout discipline)

### 5.1 Start-screen tutorial text is clipped — root cause found

`Start.ts:177-183`
```ts
this.hintLine = this.add.text(width/2, height*0.61,
  'Pour a tube into one solid color to seal it',
  fontStyle(type.small, color.surface)).setOrigin(0.5)
```
- The string is **42 characters** rendered at `type.small` = **18 px** with `fontStyle: 'bold'` → measured advance ≈ **390-400 px** for a bold system sans.
- There is **no `wordWrap`, no `setMaxWidth`, no font down-scaling**, and `Scale.RESIZE` means the game width equals the CSS pixel width, so a 390 px iPhone gets a line as wide as the screen and a **360 px / 320 px phone clips both ends**.
- `onResize` (`Start.ts:195-215`) only re-positions — it never re-wraps or re-scales, so rotating or resizing never fixes it.
- **Fix (S):** `fontStyle(...)` + `{ wordWrap: { width: Math.min(width - 48, 460) }, align: 'center' }`, plus a responsive size `Math.max(14, Math.min(18, width/22))`, and recompute on resize. Same treatment for the tutorial banner (`Gameplay.ts:898`, 24 px × 27 chars ≈ 330 px → clipped at 320 px).

**Two more Start-screen layout defects found while measuring:**
- The title glow is a **fixed** `fillRoundedRect(-190,-52,380,108,34)` (`Start.ts:46-49`) → 380 px wide on a 360 px screen: the "glow" becomes a full-width band bleeding off both edges; on a 768 px tablet it is a small badge behind oversized text.
- All vertical positions are pure fractions (0.20 title, 0.46 demo, 0.61 hint, 0.72 button, 0.81 caption) with **fixed pixel heights**. At 360 px viewport height (landscape phone / small window) the caption at `0.81h = 292` lands **inside** the 72 px PLAY button (centred at `0.72h = 259`, bottom 295), and the 153 px demo tubes overlap the title glow. No `min-height` guard, no landscape-specific layout.
- Demo tubes are hard-coded `drawTube(this, 76, 180, 4)` at x = ±56 (`Start.ts:93-101`) → on tablets/desktop they are a tiny 65×153 pair in the middle of a huge screen (weak first impression, and the Start screen is what the Playables preview thumbnail is judged on).

### 5.2 "Left tube flat/dark, right tube neon" — root cause found

The glass body is drawn by the **same** code for every tube (`ui.ts:redrawGlassBody`), so the inconsistency is *state-driven*, not code-drift:
1. `renderLiquid()` draws the ambient neon halo **only when the tube has content** (`ui.ts:220-228`: `if (content.length > 0) { ambientGlow.fillStyle(topColor, 0.18) … }`), and returns early for empty tubes (`ui.ts:230`). An **empty workspace tube therefore has zero glow** → reads as flat dark glass next to glowing neighbours.
2. In the Start demo, after the pour the source tube is re-rendered with only **1 remaining layer** (`Start.ts:264-268`, `renderLiquid(src, srcBase)`) while the destination is **full + sealed** — `sealTube()` adds frost, a snap ring and a 2.6 s shimmer loop (`ui.ts:483+`, `tokens.ts:fx`) — and the loop holds that state for **1 900 ms** before resetting (`Start.ts:282`). For most of the cycle the viewer sees exactly "dull left, brilliant right".
3. In Gameplay, selecting a source dims all illegal destinations to `fx.dimInvalid = 0.30` (`tokens.ts:79`), which is *intended* but amplifies the same perception.
- **Fix (S-M):** give empty tubes a faint neutral rim glow (accent at 0.06-0.08) so the glass never looks unlit; render the ambient halo proportional to fill (`0.10 + 0.10 * fill%`) instead of binary; in the Start demo, keep both tubes visually alive (e.g. seal-then-unseal both alternately, or start the loop from a state where the source is ≥ 3 layers); optionally dim by desaturation rather than alpha so dimmed tubes keep their neon edge.

### 5.3 "Simple title font + old glossy Play button"

| Symptom | Root cause | Fix |
|---|---|---|
| Title looks like plain bold system text | `tokens.ts:112-120` `fontStyle()` hard-codes `fontFamily: 'system-ui, …'` and `fontStyle: 'bold'` — it **ignores `token.weight`** (900/800) and `lh`. No display/neon webfont, no gradient fill, no outline (DESIGN-SPEC §4.1 asks for a heavy stroke) | Ship one subsetted display font (WOFF2, ~20-30 KB, e.g. a geometric heavy sans) or bake the wordmark as a single 40-60 KB PNG/SVG; pass `fontFamily` + real numeric weight through `fontStyle()`; add `setStroke('#0B0B1E', 6)` + two-tone gradient fill via `setTint`/canvas gradient |
| PLAY button looks like a 2010 "glossy" button | `ui.ts:793-795` paints a **white 25 % alpha rounded slab over the top 45 %** of the primary button — a classic gel highlight, which is exactly what DESIGN-SPEC §3.5 does *not* ask for; the "glow" is a single 3 px offset rect at 0.2 alpha (`ui.ts:785-786`), not a soft 24 px neon bloom | Replace the gel slab with a 1 px inner top highlight at 0.10-0.14 alpha or a subtle vertical gradient; implement real glow with a pre-rendered radial-gradient texture (or `Graphics` + `postFX.addGlow()` on WebGL) sized to `glow.primary.blur = 24`; add a 2 px `primaryDark` bottom border per spec |
| Icons/emoji inconsistent across devices | HUD/labels use emoji (`🔊/🔇`, `⤵`, `⚡`, `✨`, `🎉`, `★`) which render differently (or as tofu) per OS/WebView. Toolbar buttons *do* use vector icons (`ui.ts:drawToolbarIcon`) — good | Extend `drawToolbarIcon()` to speaker/mute/star/moves and drop emoji from all HUD/panel strings |

### 5.4 LevelClear popup

| # | Finding | Fix |
|---|---|---|
| U-1 | It is a **separate scene** (`scene.start('LevelClearScene')`) that redraws the whole galaxy background (`LevelClear.ts:17`), so the board the player just finished **vanishes**. DESIGN-SPEC §4.3 wants an overlay at `z.overlay` above the board with confetti bursting over the sealed tubes — losing that moment removes the main dopamine beat. | Convert to an in-scene overlay container (or launch as a parallel scene without a background) |
| U-2 | Panel is **dark** (`drawPanel` fills `#120E2E`) while DESIGN-SPEC §3.5 specifies the light `color.surface` @0.92 with `#3A2E39` text. Either the spec or the code should change — right now the design system is silently violated. | Decide and align; if dark stays, update DESIGN-SPEC and check contrast (currently fine) |
| U-3 | Panel size is computed **once** in `create()` (`pw/ph`), and the resize handler only re-centres (`LevelClear.ts:152-156`) → after a portrait→landscape rotation a 440 px-tall panel sits on a 390 px-tall screen: title clipped at the top, NEXT button partly below the fold. | Re-render the panel on resize (or use `Scale.FIT` letterboxing) |
| U-4 | Content is vertically unbalanced: title/stars/moves/best are packed into the top 55 % and the NEXT button is pinned to the bottom, leaving ~200 px of empty panel at 440 px height. No level number is shown, no "★ new best" celebration when `moves < best`, no Home/Retry option, and no next-level preview. | Re-layout with an even rhythm; add "Level N complete", best-moves delta, a secondary "Replay" ghost button |
| U-5 | Star thresholds (`optimal+2` → 3★, `optimal+6` → 2★, else 1★) are never explained to the player and the stars are not persisted (only `best_moves`), so the rating has no meta-progression value. | Persist stars per level; show total stars on Start; use stars as soft currency for hints |

### 5.5 Feedback & animation vs DESIGN-SPEC §4-6

| Spec item | Status | Note |
|---|---|---|
| A1 pour arc ("bay theo cung") | ⚠️ | `drawPourStream()` / `drawHintArc()` are 2-segment polylines (`ui.ts:drawPourStream`), not smooth quadratic curves — the pour reads as a bent line |
| A2 tube lift + tilt on select | ✅ | Lift, tilt, glow ring, ghost preview all implemented (nice) |
| A3 invalid pour shake + keeps source selected | ✅ | Matches §6 |
| A4 seal moment (frost + snap ring + shimmer + pentatonic note) | ✅ **exceeds spec** | `ui.ts:sealTube`, `audio.ts` rising pentatonic scale — the best part of the game |
| A5 confetti on clear | ✅ | But on the wrong screen (U-1) |
| A6 button press/hover pop | ✅ | `ui.ts:840-860` |
| A7 HUD counter bump | ✅ | `bumpMoveLabel()` |
| A8 scene transitions | ✅ | Camera fades everywhere |
| §6 stuck tooltip after 1.2 s idle | ❌ | Fires immediately on the blocking move, not on idle |
| §7 non-colour cues / delta-E > 30 guard | ❌ | `colorsForLevel()` (`mechanics.ts:85-97`) takes the first N palette entries with **no perceptual-distance check**; at 8+ colours the palette pairs `#FF1493` (hot pink) with `#FF2A4D` (crimson) and later `#39FF14` with `#00E5A3`. Seal pips give a shape cue for *progress* only, not for colour identity |
| §7 HUD text stroke for legibility | ⚠️ | Shadows used, no strokes; over the bright nebula PNG some HUD text loses contrast |
| §8 UX checklist (44 px targets, one-thumb reach) | ⚠️ | Toolbar buttons are **62 px** high vs the spec's 72 px (`Gameplay.ts:652-709`); board can reach within 14 px of the toolbar (B3) |

### 5.6 Missing screens / affordances for a commercial product
No level-select or "continue" screen (`level-select` testid unfilled), no pause menu, no settings (audio/reduced-motion/language), no how-to-play beyond one line, no home button from Gameplay, no level counter progress ("Level 27 · 26 cleared"), no first-session onboarding beyond a single banner, no i18n (English only; `ytgame.system.getLanguage()` unused although SPEC §5 lists VI/EN copy).
