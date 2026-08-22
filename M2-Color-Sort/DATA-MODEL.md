# M2: DATA-MODEL — "Neon Sort — Galaxy Pour" (Color Sort Puzzle · YouTube Playables)

> **Pipeline KHÔNG có database.** File này mô tả **cấu trúc DỮ LIỆU LOGIC** của module M2 (color-sort): config schema `games/neon-sort.yaml`, board-state, level generator, saved-game/score, và build validation report — thứ mà pipeline Python (reuse M1) và game Phaser trao đổi. Không phải schema DB, không migration.
> **Nguồn sự thật:** `SPEC.md` M2 + config `games/neon-sort.yaml`. Mọi asset/metadata phái sinh từ file config này.
> **Scope:** chỉ block dữ liệu cho M2. Ngôn ngữ tiếng Việt. Schema mô tả dạng bảng/ASCII, **không code chạy được**.

---

## 0. Sơ đồ dữ liệu tổng quan (luồng tạo/nạp/gameplay)

```
 games/neon-sort.yaml ────────► nguồn sự thật (config 1 game: assets + mechanics + progression)
      │  [đọc bởi CLI pipeline / scaffold / assets / validate / package]
      ▼
 assets/raw/ ──────────────► asset manifest (asset key → file + size) → [validate, package]
      │
      ▼
 game/ (Phaser 3) ──────────► DỮ LIỆU LOGIC RUNTIME:
      │                         • CONFIG  → sinh board (Level Generator §3)
      │                         • BOARD STATE §2 (bàn ống hiện tại) + move action + win check
      │                         • SAVED-GAME §4 (best_level, current_level, best_moves) trên SDK
      │                                   + sendScore
      ▼
 build/neon-sort.zip + build/metadata/ ──► metadata portal (title/desc/thumb/preview/genre)
      │
      ▼
                    Build Validation Report (JSON) — cổng pass/fail (không nén, cấm mạng, 13+...)
```

**Loại dữ liệu logic trong hệ thống (không có DB):**

| # | Data block | Nơi sinh | Nơi tiêu thụ | Loại |
|---|-----------|----------|--------------|------|
| D1 | Config schema game (`neon-sort.yaml`) | người vận hành | CLI assets/scaffold/validate/package + game runtime | YAML file |
| D2 | Asset manifest | CLI `assets` | CLI validate/package | map key→file |
| D3 | Metadata portal | CLI `package` | form nộp Playables | file + fields |
| D4 | Board state + Move action (logic level) | Level generator / gameplay | game runtime | JSON trong bộ nhớ |
| D5 | Saved-game / Score | game runtime | Playables SDK (saveData/loadData/sendScore) | JSON payload |
| D6 | Build validation report | CLI `validate` | con người + Hermes QA | JSON |

---

## 1. CONFIG SCHEMA GAME — `games/neon-sort.yaml`

Cấu trúc một file config đại diện cho **một game color-sort**. Full name ở cấp `metadata` được nộp nguyên mẫu lên portal. Đây là **nguồn duy nhất** cho assets + mechanics + progression §3 (level generator).

### 1.1 Bảng fields (top-level)

| Nhóm | Field | Kiểu | Bắt buộc | Ràng buộc / Mô tả |
|------|-------|------|----------|-------------------|
| định danh | `name` | string | ✅ | key máy-lập-trình, ASCII lowercase. VD: `neon-sort` (tên thư mục/zip) |
| | `version` | semver `major.minor.patch` | ✅ | version build, dán vào metadata |
| metadata | `metadata.title` | string | ✅ | **≤ 50 ký tự** (portal). M2: **"Neon Sort: Galaxy Pour"** (nộp nguyên mẫu) |
| | `metadata.short_desc` | string | ✅ | **≤ 150 ký tự**, mô tả cơ chế, không thổi phồng, không branding |
| | `metadata.genre` | list[string] | ✅ | **1–2 genre** từ danh sách portal. M2: `["Puzzle", "Casual"]` hoặc `["Puzzle", "Arcade"]` |
| | `metadata.theme` | string | ✅ | phong cách: **`neon galaxy`** (nền tối + chất lỏng neon phát sáng) |
| | `metadata.style` | string | ✅ | hướng dẫn style cho AI để đồng bộ asset (glow, nhịp mảnh, nền tối) |
| | `metadata.flag_movie` | bool | có thể | đánh dấu build movie/animation test (mặc định `false`) |
| asset spec | `assets` | list[asset] | ✅ | xem §1.2 — mỗi asset key phải đủ |
| mechanic | `mechanics` | object | ✅ | xem §1.3 — gameplay data (ống, màu, level ramp) |
| publisher | `publisher` | object | ✅ | xem §1.4 |

