# M3: DATA-MODEL — "Juicy Merge: Fruit Pop" (Physics-Merge · YouTube Playables)

> **Pipeline KHÔNG có database.** File này mô tả **cấu trúc DỮ LIỆU LOGIC** của module M3 (physics-merge): config schema `games/juicy-merge.yaml`, fruit-chain, bucket/physics state, merge logic, score, RNG chuỗi, saved-game/score, build validation report — thứ mà pipeline Python (reuse M1/M2) và game Phaser trao đổi. Không phải schema DB, không migration.
> **Nguồn sự thật:** `SPEC.md` M3 + config `games/juicy-merge.yaml`. Mọi asset/metadata phái sinh từ file config này.
> **Scope:** chỉ block dữ liệu cho M3. Ngôn ngữ tiếng Việt. Schema mô tả bảng/ASCII, **không code chạy được**.

---

## 0. Sơ đồ dữ liệu tổng quan (luồng tạo/nạp/gameplay)

```
 games/juicy-merge.yaml ───────► nguồn sự thật (config 1 game: assets + mechanics + chain)
      │  [đọc bởi CLI pipeline / scaffold / assets / validate / package]
      ▼
 assets/raw/ ──────────────► asset manifest (asset key → file + size) → [validate, package]
      │
      ▼
 game/ (Phaser 3) ─────────► DỮ LIỆU LOGIC RUNTIME:
      │                        • CONFIG  → fruit chain (§2) + bucket (§3)
      │                        • GAME STATE §4 (trái đang rơi/xếp + merge + score)
      │                        • RNG CHUỖI §5 (deterministic, seed load)
      │                        • SAVED-GAME §6 (best_score) trên SDK + sendScore
      ▼
 build/juicy-merge.zip + build/metadata/ ──► metadata portal (title/desc/thumb/preview/genre)
      │
      ▼
              Build Validation Report (JSON) — cổng pass/fail (không nén, cấm mạng, 13+...)
```

**Loại dữ liệu logic (không có DB):**

| # | Data block | Nơi sinh | Nơi tiêu thụ | Loại |
|---|-----------|----------|--------------|------|
| D1 | Config schema game (`juicy-merge.yaml`) | người vận hành | CLI assets/scaffold/validate/package + game runtime | YAML file |
| D2 | Asset manifest | CLI `assets` | CLI validate/package | map key→file |
| D3 | Metadata portal | CLI `package` | form nộp Playables | file + fields |
| D4 | Game state + merge logic (fruit/bucket/score) | gameplay runtime | game runtime | JSON trong bộ nhớ |
| D5 | RNG fruit chain | runtime (seed) | game runtime | seeded PRNG + queue |
| D6 | Saved-game / Score | game runtime | Playables SDK (saveData/loadData/sendScore) | JSON payload |
| D7 | Build validation report | CLI `validate` | con người + Hermes QA | JSON |

---

## 1. CONFIG SCHEMA GAME — `games/juicy-merge.yaml`

### 1.1 Bảng fields (top-level)

| Nhóm | Field | Kiểu | Bắt buộc | Ràng buộc / Mô tả |
|------|-------|------|----------|-------------------|
| định danh | `name` | string | ✅ | key máy-lập-trình, ASCII lowercase. VD: `juicy-merge` (tên thư mục/zip) |
| | `version` | semver `major.minor.patch` | ✅ | version build, dán vào metadata |
| metadata | `metadata.title` | string | ✅ | **≤ 50 ký tự** (portal). M3: **"Juicy Merge: Fruit Pop"** |
| | `metadata.short_desc` | string | ✅ | **≤ 150 ký tự**, mô tả cơ chế, không thổi phồng, không branding |
| | `metadata.genre` | list[string] | ✅ | **1–2 genre** từ portal. M3: `["Puzzle", "Casual"]` hoặc `["Puzzle", "Arcade"]` |
| | `metadata.theme` | string | ✅ | phong cách: **`fruity kawaii merge`** |
| | `metadata.style` | string | ✅ | hướng dẫn style AI (pastel, viền đậm chibi, trái cây) |
| | `metadata.flag_movie` | bool | có thể | đánh dấu build movie test (mặc định `false`) |
| asset spec | `assets` | list[asset] | ✅ | xem §1.2 — mỗi key phải đủ |
| mechanic | `mechanics` | object | ✅ | xem §1.3 — bucket, chain, bảng điểm |
| publisher | `publisher` | object | ✅ | xem §1.4 |

### 1.2 Asset spec (mỗi phần tử trong `assets`)

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `key` | string | ✅ | định danh, unique, ASCII lowercase dạng `fruit_<bậc>`, `bucket`, `bg`… |
| `type` | enum `png` \| `audio` \| `json` | ✅ | loại file |
| `description` | string | ✅ | vai trò + kích thước dự kiến |
| `_size_est_kb` | number | nên | ước tính cho manifest — validate sớm khỏi vượt 30MiB/512KiB |
| `_usage_scenes` | list[string] | nên | scene dùng (Start, Gameplay, GameOver…) |

