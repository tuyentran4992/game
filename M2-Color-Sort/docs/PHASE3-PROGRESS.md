# PHASE 3 — PERFORMANCE & SCALABLE BOARD LAYOUT (M2 "Neon Sort: Galaxy Pour")

## PLAN (high-effort, deepseek-v4-pro-0813)

Root causes (from AUDIT-COMMERCIAL §B3 + measurement):
- **Layout crowded at 6-7 tubes**: layout maximises tube *area*, ROW_PENALTY=1200 + fixed 10/14px gaps + no column caps → 2 rows at n=4, 3 rows at n=7 filling the screen edge-to-edge; capacity ignored → 14-21px liquid layers; 320px phones untested.
- **createBoard freeze ~1.5s @ L30**: generation runs `solveBoard(BFS, maxStates 15000)` verification up to 25 attempts (measured: L30 = 1660ms, plain scramble-only = ~10ms for 40 scrambles; the scramble's reverse path replays legally → board is solvable *by construction* — see probe). So BFS is purely belt-and-braces.
- **3× `scale.on('resize')` leaks** (Phaser never calls `shutdown()`); **BGM re-played per level** (volume stacks).
- No devicePixelRatio cap.

### Changes
1. `game/src/logic/layout.ts` — rewrite `computeBoardLayout` to the audit design:
   - col caps `w<380→4, <480→5, <900→6, <1500→7, else 8`; rows `h/w>1.5?3:2`.
   - breathing room `padY=max(16,areaH*0.06)`, `padX=max(12,availW*0.04)`.
   - elastic `gap=clamp(tubeW*0.18,8,22)`.
   - capacity-aware min `tubeH ≥ capacity*MIN_LAYER_PX + innerPad` (layer ≈ 26); exhaustive col search + readability score (`layerH*60 + min(tubeW,92)*8 − rows*240 − gap<10?5000 + touch&layer≥26?6000`).
   - min tube 44×120; single-row preference on phones when feasible; partial row centred at bottom.
   - `BoardLayout.layerH` added for assertions; Gameplay passes `capacity`.
2. `game/src/logic/color-sort.ts` — kill BFS from generation:
   - scramble-only + cheap `quickReplayLegal()` (reverse path replay = solvable by construction) → `solutionPath`/`optimalMoves` without BFS; bounded-BFS fallback for hard seeds; `boardCache` memo per `(level,seed)`; `prefetchBoard(cfg,level)` + `getCachedBoard`.
3. `game/src/scenes/*.ts` + `main.ts`:
   - Gameplay: use cached board → instant; else "Generating…" overlay + defer 1 frame; pass `capacity` to layout.
   - LevelClear: `prefetchBoard` next level during clear animation.
   - 3 scenes: register `events.once('shutdown')` → `scale.off('resize')`; guard handlers vs destroyed objects.
   - BGM started once globally (main.ts), per-level `sound.play` removed.
   - DPR cap ≤ 2 in main.ts render config.
4. `game/src/logic/__tests__/layout.test.ts` — add assertions across viewports incl 320px: col caps, max rows, n≤5→1row, n=6-10→2 rows w/ layer≥26 & gap≥8, minTube 44×120.

Expected layout @390×844: n≤5 → 1 row; n=6-10 → 2 rows (≤5 cols, gap≥8, layer≥26); n=11-12 → 3 rows (≤5 cols). createBoard L30 < ~30ms (scramble-only).