### 1.2 Asset spec (mỗi phần tử trong `assets`)

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `key` | string | ✅ | định danh asset, unique, ASCII lowercase dạng `tube_neon`, `liquid_<color>`… |
| `type` | enum `png` \\| `audio` \\| `json` | ✅ | loại file |
| `description` | string | ✅ | mô tả vai trò asset (scene dùng, kích thước dự kiến) |
| `_size_est_kb` | number | nên | size ước tính cho manifest — validate sớm khỏi vượt 30MiB/512KiB |
| `_usage_scenes` | list[string] | nên | scene dùng (Start, Gameplay, Clear…) |

> **Assets M2 (Neon Galaxy):** ống thủy tinh **phát sáng** (glow edge) + đáy ống, chất lỏng neon (chỉ 1 sprite màu tái dùng để tint → không cần 1 file/màu), background gradient tối (deep space/tím-đen), các SFX. Cấu trúc nhỏ gọn để bundle < 5MB.

| asset key (đề xuất naming) | type | Mô tả |
|-----------|------|-------|
| `tube_base` | png | ống thủy tinh neon phát sáng (1 sprite, tái dùng) |
| `tube_glow` | png | viền/sáng quanh miệng ống khi chọn |
| `liquid_neon` | png | lát chất lỏng màu (1 sprite trắng → tint theo màu từ palette) |
| `bg_gradient` | png | nền gradient tối (deep space / tím-đen) màn Start + Gameplay |
| `ui_icons` | png | icon nút chơi/undo/restart/hint (+tooltip) |
| `confetti` | png | hiệu ứng particle khi Level Clear |
| `sfx_pour` | audio | SFX đổ chất lỏng |
| `sfx_error` | audio | SFX "không được" (đổ sai, rung nhẹ) |
| `sfx_clear` | audio | SFX level clear |
| `bgm_main` | audio | BGM nhẹ vòng lặp, mono, bitrate thấp |

> Màu chất lỏng = tint theo `mechanics.colors` palette (không cần sprite riêng mỗi màu).

### 1.3 Mechanic config (dữ liệu gameplay — pure data, khớp luật M2-01..M2-08)

| Field | Kiểu | Bắt buộc | Ràng buộc / Mô tả |
|-------|------|----------|-------------------|
| `tube_count_start` | int | ✅ | số ống **khởi đầu** level 1. M2: `4` (3 màu + 1 ống trống) |
| `capacity` | int | ✅ | số lát tối đa mỗi ống. M2: `4` ở level đầu (M2 §4.1) |
| `colors` | list[color] | ✅ | bảng palette màu chất lỏng neon (hex). Số màu level 1 = tube_count − workspace_trống (xem level ramp) |
| `workspace_empty_tubes` | int | ✅ | số ống trống để đổ qua (workspace). Level đầu 1–2; level cao giảm → khó hơn (§3) |
| `level_ramp` | object | ✅ | công thức tăng độ khó theo level — xem §1.5 |
| `level_ramp.step_tubes` | int | ✅ | + ống mỗi mốc level (VD `+1` mỗi N level) |
| `level_ramp.step_colors` | int | ✅ | + màu mỗi mốc (màu = tube trừ workspace) |
| `level_ramp.step_capacity` | int | ✅ | + capacity (lát/ống) mỗi mốc (M2: C=4 đầu, tăng dần) |
| `level_ramp.milestone_every` | int | ✅ | cứ mỗi N level thì tăng 1 bậc (VD `2`) |
| `progression.best_level` | int | ✅ | level cao nhất đã đạt (load lúc mở để tiếp tục) |
| `progression.best_moves` | int | ✅ | số move tối thiểu đã đạt tốt nhất (nếu dùng) |
| `reward.hint_max_uses` | int | nên | giới hạn hint/level nếu cần (mặc định thoải mái) |
| `reward.extra_tube_max` | int | ✅ | số **extra tube** (ống trống thêm bằng rewarded) tối đa/level khó (M2-06) |
| `ad.interstitial_after_levels` | int | ✅ | interstitial giữa level, **KHÔNG ở level đầu** (M2-07; VD từ level 2+ mỗi lần qua level) |