**Assets M3 (Kawaii fruit, pastel):**

| asset key (đề xuất) | type | Mô tả |
|-----------|------|-------|
| `fruit_01_cherry` … `fruit_12_watermelon` | png | 12 sprite trái cây theo bậc viền đậm (xem DESIGN-SPEC §6) |
| `bucket` | png | nền thùng chứa (rộng 640, vách trái/phải) |
| `bg_gradient` | png | nền gradient pastel Start+Gameplay |
| `danger_line` | png | vạch danger dashed |
| `logo` | png | logo chữ "Juicy Merge" Start |
| `ui_icons` | png | icon nút (play/retry/continue/pause/mute) |
| `sfx_drop` | audio | SFX thả trái (short) |
| `sfx_merge` | audio | SFX merge (theo bậc, pitch tăng) |
| `sfx_merge_big` | audio | SFX jackpot/watermelon |
| `sfx_danger` | audio | SFX nhắc trái sắp quá vạch |
| `sfx_gameover` | audio | SFX game over |
| `bgm_main` | audio | BGM vui nhộn vòng lặp, mono, bitrate thấp |

> Mỗi bậc trái = 1 sprite riêng (kích thước + hình khác nhau — merge cần phân biệt). 12 PNG nhỏ (~30-120KB/cái) + bucket + bg + icons + 10 audio ≈ tổng < 5MB.

### 1.3 Mechanic config (dữ liệu gameplay — khớp luật M3-01..M3-08)

| Field | Kiểu | Bắt buộc | Ràng buộc / Mô tả |
|-------|------|----------|-------------------|
| `bucket_width` | int | ✅ | chiều rộng thùng (px, world). M3: `640` |
| `bucket_height_ratio` | float | ✅ | tỷ lệ chiều cao thùng vs camera. M3: `0.70` |
| `danger_line_ratio` | float | ✅ | vị trí vạch danger tính từ đỉnh bucket. M3: `0.20` (20%) |
| `drop_cooldown_ms` | int | ✅ | cooldown thả chống spam. M3: `250` |
| `drop_start_ratio` | float | ✅ | y thả trái (tính từ đỉnh bucket). M3: `0.0` (đỉnh) |
| `chain` | list[string] | ✅ | chuỗi 12 trái theo bậc (tên key sprite). VD `[cherry, strawberry, grape, dekopon, pomegranate, orange, apple, pear, peach, pineapple, melon, watermelon]` |
| `score_per_tier` | list[int] | ✅ | điểm merge khi tạo trái bậc. `[1,3,6,10,15,21,28,36,45,55,66,100]` |
| `drop_spawn_pool` | object | ✅ | trọng số bậc sinh khi thả theo tiến trình (từ game test/curve) — bậc thấp nhiều hơn |
| `combo_window_ms` | int | ✅ | cửa sổ combo (merge liên tiếp). M3: `2000` |
| `physics` | object | ✅ | `{gravity_y, restitution, friction, sleep_threshold}` khởi tạo Matter.js (tinh chỉnh qua prototype) |
| `seed` | int\|string | nên | seed RNG phiên (nếu đặt → deterministic; nếu trống → ngẫu nhiên mỗi phiên) |

**Dummy field cho pipeline validate (do scaffold M1/M2 cứng):** (như M2 — thêm `lane_count`, `bee.base_speed`, `progression` dummy để validate config chung pass; game M3 không dùng lane/bee).

### 1.4 Publisher

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `publisher.name` | string | ✅ | `"ExcelToApp Games"` |
| `publisher.contact_email` | string | ✅ | `games@exceltoapp.vn` |

---

## 2. FRUIT CHAIN & BẢNG ĐIỂM (logic thuần)

- `chain[i]` = trái bậc `i+1` (index 0-based). `score_per_tier[i]` = điểm tạo ra trái bậc i+1.
- Merge: 2 trái có `tier == k` chạm → sinh trái `tier k+1` (nếu k+1 <= 11); score += `score_per_tier[k+1]`.
- Bậc cao nhất (Watermelon, index 11): không merge thêm — chỉ cộng jackpot khi sinh ra.

---

## 3. BUCKET & PHYSICS STATE

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `bucket` | object | `{x, y, w, h}` vị trí/kích thước world (từ config §1.3, tính theo camera) |
| `dangerY` | float | y of vạch danger = `bucket.y + bucket.h * danger_line_ratio`, tính từ đỉnh |
| `walls` | object | 2 vách trái/phải (tường vật lý chặn trái lăn ngoài) |
| `bodyType` | string | `"circle"` — mọi trái là body tròn (r theo bậc) |
| `sleep_threshold` | float | ngưỡng Matter.js.xác định "ổn định" (KO rơi/di chuyển) — dùng cho game-over check |
| `fruits[]` | list | danh sách trái đang tồn tại (id, tier, x/y, radius, body ref) |

