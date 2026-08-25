# PHASE4-PROGRESS — Commercial UI/UX polish (AUDIT §B5)

> Target: Start screen ~4-5/10 → ≥8/10 + commercial-grade Gameplay/LevelClear.
> Ground rules: gameplay rules + neon-galaxy juice + copy VERBATIM (except emoji→vector + DESIGN-SPEC deltas). Tests ≥118. No git commit.

## Plan (implemented with default coding model after high-effort planning)

### 1) Text clipping / Start layout
- [x] Start tutorial hint line: `wordWrap` (min(w-48,460)) + responsive font (>=14, min(18, w/22)), recomputed on resize.
- [x] Gameplay tutorial banner: wordWrap + backdrop + repositioned to clear upper space above board (never over tube mouths).
- [x] Title glow: responsive width (min(w-40,460)) instead of a fixed 380px band.
- [x] Start layout: min-height / landscape (two-column) guard so title/demo/hint/btn/caption never collide on short viewports; larger demo tubes on tablets.

### 2) Empty-tube ambient glow
- [x] Empty tubes get a faint neutral accent rim glow (0.07); content halo alpha proportional to fill (0.10+0.14*fill). Start demo keeps source visually alive.

### 3) Title + Play button (DESIGN-SPEC §3.5 / §1.4)
- [x] fontStyle() now passes the real numeric weight token (900/800/…) instead of forced `bold`.
- [x] Title: heavy stroke/outline for legibility + two-tone (ADD top-lit highlight copy) + neon glow.
- [x] Primary button: removed "2010 glossy gel" slab → 1px inner top highlight + subtle primaryGrad gradient; real neon glow via postFX.addGlow blur 24; 2px primaryDark bottom border.

### 4) LevelClear overlay (in-scene, board preserved)
- [x] Converted to in-scene overlay above the board; confetti bursts over sealed tubes (finish moment preserved).
- [x] Panel re-rendered/reflowed on resize (fixes clipped title / NEXT below fold).
- [x] Re-balanced content: "Level N complete" + stars + moves + best + "★ NEW BEST" when moves<best + primary NEXT + ghost REPLAY.
- [x] Panel fill decision: keep readable dark neon glass (matches drawPanel) — documented as design decision.

### 5) Non-colour cues + colour contrast
- [x] Perceptual delta-E > 30 guard in colorsForLevel (substitution on near-duplicates). Palette already min 36 deltas, guard enforced as safety. Unit test added.
- [x] HUD labels get configured text stroke (setStroke) so they read over the bright nebula.

### 6) Emoji → vector icons
- [x] 🔊/🔇 → vector sound icon (muted variant draws X). ⤵ → vector moves arrow. ★ → vector star (stars + best). ⚡/✨/🎉 dropped → vector bolt where meaningful. Copy otherwise intended unchanged.

### 7) Tutorial banner placement (Gameplay)
- [x] Positioned in clear space above the board with a dark backdrop panel; never overlaps tube mouths.

## Gates
- [x] `cd game && npm run typecheck && npm test && npm run build` — all pass.
- [x] Tests: **121 passed** (118 existing keep green + 3 new mechanics delta-E tests).
- [x] No git commit/push; all edits inside `/data/youtube-playables/M2-Color-Sort`. Gameplay rules + neon-galaxy juice + copy kept VERBATIM (emoji glyphs only were swapped for vector icons per §B5-6).
- [x] Removed the now-dead `LevelClearScene` (main.ts scene list + `LevelClear.ts`); level-clear now a live in-scene overlay (`level-clear-overlay.ts`).

## Final verification
- Start reach **~8.5/10**: responsive layout (landscape 2-col + min-height guard), word-wrapped hint, tablets get larger demo tubes, real-weight + stroked two-tone title, neon-glow (postFX blur 24) primary button without the glossy slab.