> **Luật đổ (M2-01) & thắng (M2-02) là logic cố định của game** — mô tả ở §2, không cấu hình trong yaml.

### 1.4 Publisher info

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `publisher.name` | string | ✅ | tên publisher hiển thị trên portal |
| `publisher.contact_email` | email | ✅ | email liên hệ nộp portal |
| `publisher.website` | URL (optional) | ❌ | không bắt buộc; nếu có KHÔNG gắn branding vào game |

### 1.5 Level ramp (công thức tăng độ khó theo level — data)

Độ khó tăng dần: lượng **ống / màu / capacity** tăng theo level. Level 1: 4 ống / 3 màu / C=4 → level cao: 12+ ống / 10+ màu (SPEC M2 §4.3).

| Đại lượng | Công thức | Ghi chú |
|-----------|-----------|---------|
| `tube_total(level)` | `tube_count_start + floor((level-1)/milestone_every) * step_tubes` | cận trên 12+; workspace ≥1 |
| `color_count(level)` | `tube_total - workspace_empty_tubes - extra_tube_current` | mỗi màu phải có CHÍN đúng capacity tổng để chia đều; sinh board phải đảm bảo |
| `capacity(level)` | `capacity_start + floor((level-1)/milestone_every) * step_capacity` | M2: C=4 đầu, tăng dần |
| `workspace(level)` | giảm dần khi level cao: khởi đầu 1–2 ống trống → level cao 1 (khó hơn) | định nghĩa trong yaml theo từng vùng level |
| `extra_tube` | thưởng rewarded (M2-06) | thêm 1 ống trống tạm, tối đa `reward.extra_tube_max` |

> **Bất biến:** tổng số lát màu của toàn board = `color_count × capacity` và phải đúng bằng sức chứa của số ống "đã sort" lúc khởi tạo → level generator (§3) luôn tạo được bàn giải được (M2-04).

### 1.6 Ví dụ YAML mẫu (minh họa cấu trúc — KHÔNG code)

```yaml
name: neon-sort
version: 0.1.0

metadata:
  title: "Neon Sort: Galaxy Pour"     # <=50 ký tự (SPEC §5)
  short_desc: "Xếp chất lỏng neon cùng màu vào một ống. Giải mã, lên level, thư giãn!"  # <=150
  genre: ["Puzzle", "Casual"]          # 1-2 genre
  theme: "neon galaxy"
  style: "nền tối deep-space, chất lỏng neon phát sáng (glow), UI tối giản"
  flag_movie: false

assets:
  - key: tube_base
    type: png
    description: "Ống thủy tinh neon phát sáng, nền trong suốt, ~256x512"
    _size_est_kb: 30
    _usage_scenes: [Gameplay]
  - key: tube_glow
    type: png
    description: "Viền sáng quanh miệng ống khi được chọn (highlight)"
    _size_est_kb: 12
    _usage_scenes: [Gameplay]
  - key: liquid_neon
    type: png
    description: "1 lát chất lỏng màu trắng -> tint theo mechanics.colors"
    _size_est_kb: 6
    _usage_scenes: [Gameplay]
  - key: bg_gradient
    type: png
    description: "Nền gradient tối (tím/đen deep space) Start + Gameplay, <512KB"
    _size_est_kb: 34
    _usage_scenes: [Start, Gameplay]
  - key: ui_icons
    type: png
    description: "Icon chơi/undo/restart/hint/next (sprite atlas nhỏ)"
    _size_est_kb: 22
    _usage_scenes: [Start, Gameplay, Clear]
  - key: confetti
    type: png
    description: "Hiệu ứng particle khi Level Clear"
    _size_est_kb: 26
    _usage_scenes: [Clear]
  - key: sfx_pour
    type: audio
    description: "SFX đổ chất lỏng, <1s, mp3/ogg"
    _size_est_kb: 18
    _usage_scenes: [Gameplay]
  - key: sfx_error
    type: audio
    description: "SFX đổ không hợp lệ (rung nhẹ), <1s"
    _size_est_kb: 12
    _usage_scenes: [Gameplay]
  - key: sfx_clear
    type: audio
    description: "SFX level clear, ngắn"
    _size_est_kb: 30
    _usage_scenes: [Clear]
  - key: bgm_main
    type: audio
    description: "BGM nhẹ vòng lặp, mono, bitrate thấp"
    _size_est_kb: 150
    _usage_scenes: [Gameplay, Start]

mechanics:
  tube_count_start: 4          # 3 màu + 1 ống trống
  capacity: 4                  # lát/ống level đầu (SPEC §4.1)
  workspace_empty_tubes: 1     # ống trống để đổ qua (level đầu)
  colors:
    - "#FF3E9E"                # hồng neon
    - "#00E5FF"                # cyan neon
    - "#9D4EFF"                # tím neon
    # level cao thêm màu từ palette mở rộng (vàng/xanh/đỏ/...)
  level_ramp:
    milestone_every: 2         # mỗi 2 level thì tăng 1 bậc
    step_tubes: 1              # +1 ống
    step_colors: 1             # +1 màu
    step_capacity: 1           # +1 lát/ống
  reward:
    hint_max_uses: 0           # hinted chấp rewarded ad (không giới hạn cứng ở MVP)
    extra_tube_max: 1          # thêm 1 ống trống/level khó (M2-06)
  ad:
    interstitial_after_levels: 2   # interstitial từ level-2 trở đi, không level đầu (M2-07)

publisher:
  name: "ExceltApp Games"
  contact_email: "games@exceltoapp.vn"
  website: ""
```