**Game-over check:** khi `Matter` tất cả body `sleeping == true` (sleep_threshold đạt) VÀ tồn tại ≥1 trái có `y < dangerY` (tâm trên vạch) → game over. (Không khi trái đang rơi.)

---

## 4. MERGE & SCORE LOGIC (runtime)

**Merge rule (M3-02):** xét va chạm giữa 2 trái; nếu `tierA == tierB` và `tierA < 11` → hợp nhất thành 1 trái `tierA+1` tại điểm giữa, đẩy nhẹ theo vật lý. Xóa 2 trái cũ, sinh 1 trái mới.

**Score (M3-02 trích §4.3):** `score += score_per_tier[tierA+1]`; combo count++ nếu trong `combo_window_ms`; combo nhân thưởng (nếu có — mặc định hiện "Combo xN", không nhân điểm ở v1 để thư giãn).

**State transitions:** PLAYING → (game over) → [continue earned → PLAYING] | [continue refused → GAME_OVER stat]. GAME_OVER lần 2+ → interstitial.

---

## 5. RNG CHUỖI TRÁI (deterministic — M3-04)

- Dùng seeded PRNG (vd mulberry32 / Phaser random seed). Chỉ **dùng 1 instance** cho toàn phiên (không re-seed giữa chừng) → replay test được.
- Mỗi lần thả: lấy trái kế từ `drop_spawn_pool` (theo tiến trình score/thả-số-lượng), push vào queue `next`.
- `next` hiện 2 trái (next-fruit). Deterministic nghĩa là: cùng seed + cùng chuỗi hành động thả → cùng kết quả trái rơi/merge (physical replay với cùng seed + cùng timing).

---

## 6. SAVED-GAME / SCORE (D6)

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `best_score` | int | điểm cao nhất đạt được (nhiều phiên) — lưu qua Playables saveData |
| `schema_version` | int | M3: `1` (để migrate sau) |
| `seed_replay` | string (optional) | nếu bật chế độ replay — lưu seed đề debug |

- **sendScore:** gọi lên Playables sau mỗi game over (best score).
- **loadData / saveData:** đọc/ghi `best_score`. Lỗi → im lặng, mặc định 0, console (BR M3-08).

---

## 7. BUILD VALIDATION REPORT (D7 — từ pipeline validate)

Kết quả validate ràng buộc Playables → JSON (giống M2), pass/fail theo:
- Bundle: initial < 30MiB (target < 5MiB), file lẻ < 512KiB, total < 250MiB, load < 5s, save < 3MiB.
- Cấm nén; cấm gọi mạng ngoài/analytics/multiplayer/payment; responsive; 13+.
- Chi tiết xem `TEST-CASES.md` (PC-10..PC-19).

---

## 8. DESIGN DECISIONS

| Quyết định | Lý do |
|-----------|-------|
| Body hình tròn | Matter.js circle — không tăng bundle, vật lý merge đơn giản, dự đoán được (M3 lý do MoA chọn) |
| RNG seed 1 instance | Deterministic → vitest test được đúng bài học M2 "board luôn công bằng" |
| Game over chỉ khi settle | Tránh game over oan khi trái đang rơi ngang vạch — cảm giác công bằng (M3-03) |
| Rewarded tiếp tục ≤1 lần | Nguồn revenue + giữ chân #1 (đúng pattern M1); interstitial không chen lần 1 (M3-05/07) |
| Cooldown thả 250ms | Chống spam thả nhanh làm vật lý unstable + timestamp (M3-01) |
| Jackpot Watermelon = 100 | Trái lớn nhất khó tạo (cần merge nhiều) → điểm cao thưởng mother (M3 §4.4) |

---

## 9. STAGE PROGRESS & OBSTACLE SCHEMAS

### 9.1 Stage Definition Schema (`StageConfig`)
```ts
export interface StageGoal {
  type: "target_fruit" | "target_score" | "clear_obstacles";
  targetTier?: number; // Ví dụ 11 là Watermelon
  targetCount?: number; // Số lượng cần đạt
  targetScore?: number; // Điểm số cần đạt
}

export interface ObstacleInitialConfig {
  id: number;
  type: "ice" | "crate" | "bubble";
  x: number; // Tọa độ tương đối hoặc px
  y: number;
  width?: number;
  height?: number;
  containedFruitTier?: number; // Đối với bubble
  hp?: number; // Mặc định 1
}

export interface StageConfig {
  id: number;
  name: string;
  maxDrops: number; // Giới hạn lượt thả
  goals: StageGoal[];
  obstacles?: ObstacleInitialConfig[];
  starScores: [number, number, number]; // Điểm tối thiểu cho 1, 2, 3 sao
  rewardPowerup?: "hammer" | "bomb" | "rainbow";
}
```

### 9.2 Extended SaveData Schema
```ts
export interface ExtendedSaveData {
  best_score: number;
  unlockedStage: number; // Mặc định 1
  stageStars: Record<number, number>; // { [stageId]: stars (1..3) }
  stageHighscores: Record<number, number>;
  powerups: {
    hammer: number;
    bomb: number;
    rainbow: number;
  };
}
```