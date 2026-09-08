# M9 Deep Cast — DATA-MODEL (nguồn SỐ duy nhất; code import từ đây, không rải magic number)
> File chuẩn: `game/src/data/fishData.ts`, `game/src/data/world.ts`, `game/src/data/upgrades.ts` — giá trị DƯỚI ĐÂY là spec, code phải khớp 100%.

## 1. WORLD CONSTANTS (`world.ts`)
```
WORLD_W=480  WORLD_H=854(viewport)  SEA_TOP=96  SEA_BOTTOM=1200(px≈mét; depthM = px-96)
SURFACE_Y=SEA_TOP+8            // hoàn thành thu khi hook.y<=SURFACE_Y+2
DESCEND_BASE=140  DESCEND_RAMP=+10px/100px  DESCEND_MAX=260
REEL_BASE=90      reelSpeed = REEL_BASE/(1+weight/60)   // mang cá nặng kéo chậm
LINE_LIMIT=100 (đơn vị tension)  TENSION_COOL=0.35/s
AIR_MAX=45s  AIR_RATE={dive:1.0, reel:1.0, hold:0.5, hooked:1.0+0.05*weight/10}
START_MONEY=600  FUEL_COST=150/lần thả (trừ lúc bắt đầu dive)  HEARTS=3
DIVE_COOLDOWN=300ms  TAP_BUFFER=250ms  ATTACH_LOCK=300ms (cá weight>=40)
```

## 2. BẢNG CÁ (10 loài + Voi) — `fishData.ts`
| id | tên | bandDepth(m) | value | weight | fightPk | pulsePeriod(s) |
|---|---|---|---|---|---|---|
| f1 | Sardine | 0–150 | 8 | 2 | 12 | 1.8 |
| f2 | Mackerel-small | 40–200 | 12 | 6 | 18 | 1.7 |
| f3 | Clownfish | 120–260 | 20 | 8 | 22 | 1.9 |
| f4 | Snapper | 200–400 | 32 | 16 | 30 | 2.0 |
| f5 | Squid | 300–520 | 55 | 22 | 40 | 1.5 (2 xung chồng) |
| f6 | Tuna | 380–620 | 85 | 48 | 48 | 2.2 |
| f7 | Swordfish | 500–760 | 110 | 60 | 55 | 2.4 |
| f8 | Anglerfish | 650–900 | 140 | 38 | 62 | 1.6 (2 xung chồng) |
| f9 | Ghost Ray | 800–1050 | 170 | 70 | 70 | 2.6 |
| f10 | Giant Squid | 950–1150 | 210 | 95 | 80 | 2.0 (2 xung chồng) |
| whale | BLUE WHALE (win) | spawn 1200, tuần tra 1140–1200, rời đi khi hooked | 400 | 400 | 88 | 2.8 (3 xung chồng) |
Spawn: mỗi band `count = clamp(3 - floor(depth/400), 1, 3)` con đang sống, respawn khi bị bắt/nhả, deterministic từ seed.

## 3. Tension & struggle (HÀM PURE, test được)
```
tension(t) = clamp(Σ_activeFish fightPk × pulse(t) + dragTerm, 0, 120)
pulse(t)   = 0.35 + 0.65 × max(0, sin(2πt/period))^3  cho mỗi cá hooked
             cá 2-xung: period và period×0.53 ; Voi 3-xung: thêm period×0.29
dragTerm   = hook có DoubleHook: +6 mỗi con thứ 2 | dòng chảy (850m+): +14 khi descend
BREAK: tension>=100 → đứt: mất hooked, heart-1, reset tension=0
Nín (HOLD): tension hạ nhanh ×(1+TENSION_COOL×2) nhưng air vẫn tiêu 0.5×
```
Voi: hooked vào → state WHALE_TOSS: thuyền drift ±36px/2.4s, hook khoá (không tuột vì tension — chỉ tuột vì hết 3 chu kỳ 20s mà chưa lên mặt nước: nó tự脱离 về đáy, resume spawn 8s sau).

## 4. PICKUPS (mốc biến đổi — §5 SPEC)
| id | band(m) | effect | money |
|---|---|---|---|
| up-double | 250–350 | hook thành 2 slot | 0 |
| up-sonar | 550–650 | +2 charges (touch btn để quét: hiện band + xung kế tiếp cao/thấp, 4s) | 0 |
| chest150 | đáy 1190 cạnh kho báu | cộng thẳng | +150 |
| money-float | hook cá | bay về HUD | +value (combo: chuỗi thu liền không đứt/tuột ×1/1.15/1.3/1.5 cap) |

## 5. WIN/LOSE (state machine nguồn — `game/src/core/rules.ts` export pure fn `applyDiveTick(state,dt,seed)` + `resolveSurface(state)`)
```
win(): hooked.contains(whale) && hook.y<=SURFACE_Y   → WIN overlay, rank
rank: S = hearts==3 && breaks==0 ; A = hearts>=2 ; B còn lại
lose(): resolveSurface && money<FUEL_COST && !canSalvage && !whaleHooked → LOSE 'OUT OF FUEL'
lose(): hearts==0 → LOSE 'LINES BROKEN'  (check sau resolveSurface)
rewarded-continue: đúng 1 lần/session, chỉ khi lose: hearts=max(1), money=max(money,150), flag used
best = max(score phiên trước, điểm phiên này) — localStorage 'deepcast.best'
```

## 6. RNG (Mulberry32 trong `core/rng.ts`)
`rngSeed` lưu trong GameState; mọi thứ gọi rng theo THỨ TỰ cố định: (1) shuffle vị trí spawn fish → (2) offset pha pulse từng con → (3) tuần tra shark (dải Mẹo 950–1150, 1 con, tốc 60px/s) → (4) timer spawn Voi (8s). Không dùng Math.random() trong core (chỉ được dùng ở FX visuals).

## 7. SAVE/BRIDGE
localStorage: `deepcast.best`. Bridge Playgama: `ready()`, `gameplayStart()/Stop()` mỗi dive, `sendScore(win? score:0)` khi win/lose, `showRewarded()` cho continue. Config file như repo M4 (`playgama-bridge-config.json`). Không interstitial (không có điểm dừng tự nhiên nào ngoài win/lose).