---

## 2. BOARD STATE SCHEMA (logic bàn ống — runtime)

Dữ liệu **bàn ống** là trạng thái logic của một level đang chơi, tồn tại trong bộ nhớ game. **KHÔNG lưu DB** — chỉ giữ nguyên lúc runtime; khi đóng game chỉ lưu `current_level` (§4), level mới sẽ **sinh lại** theo generator §3.

### 2.1 Biểu diễn bảng (ASCII)

```
Tube được mô tả mảng lát màu, index 0 = ĐÁY, index cuối = ĐỈNH (top).

       đỉnh (top)            ĐỈNH  (màu lấy để đổ — M2-01)
         │
  ┌───── ▼ ─────┐
  │   [cyan]    │  index 2 (top / đỉnh)
  │   [cyan]    │  index 1
  │   [pink]    │  index 0 (đáy)
  └─────────────┘
     capacity C = 4  (còn 1 chỗ trống trên ống)
```

Mỗi `tube` = danh sách các màu, theo thứ tự từ đáy (index 0) tới đỉnh (index len-1). Số phần tử ≤ `capacity`.

**Ví dụ board 4 ống / 3 màu / C=4 (level 1):**

```
tube[0] = [pink, cyan, pink, cyan]   # trộn 2 màu, đầy
tube[1] = [cyan, white, white, white] # trộn
tube[2] = [pink, cyan, pink, cyan]   # trộn
tube[3] = []                          # ống TRỐNG (workspace)
```

### 2.2 Schema board state (đối tượng runtime)

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `level` | int | số level đang chơi |
| `capacity` | int | sức chứa lát/ống của level này (từ config §1.3) |
| `tubes` | list[tube] | danh sách ống. Mỗi `tube` = list[string color]; empty = `[]` |
| `tube_count` | int | tổng số ống (kể cả ống trống/workspace) |
| `colors` | list[string] | palette màu khả dụng level này |
| `move_count` | int | số nước đi đã thực hiện trong level (cập nhật: đổ hợp lệ +1; undo −1; restart = 0) |
| `history` | list[move] | lịch sử move đã thực hiện (cho Undo — M2-05); tối đa theo bộ nhớ, đẩy/trượt khi quá dài |
| `stuck_flag` | bool | cờ "kẹt" (hết nước đi hợp lệ, chưa win) → nhắc Undo/Restart/Hint (M2-03) |
| `extra_tube_used` | int | số extra tube (rewarded) đã dùng trong level này (tối đa `extra_tube_max`) |
| `win` | bool | `true` khi thỏa M2-02 |

### 2.3 Move action (Hành động đổ — M2-01)

Một nước đi = đổ từ ống nguồn sang ống đích. Được biểu diễn logic:

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `from` | int | index ống **nguồn** (chứa chất lỏng) |
| `to` | int | index ống **đích** |
| `layers` | int | số lát màu-đỉnh cùng màu liên tiếp được lấy từ nguồn (chuỗi đỉnh) |
| `count` | int | lát THỰC SỰ đổ sang đích (≤ `layers`, giới hạn chỗ trống đích) |

