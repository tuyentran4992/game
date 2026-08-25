# PHASE 5 — Commercial Readiness: Playgama Multi-Backend + Production Packaging

> Phase 5 target: (A) add Playgama multi-backend support (YouTube Playables + Playgama-routed portals + local dev) and (B) tighten production packaging (fresh build/neon-sort.zip, i18n from active backend, metadata verification, bundle-size review). Based on `docs/AUDIT-COMMERCIAL.md` (§B6 production + notes) and the proven M1/M3 Playgama integration (`../docs/playgama-integration.md`, `../M1-Rescue-Dodge/game/src/sdk-bridge-backend.ts`).

## Plan (high-effort model)

**A) Playgama multi-backend (main new work)**
1. Add a small backend layer that DETECTS the active SDK and dispatches save/load, interstitial+rewarded ads, firstFrameReady/gameReady, sendScore, pause/resume/mute/audio to the right backend, mirroring M1/M3.
2. Keep YouTube Playables fully working (ytgame stays a backend; **wins when present** so the Playables submission does not regress). Add Playgama as an alternate backend when no ytgame (Playgama-routed portals: CrazyGames/Poki/GD/Y8/…). Graceful offline/local → localStorage fallback, no crash anywhere.
3. Add unit tests for backend detection + save dispatch + i18n.

**B) Production packaging**
4. Regenerate `build/neon-sort.zip` (current JS + all art + audio + metadata), no `.gen_cache` leakage.
5. i18n: read language from the active backend (`ytgame.system.getLanguage()` / `bridge.platform.language`), select existing VI/EN copy set, English fallback, no invented copy.
6. Metadata verify (title ≤50, desc ≤150, thumbnails/preview present). Report bundle-size (>512 KB JS) as explicit follow-up rather than break the build.
7. Final: confirm YouTube Playables (ytgame path) still boots (unit-tested), run typecheck + test + build.

## Itemized work (all [x] done)

### A) Playgama multi-backend
- [x] **`game/src/sdk-bridge-backend.ts` (NEW)** — `PlaygamaBackend` wrapping `window.bridge`/`window.playgamaBridge`. Buffered-until-ready (bridge throws before `initialize()`), event-driven rewarded (`rewarded_state_changed`) & interstitial (`interstitial_state_changed`), single readiness message `game_ready`, `bridge.storage` save/load, `getLanguage()` from `bridge.platform.language` (ISO 639-1), audio/pause subscribe (`AUDIO_STATE_CHANGED`/`PAUSE_STATE_CHANGED`). Mirrors M1/M3.
- [x] **`game/src/sdk-handler.ts` (REWRITTEN core)** — multi-backend dispatch. Detection order **ytgame → playgama → local**, exposed as `readonly backend`. All public methods now dispatch to the active backend: `firstFrameReady`, `gameReady`, `onPause`, `onResume`, `isAudioEnabled`, `onAudioEnabledChange`, `getLanguage`, `saveData`, `loadData`, `sendScore`, `isRewardedAvailable`, `isInterstitialAvailable`, `requestInterstitialAd`, `requestRewardedAd`. The ytgame branch preserves the existing robust surface (namespaced+flat defensive probing, localStorage mirror, **last-write-wins** by `last_updated_ts`, rewarded never free when an SDK is present, `{value}` sendScore shape). Added `ready()` + `useBridge`/`backend` diagnostics.
  - **Backend priority rationale:** M2 loads the ytgame SDK itself from `youtube.com/game_api/v1` and its direct-YouTube submission must not regress ⇒ when `window.ytgame` is present the **ytgame backend wins**. Playgama-routed portals do NOT load `game_api` ⇒ bridge wins there. This mirrors the M1/M3 *pattern* (backend layer + dispatch) with a tie-break justified by M2's existing direct-YouTube path.
- [x] **`game/index.html`** — added the permitted Playgama Bridge script (`https://bridge.playgama.com/v2/stable/playgama-bridge.js`) alongside the existing ytgame `game_api/v1`. Only permitted external SDK scripts (M2-09 kept: no other network / 3rd-party ads / self-monetization). SdkHandler never touches bridge unless it is the chosen backend (guarded/runtime).
- [x] **Graceful offline/local** — no SDK ⇒ `backend === 'local'`, all save/load through localStorage, rewarded unlocked for dev QA (`!inPlayables`), interstitial no-op, no crash (unit-tested).

