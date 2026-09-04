# CONTRACT K0 — Ranh giới logic/ ↔ scenes/+ui/ — Buzz Blitz (M1)

**Card:** t_27ffcf41 ([UPG2-PRE]) · **Neo plan:** UPGRADE-PLAN-M2.md §1–§2 (BOSS-VERDICT B0.1 GO) · **SHA main lúc lập:** `cf3d5583e58180a5b4802d46a2c4a00965861074`
**Luật gốc:** COMPANY-RULES §5 (v1.8) + PROJECT-RULES PB-7 + ROLE-RULES (dev-lead/fe-dev) + án lệ 04/09 (#69 lệnh boss).

---

## 1. Hai tầng cứng (án lệ boss #69)

| Tầng | Thư mục | Nội dung | Dependency cấm | Nhãn TDD |
|---|---|---|---|---|
| **A — LOGIC** | `game/src/logic/` + `game/src/config/` + `game/src/tokens.ts` | GameEngine pure-TS: mọi luật chơi (score, combo, fever, shield, magnet, swarm, difficulty curve, quests, skins, save state) | **CẤM import Phaser.** CẤM DOM. rng injectable `opts.rng` — cấm `Math.random()` thô trong logic mới | **TDD-A** (red-first, test+code commit cùng nhau) |
| **B — RENDER** | `game/src/scenes/` + `game/src/ui/` + `game/src/main.ts` | Scene Phaser mỏng: orchestrate engine, vẽ, tween, particle, input, HUD text | CẤM viết logic/gameplay mới (điểm, điều kiện thắng thua, curve) — gọi engine | **TDD-B** (mọi dữ liệu hiển thị đi qua interface typed tầng A; boundary = QA E2E) |

- **Engine hiện tại:** `src/logic/GameEngine.ts` (481d) + `types.ts` (129d) + `mechanics.ts` — test được không cần render (`__tests__/`).
- **God-file:** `src/scenes/Gameplay.ts` (2038d) — CHỈ có 1 card chạm tại 1 thời điểm (hotspot, §5.4/KT#60). Logic còn lẫn trong Gameplay.ts **phải về engine** — nhiệm vụ nghiêm thu T1.
- Subcard tầng B mới cấm kéo thêm logic vào scene; kéo dần về tầng A chỉ theo plan T1 đã duyệt.

## 2. Public interface tầng A (trạng thái cf3d558 — thợ gọi, KHÔNG tự đổi)

`GameEngine(cfg: MechanicsConfig, opts: GameEngineOptions)` — options: `rng, bestScore, totalFish, totalGamesPlayed, unlockedSkins, selectedSkin, quests`.

Nhóm phiên: `startNewGame() resumeGame() endGame(): EndGameResult canContinue() useContinue()`
Nhóm gameplay: `registerDodge(): DodgeResult registerHit(): void collectFish(): FishResult registerNearMiss(): NearMissResult destroyBeeInFever(): {scoreDelta} registerSwarmSurvive(): SwarmSurviveResult`
Nhóm power-up/fever: `activateShield() tryUseShield(): boolean activateMagnet(dur?) isMagnetActive(): boolean addFever(n): boolean isFeverActive(): boolean`
Nhóm thời gian/difficulty: `updateTimers(dt): {feverEnded} tickSecond(): TickResult difficulty(elapsedSec?, level?): DifficultyResult rollBeeType(elapsedSec?, level?): BeeType`
Nhóm progression: `getLevel(score?): number getPaletteIndex(level?): number paletteIndex: number getNextFatBeeTargetLevel(k?) shouldTriggerFatBeeBreather(level?) consumeFatBeeBreather() checkRecord(): boolean`
Nhóm meta: `getAvailableSkins(): CatSkin[] getSelectedSkin(): CatSkin getSelectedSkinTexture(): string isSkinUnlocked(id) unlockSkin(id): boolean selectSkin(id): boolean getQuests(): Quest[] incrementQuest(id, n) updateQuestMax(id, v) claimQuest(id): number getUnclaimedQuests(): Quest[] shouldShowInterstitial(): boolean`
State công khai đọc được: `score streak elapsed fish shieldActive magnetTimeRemaining fever feverActive feverTimeRemaining bestScore totalFish totalGamesPlayed unlockedSkins selectedSkin quests recordShownThisSession`.

**Typed Result bắt buộc** (đã có trong `logic/types.ts` — tầng B chỉ đọc): `DodgeResult FishResult NearMissResult SwarmSurviveResult TickResult DifficultyResult EndGameResult`.

## 3. Luật đổi signature — BREAKING CHANGE qua dev-lead

1. Thêm **field mới** vào Result hiện có = OK tự chủ (non-breaking), ghi trong [REVIEW] của card.
2. **Đổi tên/kiểu/thứ tự param, xoá method/field public, đổi nghĩa return** = breaking change: DỪNG, comment đề xuất trên card cha t_27ffcf41, lead chốt rồi mới code.
3. Thêm **method public mới** vào GameEngine: được khi logic thật sự thuộc engine (không phải vẽ/tween); đặt tên verb tiếng Anh, thêm test tầng A kèm commit.
4. `types.ts` trong `logic/` là hợp đồng type DUY NHẤT — cấm khai báo trùng type ở scenes/ui (V-H1 cứng: KHÔNG đụng `EndGameResult`/`types.ts`).
5. Anti-clone trigger: obstacle/type mới ngoài `{normal,speedy,zigzag,fat}×{fish,shield,magnet}` → **DỪNG + CATALOG CHECK** (PB-5) trước khi code.
6. Text in-game 100% tiếng Anh (PB-5); comment code tiếng Việt tối giản, không emoji.
7. Mọi số tuning về `MechanicsConfig` (không magic number); chưa playtest → đánh dấu `[PLACEHOLDER]` + test khóa công thức.

## 4. Hợp đồng testid (N3 — hợp đồng QA)

testid gắn bằng `setData('testid', ...)` trong scene; grep chuẩn: `grep -rn "setData('testid'" src/`. Bảng hiện hữu **bắt buộc giữ nguyên qua T1** (diff-rỗng trước/sau — N3):

`game-canvas`(main.ts) · `score-label` · `level-label` · `level-progress` · `level-popup` · `level-popup-sub` · `combo-popup` · `record-popup` · `cat`

Thêm testid mới được phép (chỉ tầng B, ghi trong [REVIEW]); xoa/đổi tên testid cũ = phạm N3.

## 5. Gate kỹ thuật mọi subcard (PB-3)

`bash scripts/verify_game.sh M1-Rescue-Dodge` 4/4 (tsc → vitest → build → asset manifest) + vitest xanh số cụ thể (baseline ≥48 test, hiện 55). 48 test cũ **cấm sửa assert** — "xanh nhờ nới assert" = FAIL diff-test. Chỉnh curve = chạy lại sim (gói B1).

## 6. Lập trình các subcard T1 (tách Gameplay.ts) — ranh giới file

| File mới | Tầng | Trách nhiệm | Test |
|---|---|---|---|
| `logic/SpawnDirector.ts` | A | quyết spawn: loại ong, nhịp, mật độ, debut beat — dữ liệu thuần vào/ra | TDD-A red-first |
| `logic/CollisionSystem.ts` | A | giao địa lý lane/hitbox/near-miss/swarm-hit → trả Result typed | TDD-A red-first |
| `scenes/render/HudRenderer.ts` | B | vẽ + cập nhật HUD từ state engine (không tính toán luật) | TDD-B qua interface A |
| `scenes/render/RoadsideRenderer.ts` | B | props ven đường, nature particles | TDD-B qua interface A |
| `scenes/render/FxRenderer.ts` | B | hạt/fx dùng FxPool (reuse PERF3) | TDD-B qua interface A |

Mục tiêu mỗi file <400d; Gameplay.ts giảm 2038d về orchestration; hành vi 100% giữ nguyên (regression 0/30/60s + N3 diff-rỗng). T1 **cấm khởi động** trước khi `t_e49b5119` (PERF3-MERGE) xanh trên main.

---
*Duyệt nội bộ: dev-lead (card t_27ffcf41). Thợ đọc CONTRACT này trước khi nhận subcard.*