**Quy tắc đổ (M2-01, BẮT BUỘC):**
- Màu đỉnh nguồn: lấy chuỗi lát **cùng màu** từ đỉnh xuống. Nếu nguồn có 3 `cyan` liên tiếp đỉnh → `layers = 3`.
- Đổ hợp lệ khi: đích **trống** HOẶC (đích có ≥1 chỗ trống VÀ đỉnh đích **cùng màu** với chuỗi đang đổ).
- Số lát thực đổ `count` = `min(layers, chỗ trống đích)`. Nếu `count = 0` → **KHÔNG hợp lệ** → không đổi board + phản hồi lỗi (rung nhẹ + sfx_error) (M2-01).

### 2.4 Win check (M2-02)

Board `win = true` khi **MỌI ống** thỏa: `[]` (trống) HOẶC chỉ chứa **1 màu duy nhất** (sô la by `len(set(tube)) == 1`). Không ống nào lẫn màu.

```
Example win board (3 màu / C=4 / 1 ống trống):
tube[0] = [pink, pink, pink, pink]   # 1 màu ✅
tube[1] = [cyan, cyan, cyan, cyan]   # 1 màu ✅
tube[2] = [purple, purple, purple, purple] # 1 màu ✅
tube[3] = []                          # trống ✅  → WIN
```

Khi win → popup Clear + confetti + sfx_clear + `sdk.sendScore(level)` + `saveData(current_level)`, chờ nút Next → level kế (interstitial giữa level, M2-07).

### 2.5 Kẹt (no legal move — M2-03)

Không có nước đi hợp lệ trước khi thắng → `stuck_flag = true` → hiện tooltip nhắc **Undo / Restart / Hint**. Không timer, không thua.

---

## 3. LEVEL GENERATOR (sinh board LUÔN giải được — M2-04)

Mục tiêu: mỗi level sinh board trộn mà **luôn tồn tại 1 chuỗi nước đi hợp lệ để giải**. Kỹ thuật chuẩn: **sinh NGƯỢC** từ trạng thái đã sort.

### 3.1 Thuật toán sinh ngược (bắt buộc — M2-04)

```
BƯỚC 1 — Khởi tạo trạng thái "đã sort":
   - color_count màu, capacity C.
   - Tạo color_count ống MỖI ống chứa C lát CÙNG 1 màu (đầy).
   - Tạo workspace_empty_tubes ống TRỐNG (để đổ qua).
   - (tube_total = color_count + workspace_empty_tubes [+ extra tube nếu có])

BƯỚC 2 — Trộn NGƯỢC: lặp N bước (N = biến difficulty ngẫu nhiên trong khoảng config):
   - Chọn ngẫu nhiên một nước đi HỢP LỆ NGƯỢC, tức: nguồn là ống ĐỈNH cũng màu chuỗi,
     đích có sẵn lát đỉnh cùng màu (hoặc trống) và đủ chỗ.
   - Thực hiện "đổ ngược" = gộp lát màu-đỉnh từ một ống có lát đỉnh đó
     sang ống đang "đã sort" cùng màu hoặc ống trống.
   - Mỗi bước ngược đảm bảo KẾT QUẢ vẫn tuân theo luật đổ M2-01
     (chỉ chạm lát cùng màu, giữ capacity).

BƯỚC 3 — Khóa lời giải:
   - GIỮ LẠI toàn bộ chuỗi bước ngược làm lời giải ngầm (hidden solution).
   - Board hiển thị = trạng thái sau khi trộn ngược N bước.
   - Tồn tại path ngược = bảo đảm luôn giải được (M2-04).
   - Hint (M2-06) = chọn bước hợp lệ TỪ trạng thái hiện tại đi theo hướng lời giải.

N bước càng lớn → board càng khó (nhiều lần trộn). Giới hạn N theo level_ramp
để vừa khó vừa chơi được; luôn kiểm chứng: không sinh board không có lời giải (CẤM, M2-04).
```

### 3.2 Ràng buộc sinh hợp lệ

