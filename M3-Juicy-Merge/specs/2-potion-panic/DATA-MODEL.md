# M3v2 "Potion Panic" — DATA MODEL

> Không database — mô tả schema dữ liệu logic: config yaml, graph nguyên tố, heat runtime, obstacles, save + migration. Tool-agnostic (agent đọc để code).

---

## 0. Luồng dữ liệu tổng quan

```
games/potion-panic.yaml ──> elements.ts (graph) ──> merge-engine (cùng nhánh)
                      └──> stages-v2 table ──> StageSelect / Gameplay goal check
seed ──> rng.ts ──> queue 3 element ──> heat.ts (runtime tick) ──> brew events
save.ts v3 ⇄ @game/sdk saveData/sendScore
```

## 1. CONFIG SCHEMA — `games/potion-panic.yaml`

```
game: name=Potion Panic · slug=potion-panic · theme=apothecary-neon
      publisher · langs=[en] · orientation=all
elements: fire|water|earth: tiers[{name, radius, score}]  (4 mỗi nhánh)
fusion: stone_score=150 · once_per_stage=true
physics:  giữ bucket v1 + shape=cauldron (bottomArcRadius, wallCurve)
heat: {t3_rate: 3, t4_rate: 6, zone3_mult: 1.5, brew: 100, volatile_min: 70,
       brew_radius: 140, brew_score: 20, chain_heat: 25}
stir: {charges: 3, regen_s: 30, self: -60, near: -30, near_r: 120}
orders: {score: 30}
drops: {cooldown_ms: 250, queue_size: 3}
combo/progression: kế thừa cấu trúc v1 (giữ score.ts)
audio: sfx{drop,merge,volatile,brew,stir,order,stone,click,gameover}, bgm_main
```

## 2. ELEMENT GRAPH (thay FRUITS chain)

- `ElementType = 'fire'|'water'|'earth'`; `OrbKind = {el, tier 1..4}`.
- Merge rule: `canMerge(a,b) = a.el==b.el && a.tier==b.tier && a.tier<4`.
- `ORB_RADIUS`: map tier→radius v1 index (0,1,2,3 nội bộ mỗi nhánh) → physics không đổi số.
- `STONE`: orb ảo id `stone`, không spawn, chỉ từ fusion; `servesAnyOrder=true`.
- File: `src/logic/elements.ts` mới; `config.ts` cũ giữ cho tới khi xóa reference.

## 3. HEAT RUNTIME (mới — `src/logic/heat.ts`, pure)

```
HeatState = Map<orbId, {t: number}>   // 0..100, chỉ orb T3/T4
tick(dt, orbs): tăng theo rate(el-tier, zoneMult);
resolveBrew(orbs, heat): settle && heat>=100 → BrewEvent{orbId,x,y,radius:140}
  + lan heat (+25 orb T3/T4 trong radius, 1 wave/frame — PP-11)
onMerge(a,b): if heat(a)>=70 && heat(b)>=70 → VolatileMerge (score x1.5, heat reset)
stir(orbId, orbs): −60 / −30(120px), charge--
```
- Không lưu heat vào save (runtime-only).

## 4. STAGES V2 (viết lại `stages.ts`, giữ schema)

```
StageGoalType += 'serve_order'
ServeGoal = {type:'serve_order', orders: OrbKind[], maxDrops}
target_fruit → target_orb (element+tier bắt buộc)
```
- 30 màn, 3 zone như v1 (giữ starScores/reward cấu trúc cũ); zone 2+ thêm serve_order;
  zone 3 heat ×1.5 + Stone goal màn 25/30. Bảng 30 màn chi tiết: phụ lục A cuối file — dev dựng từ đây.
- `maxDrops` giữ dải 12–30.

## 5. OBSTACLE / POWERUP SCHEMA

Giữ y nguyên interfaces `obstacles.ts`, `action-powerups.ts` — chỉ đổi ID string hiển thị:
`ice→frozen_slab, crate→herb_crate, bubble→cursed_orb, hammer→crack, bomb→blast_powder, rainbow→prism_drop`
(alias map ở `ui/labels.ts`, logic không đụng → 0 test cũ vỡ vì rename).

## 6. SAVE SCHEMA v3 + MIGRATION

```
v2 (hiện tại): {version:2, bestScore, unlockedStage, stageStars[30], stageBest{},
                powerups{hammer,bomb,rainbow}, album[], daily{}}
v3: {version:3, endlessBest, saga:{unlockedStage, stageStars[30], stageBest{}},
     powerups{crack,blast_powder,prism_drop}, stoneCount, ordersFilledTotal,
     album[elementOrbs 12], daily{}, sound:{muted,lang}}
```
- Migration `v2→v3`: map bestScore→endlessBest, powerup keys theo alias, album fruit→orbs theo index tier.
- Record `schema_version` mới nhất; profile cũ không crash (PP-07/PP-19).
- Kích thước save <500KB target (pp-16).

## 7. RNG

Giữ `rng.ts`. Đổi: hàm sinh tier→hàm sinh **element gốc** cho queue: `nextQueue(): [OrbKind,OrbKind,OrbKind]` (tier=1 gốc, element weighted đều 1:1:1 — người chơi tự chọn nên không cần band-weight như v1; deterministic theo seed → test được).

## 8. DESIGN DECISIONS

| # | Quyết định | Lý do / trade-off |
|---|---|---|
| D1 | 3 nhánh ×4 bậc thay 1×12 | khác Suika cấu trúc; giữ 12 sprite slot; radius tái dùng |
| D2 | Heat runtime-only, không save | tránh schema phình + exploit farm heat offline |
| D3 | Stir không tính drop | quality-of-life; chống lạm = giới hạn charge |
| D4 | Queue pick thay random tier-band | xóa nỗi bực RNG v1, tăng skill (Playgama UX req "interaction mechanic") |
| D5 | Alias rename obstacles qua labels, giữ logic | migration rẻ, 109 test v1 không vỡ |
| D6 | Art đường A (programmatic) nếu tiến độ gấp | bundle nhẹ, 0 asset risk; B nếu anh duyệt WAN |
| D7 | Giữ Endless mode sau rebrand | leaderboard + rewarded continue đã code; campaign là mặt nạ khác biệt |

## 9. VALIDATION (pipeline)

`games/potion-panic.yaml` phải pass `python -m pipeline validate --game-dir games/potion-panic`
(scope fix pitfall 13: logic scan `game/src`, bundle đo `game/dist`). Thêm check mới: grep build
KHÔNG còn chuỗi "cherry|watermelon|suika|juicy" (gate chống clone lộ asset cũ) — dev thêm vào validate sau.

---

## PHỤ LỤC A — BẢNG 30 MÀN V2 (tóm tắt; dev mở chi tiết theo schema §4)

| Zone | Màn | motif | goals chính | heat |
|---|---|---|---|---|
| 1 Tầng hầm | 1-5 | Fire intro | target_orb fire T2→T3; score | chuẩn |
| 1 | 6-10 | +Slab/Crate | clear_obstacles, target mixed fire/water | chuẩn |
| 2 Rừng độc | 11-15 | Orders | serve_order (Ember+Bubble), earth unlock | chuẩn |
| 2 | 16-20 | Cursed orbs | order + clear | chuẩn |
| 3 Lò cổ | 21-25 | Volatile | target T3 earth + order chain; stone @25 | ×1.5 |
| 3 | 26-30 | Chaos | multi-order + crate maze; 30 = Stone finale | ×1.5 |

Mỗi màn: `maxDrops` 14–30, `starScores` scale theo v1 cùng id, `rewardPowerup` luân phiên crack/blast_powder/prism_drop như v1.