### B) Production packaging
- [x] **i18n (`game/src/i18n.ts` + `game/src/lang.ts`)** — pure `pickLang/t/tr/fmt` + `L()/LF()` helper reading the active backend language. EN copy = verbatim existing strings; VI copy = faithful translations of exactly those strings (SPEC §5 terms: Chơi/Play, Hoàn thành!/Clear!, Level tiếp/Next, Quay lại/Undo, Chơi lại/Restart, Gợi ý/Hint). No invented copy; missing key ⇒ EN ⇒ key fallback. Both copy sets share the **same key set** (unit-tested). Wired into: Start (PLAY button, "Start Level {n}", hint line), main/BootScene ("Loading galaxy…", `#boot-sub`), Gameplay (Generating…, tutorial, stuck tip, toasts, ad-confirm sheets, ad-loading, +1 tube tip), LevelClearOverlay (LEVEL {n} COMPLETE, Moves/NEW BEST/Best·Optimal/Optimal, NEXT LEVEL, REPLAY), ad-ux defaults (REWARDED AD badge, short-ad note, WATCH / NO THANKS). English always works as fallback; no placeholders leak at runtime.
- [x] **`build/neon-sort.zip` regenerated** — from fresh `game/dist` (13 items: `index.html` with both SDK scripts + current `assets/index-DRId4Ii_.js` + all 4 art PNGs + 5 mp3). No `.gen_cache`/`.src.png` leakage. `unzip -l` verified. (See zip listing below.)
- [x] **Metadata verified** — `build/metadata/metadata.json`: title `Neon Sort: Galaxy Pour` = **22** (≤50 ✔), short_desc = **116** (≤150 ✔), thumbnails `1:1`/`5:7`/`16:9` present, preview `16:9` present.
- [x] **Bundle-size review** — see Follow-ups (JS 1,566 KB and `bg_space.png` 572 KB exceed the 512 KB per-file target; reported, not broken).
- [x] **YouTube Playables (ytgame path) not regressed** — unit-verified: with `window.ytgame` present (even alongside bridge) ⇒ `backend === 'ytgame'`; `getLanguage()` reads `ytgame.system.getLanguage()`; save/load/ads/sendScore/pause all still dispatch through ytgame. (16 existing ytgame tests pass unchanged.)

## Tests

- `cd game && npm run typecheck` → **tsc --noEmit: clean (exit 0)**.
- `npm test` (vitest run) →
  - **140 passed / 0 failed** (was ≥121; added **11 backend-detect** + **8 i18n** = 19 new).
- `npm run build` → vite build OK; dist is `index.html` + `assets/index-DRId4Ii_.js` (1,566,447 B) + `raw/*` (4 PNG + 5 mp3), no `.gen_cache`.

## Production zip listing (`build/neon-sort.zip`, 1,238,218 B)

```
3474    index.html
586036  raw/bg_space.png
35231   raw/bgm_main.mp3
54765   raw/liquid_neon.png
2465    raw/sfx_clear.mp3
1584    raw/sfx_click.mp3
2753    raw/sfx_error.mp3
3221    raw/sfx_pour.mp3
88020   raw/tube_base.png
114001  raw/ui_chrome.png
1566447 assets/index-DRId4Ii_.js
```

## Test-evidence: backend detection + save dispatch

- Only `window.ytgame` (even with bridge also present) ⇒ `backend === 'ytgame'`, `getLanguage()==='vi'`, save → `ytgame.game.saveData` + localStorage mirror.
- No ytgame but bridge present ⇒ `backend === 'playgama'`, `getLanguage()==='vi'` (from `bridge.platform.language`), save → `bridge.storage.set(['neon_sort_save'], …)` + localStorage mirror, load → `bridge.storage.get` with local fallback, `gameReady` → `bridge.platform.sendMessage('game_ready')`, rewarded grants only on `rewarded` state.
- No SDK ⇒ `backend === 'local'`, save/load through localStorage, no crash, rewarded unlocked for QA, `getLanguage()==='en'`.

## i18n evidence

- `pickLang('vi'/'vi-VN'/'VI')===vi`, `pickLang('en'/'en-US')===en`, unknown/empty ⇒ `en`.
- `t('play','vi')==='CHƠI'`, `t('next_level','en')==='NEXT LEVEL'`.
- VI/EN copy sets share the identical key set; SPEC §5 terms present.
- Placeholder formatting: `tr('start_level','vi',3)==='Bắt đầu cấp 3'`.

## Follow-ups (explicit, not blocked in this phase)

1. **Bundle size (M2-10 per-file < 512 KB target) — NOT DONE (reported, build kept intact).**
   - Current: single JS **1,566 KB** (gzip 367 KB) + `bg_space.png` **572 KB**; both exceed 512 KB/file.
   - The whole-`phaser` import bundles physics/tilemaps/particles that M2 never uses. Recommended next step: a *granular Phaser build* (import only the submodules used — core, scene, text, graphics, input, tweens, time, loader, display, gameobjects reached by M2) via `phaser/src/…` subpath imports, or a trimmed `phaser.min.js`; then `bg_space.png` re-encoded (quantized/WebP-friendly remux or lower DPR source) to drop under 512 KB each.
2. **Thumbnails / preview video** (`build/metadata/`) are present and compliant in length but were generated 2026-08-22/23, *before* the Phase-4 art upgrade. Regenerating the 3 PNGs + 16:9 preview `<video>` requires a live canvas capture (Playwright/puppeteer recording the upgraded Start screen) — outside this file-scoped phase; do it before the final portal submission.
3. **Playgama real-platform QA** — local mock + unit tests are green, but a true end-to-end run on a Playgama portal (or YouTube via Playgama routing) needs a live sandbox on `developer.playgama.com` (identity not yet provisioned in this repo). Same status as M1/M3.
4. Secondary (lower priority): `neon-sort.yaml` ↔ `mechanics.ts` config-as-truth drift, and the permanent `+1 tube` toolbar slot + rewarded confirmation remain as previously documented (unchanged this phase).