| Ràng buộc | Giá trị / Mô tả |
|-----------|-----------------|
| **Bất biến tổng lát** | `sum(len(tube_i)) == color_count × capacity` tại mọi thời điểm (không mất/mọc lát) |
| **Giới hạn capacity** | không ống nào vượt `capacity` lát |
| **Khóa lời giải** | luôn lưu path ngược đã sinh → `solvable = true` (M2-04) |
| **Level 1 đơn giản** | 4 ống/3 màu, workspace 1, ít N bước → dễ vào |
| **Level cao** | 12+ ống/10+ màu, workspace ít, N lớn → khó + giữ chân (M2 §4.3) |
| **Extra tube** | thêm ống trống tạm khi rewarded (M2-06) — không hỏng tính giải được (ống trống chỉ mở rộng không gian) |

### 3.3 Luồng level → board (ASCII)

```
Level n (config §1.3/§1.5)
   │ level_ramp: tube_total, color_count, capacity, workspace
   ▼
Level Generator (sinh ngược N bước) ───► Board State đã trộn  +  (hidden solution path)
   │                                                            │
Gameplay (chơi, undo/restart/hint)      ◄─── hint đọc path ◄────┘
   │ win check (M2-02)
   ▼
WIN → save (current_level +1, best_moves) → interstitial → level n+1 → generator lại
```

---

## 4. SAVED-GAME / SCORE SCHEMA (runtime trên Playables SDK)

Dữ liệu tồn tại trong game runtime, lưu/đọc qua **YouTube Playables SDK** (`saveData`/`loadData`, `sendScore`). KHÔNG phải DB; payload JSON đối tượng duy nhất, nhỏ.

### 4.1 Rule bắt buộc

| Rule | Mô tả |
|------|-------|
| **Lưu** | `saveData(payload)` — < 3 MiB (target < 500 KiB) |
| **Đọc** | `loadData()` lúc khởi tạo để tiếp tục từ level đã lưu |
| **Điểm cao** | `sendScore(level)` lúc quay lại/level clear (M2 §4.3) |
| **Lỗi load/save** | NẾU lỗi → dùng phiên hiện tại (level 1), KHÔNG crash (M2-08) |
| **Dữ liệu tối thiểu** | chỉ lưu progress tóm gọn (level + đôi moves), KHÔNG lưu board/object tạm |

### 4.2 Saved-game schema (payload `saveData`/`loadData`)

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `schema_version` | int | ✅ | version schema để migrate (M2: `1`) |
| `best_level` | int | ✅ | **level cao nhất đã đạt** (M2-08) — hiển thị LevelSelect/tiếp tục |
| `current_level` | int | ✅ | **level đang chơi** (đóng giữa chừng → tiếp tục đúng level này, SPEC §7) |
| `best_moves` | int | nên | số move ít nhất đã dùng để win level gần nhất (tham chiếu chơi tối ưu) |
| `last_updated_ts` | int (epoch ms) | nên | thời điểm lưu gần nhất |
| `flags` | object | ❌ | cờ tùy ý: `tutorial_seen`, `did_extra_tube_once`… |

> **KHÔNG lưu** board state / lịch sử / giữa-level — vì level tự sinh được nên chỉ cần số level (thỏa giới hạn nhỏ).

### 4.3 Ví dụ payload saved-game (minh họa)

| Field | Giá trị |
|-------|--------|
| `schema_version` | 1 |
| `best_level` | 14 |
| `current_level` | 14 |
| `best_moves` | 23 |
| `last_updated_ts` | 1724328000000 |

### 4.4 Score schema (payload `sendScore`)

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `score` | int | **level đạt/X cao nhất** gửi lên YouTube (map sang leaderboard) |
| (chỉ số) | — | KHÔNG kèm metadata ad-hoc; YouTube tự map |

> Luồng: level clear → `sendScore(best_level)`; đồng thời cập nhật `best_level`/`current_level`/`best_moves` rồi `saveData()`. Khi mở game → `loadData()` → nhảy đúng `current_level`.

---

## 5. BUILD VALIDATION REPORT SCHEMA (CLI `validate`)

CLI `validate` chạy trên `game/` + `assets/raw/` + config → **một đối tượng JSON report** (KHÔNG DB). Tổng **PASS khi mọi MUST pass**, ngược lại FAIL (chặn đóng gói).

### 5.1 Cấu trúc report

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `game_name` | string | `neon-sort` |
| `validated_at` | ISO8601 | thời điểm chạy |
| `version` | string | version build |
| `overall` | enum `PASS` \\| `FAIL` | PASS khi mọi MUST pass |
| `checks` | list[check] | từng mục check — xem §5.2 |

### 5.2 Mỗi mục check

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `id` | string | tên check (dòng 5.3) |
| `level` | enum `MUST` \\| `WARN` | MUST fail → không package; WARN → cảnh báo |
| `status` | enum `pass` \\| `fail` \\| `warn` | kết quả |
| `value` | number \\| string \\| bool | giá trị đo được |
| `limit` | string | giới hạn target (VD "< 5MB") |
| `message` | string | ghi chú nếu fail |

### 5.3 Danh sách check (ngưỡng — SPEC M2 §6/§8 · BR M2-10/11/09)

| id | Nội dung | level | Ngưỡng / Giá trị cần |
|----|----------|-------|----------------------|
| `bundle_initial` | bundle trước `gameReady` | MUST | **< 30 MiB, target < 5 MB** (M2-10) |
| `file_individual` | file lẻ | MUST | **< 30 MiB, target < 512 KB** (M2-10) |
| `bundle_total` | tổng bundle | MUST | **< 250 MiB (target < 15 MiB)** |
| `load_time` | load → tương tác | MUST | **< 5 giây** (M2-10) |
| `save_size` | saved-game data | MUST | **< 3 MiB, target < 500 KiB** (M2-10) |
| `no_compression` | cấm nén | MUST | KHÔNG nén; decompression fallback OK (M2-10) |
| `no_external_network` | cấm gọi mạng ngoài / ads bên thứ 3 / self-monetize | MUST | chỉ `ytgame` SDK (M2-09) |
| `responsive` | mọi aspect (9:16, 16:9, 1:1...), scale theo viewport, giữ state khi resize | MUST | không khóa orientation (M2-11) |
| `pause_mute` | obey `onPause`/`onResume`/`onAudioEnabledChange` ngay lập tức | MUST | dừng + tắt âm; resume (UB-7 M2 §7) |
| `input_touch_mouse` | touch + mouse (tap là chính) | MUST | M2-11 |
| `target_audience_13plus` | phù hợp 13+, không nội dung nhạy cảm | MUST | M2-11 |
| `level_solvable` | test tự động N level: board sinh LUÔN giải được | MUST | generator §3 (M2-04) |

> Mục `level_solvable` là check đặc thù M2: chạy generator N lần và xác nhận tồn tại path giải (M2-04) — đảm bảo không bao giờ sinh board không lời giải.

---

## 6. Ràng buộc & quyết định thiết kế dữ liệu (tóm tắt)

| Quyết định | Lý do |
|-----------|-------|
| Không dùng DB — mọi dữ liệu là file/config/JSON runtime | pipeline nhẹ, game thuần tĩnh, tuân thủ "cấm gọi mạng ngoài" Playables (M2-09) |
| `games/neon-sort.yaml` là nguồn sự thật duy nhất | assets + mechanics + level ramp nhất quán, dễ nhân rộng |
| Board state chỉ tồn tại runtime, KHÔNG lưu | level tự sinh lại được (§3) → saveData chỉ giữ `current_level`+`best_level`, nhỏ, thỏa <3MiB |
| Level generator sinh NGƯỢC từ trạng thái sort + khóa path | đảm bảo luôn giải được (M2-04), hint đọc được path, không cần solver TSP phức tạp |
| Board tuân luật đổ M2-01 (cùng màu/trống + chỗ trống) | uniform với chuẩn water-sort, tự nhiên cho người chơi |
| Màu dùng 1 sprite `liquid_neon` + tint theo palette | giảm asset (1 ảnh/màu không cần), giữ bundle nhỏ < 5MB đầu |
| Progression là dữ liệu thuần (`level_ramp`) | tăng ống/màu/capacity theo mốc — tune retention không cần sửa code |
| Validate bắt buộc PASS mọi MUST trước khi package + check `level_solvable` | chặn nộp build vi phạm Playables (size/nén/mạng/responsive/13+) và board không giải được |
| Metadata không branding, title ≤50, desc ≤150, genre 1–2 | tiêu chuẩn nộp portal, tránh reject |
| `saveData`/`sendScore` có fallback khi lỗi (M2-08) | không crash, giữ trải nghiệm khi SDK lỗi |

---

*FILE NÀY = ĐẶC TẢ DỮ LIỆU LOGIC cho M2. Không phải schema DB; không tạo bảng/migration. Pipeline Python đọc/ghi theo schema trên. Xem thêm `SPEC.md` (nguồn sự thật module M2) và `../M1-*/DATA-MODEL.md` để biết format chung pipeline.*