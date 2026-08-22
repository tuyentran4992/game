# M1: DATA-MODEL — "Cứu Mèo" (YouTube Playables)

> **Pipeline KHÔNG có database.** File này mô tả **cấu trúc DỮ LIỆU LOGIC** (config schema, asset manifest, metadata portal, saved-game/score, build validation report) mà pipeline Python trao đổi — không phải schema DB, không migration, không code vận hành.
> **Nguồn sự thật:** `games/cuu-meo.yaml` (config 1 game). Mọi asset + metadata phái sinh từ file này (BR-13).
> **Scope:** chỉ block dữ liệu cho module M1. Ngôn ngữ: tiếng Việt. Schema mô tả dạng bảng/ASCII, **không code chạy được**.

---

## 0. Sơ đồ dữ liệu tổng quan (luồng tạo/nạp)

```
 games/cuu-meo.yaml  ───────────────  nguồn sự thật (config 1 game)
      │  [đọc bởi CLI]
      ▼
 assets/raw/ ──────► asset manifest (asset key → file + size) → [validate, package]
      │
      ▼
 game/ (Phaser) ────► runtime DỮ LIỆU (state): saved-game + score trên SDK
      │                  (saveData/loadData/sendScore)
      ▼
 build/cuu-meo.zip + build/metadata/ ──► metadata portal (title/desc/thumb/preview/genre)
                                             │
                                             ▼
                                  Build Validation Report (JSON) — cổng pass/fail
```

**Loại dữ liệu logic trong hệ thống (không có DB):**

| # | Data block | Nơi sinh | Nơi tiêu thụ | Loại |
|---|-----------|----------|--------------|------|
| D1 | Config schema game | người vận hành | CLI assets/scaffold/validate/package | YAML file |
| D2 | Asset manifest | CLI assets | CLI validate/package | map key→file |
| D3 | Metadata portal | CLI package | form nộp Playables | file + fields |
| D4 | Saved-game / Score | game runtime | SDK cloud | JSON payload |
| D5 | Build validation report | CLI validate | con người + hermē QA | JSON |

---

## 1. CONFIG SCHEMA GAME — `games/cuu-meo.yaml`

Cấu trúc một file config đại diện cho **một game**. Full name ở cấp `metadata` và `publisher` được nộp nguyên mẫu lên portal.

### 1.1 Bảng fields (top-level)

| Nhóm | Field | Kiểu | Bắt buộc | Ràng buộc / Mô tả |
|------|-------|------|----------|-------------------|
| định danh | `name` | string | ✅ | key máy-lập-trình, ASCII lowercase, không dấu, dùng làm tên thư mục/zip. VD: `cuu-meo` |
| | `version` | semver `major.minor.patch` | ✅ | version build, dán vào metadata |
| metadata | `metadata.title` | string | ✅ | **≤ 50 ký tự** (BR-07). Tiếng Việt không dấu + EN fallback |
| | `metadata.short_desc` | string | ✅ | **≤ 150 ký tự** (BR-07), mô tả cơ chế, không thổi phồng, không branding |
| | `metadata.genre` | list[string] | ✅ | **1–2 genre** chọn từ danh sách portal (VD: `["Hyper Casual", "Arcade"]`) |
| | `metadata.theme` | string | ✅ | phong cách: ví dụ `flat / warm cute / pastel` |
| | `metadata.style` | string | ✅ | hướng dẫn style cho AI để đồng bộ asset |
| | `metadata.flag_movie` | bool | có thể | đánh dấu build này là movie/animation test (mặc định `false`) |
| asset spec | `assets` | list[asset] | ✅ | xem §1.2 — mỗi asset key phải đủ |
| mechanic | `mechanics` | object | ✅ | xem §1.3 |
| publisher | `publisher` | object | ✅ | xem §1.4 |

### 1.2 Asset spec (mỗi phần tử trong `assets`)

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `key` | string | ✅ | định danh asset, unique, ASCII lowercase dạng `cat_idle`, `bee_wasp`… |
| `type` | enum `png` \| `audio` \| `json` | ✅ | loại file. JSON dùng cho cấu hình nếu có (hiếm) |
| `description` | string | ✅ | mô tả vai trò asset (scene nào dùng, kích thước dự kiến) |
| `_size_est_kb` | number | nên (khuyến nghị) | size ước tính cho manifest — giúp validate sớm khỏi vượt 5MB/512KB |
| `_usage_scenes` | list[string] | nên | các scene dùng (đối chiếu §2) |

### 1.3 Mechanic config (dữ liệu gameplay — pure data)

| Field | Kiểu | Bắt buộc | Ràng buộc / Mô tả |
|-------|------|----------|-------------------|
| `lane_count` | int | ✅ | số lane track (M1: `3`) |
| `lane_axis` | enum `horizontal` \| `vertical` | ✅ | hướng track (M1: `horizontal`) |
| `bee.base_speed` | number | ✅ | tốc độ ong ban đầu (px/s) |
| `bee.speed_increment` | number | ✅ | tốc độ tăng mỗi interval/giây (khó tăng dần) |
| `bee.speed_interval_s` | number | ✅ | chu kỳ tăng tốc (giây) |
| `bee.spawn_rate_max` | number | ✅ | số ong tối đa cùng lúc (giới hạn nhịp) |
| `score.points_per_dodge` | int | ✅ | điểm + khi né thành công 1 ong — **M1: `1`/lần né** (khớp score rule §1.7) |
| `score.points_per_second` | int | ✅ | điểm + theo thời gian trụ được — M1: `1`/s |
| `progression.milestone_interval` | int | ✅ | số điểm để lên **1 level** (M1: `10`) — level = `floor(score/…)+1`, KHÔNG reset (BR-14) |
| `progression.combo_per` | int | ✅ | số lần **né liên tiếp** không chạm để được thưởng combo (M1: `5`) (BR-15) |
| `progression.combo_bonus` | int | ✅ | điểm thưởng mỗi lần đạt combo (M1: `+5`) (BR-15) |
| `progression.palettes` | list[palette] | ✅ | **≥ 3 palette nền** cho level 1/2/3 rồi vòng lại (BR-14) — xem §1.6 |
| `progression.palettes[].level` | int | nên | level mà palette áp dụng; level > số palette thì vòng lại theo modulo |
| `progression.palettes[].bg_top` / `bg_bottom` | color | ✅ | màu nền gradient trên/dưới của cảnh ở level này |
| `progression.palettes[].grass` | color | ✅ | màu cỏ/khu vực dưới track theo level |
| `progression.palettes[].lane_color` | color | ✅ | màu các lane track theo level |
| `progression.palettes[].primary` / `accent` | color | nên | màu UI / đối tượng phụ nếu đổi theo level (không bắt buộc) |
| `progression.difficulty.start_speed` | number | ✅ | tốc độ ong **ban đầu — THẤP** trong 10s đầu (giữ chân người mới) (BR-17) |
| `progression.difficulty.speed_increase_per_sec` | number | ✅ | px/s tốc độ tăng mỗi giây sau giai đoạn khởi đầu (nhảy bậc ở milestone level) |
| `progression.difficulty.spawn_increase` | number | ✅ | mật độ/spawn ong tăng dần mỗi giây sau 10s đầu |
| `reward.continue_max_per_gameover` | int | ✅ | số lần rewarded"tiếp tục" tối đa/1 game over (BR-10: `1`) |
| `ad.interstitial_delay_games` | int | nên | interstitial chỉ sau lượt chơi thứ N (BR-09: từ lượt thứ 2+, sau 10s đầu — không đặt ở level đầu) |

### 1.4 Publisher info

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `publisher.name` | string | ✅ | tên publisher hiển thị trên portal |
| `publisher.contact_email` | email | ✅ | email liên hệ nộp portal |
| `publisher.website` | URL (optional) | ❌ | không bắt buộc; nếu có KHÔNG gắn branding vào game |

### 1.5 Ví dụ YAML mẫu (minh họa cấu trúc — KHÔNG code)

```yaml
name: cuu-meo
version: 0.1.0

metadata:
  title: "Cuu Meo - Bee Dodge"        # <=50 ký tự
  short_desc: "Một chạm để né ong, cứu chú mèo. Điểm tăng dần!"   # <=150 ký tự
  genre: ["Hyper Casual", "Arcade"]   # 1-2 genre
  theme: "flat pastel cartoon"
  style: "warm cute, đơn giản, nền gradient tối thiểu"
  flag_movie: false

assets:
  - key: cat_idle
    type: png
    description: "Nhân vật mèo núi tĩnh, nền trong suốt, ~512x512"
    _size_est_kb: 80
    _usage_scenes: [Gameplay, GameOver]
  - key: bee_wasp
    type: png
    description: "Chướng ngại (ong) nền trong suốt, ~256x256, 1-2 biến thể"
    _size_est_kb: 40
    _usage_scenes: [Gameplay, Tutorial]
  - key: bg_gradient
    type: png
    description: "Nền gradient tĩnh màn Start/Tutorial, size thấp"
    _size_est_kb: 30
    _usage_scenes: [Start, Tutorial]
  - key: bg_pal_morning
    type: png
    description: "Nền cảnh Level 1 (palette `pal_morning`) — gradient + cỏ/detail, <512KB"
    _size_est_kb: 40
    _usage_scenes: [Gameplay]
  - key: bg_pal_sunset
    type: png
    description: "Nền cảnh Level 2 (palette `pal_sunset`) — hoàng hôn, đổi theo level (BR-14)"
    _size_est_kb: 40
    _usage_scenes: [Gameplay]
  - key: bg_pal_night
    type: png
    description: "Nền cảnh Level 3 (palette `pal_night`) — đêm, đổi theo level (BR-14)"
    _size_est_kb: 40
    _usage_scenes: [Gameplay]
  - key: ui_icons
    type: png
    description: "Icon nút chơi/chơi lại/tiếp tục (sprite atlas nhỏ)"
    _size_est_kb: 25
    _usage_scenes: [Start, GameOver]
  - key: sfx_dodge
    type: audio
    description: "SFX ngắn khi né, <1s, mp3/ogg"
    _size_est_kb: 20
    _usage_scenes: [Gameplay]
  - key: bgm_main
    type: audio
    description: "BGM nhẹ vòng lặp, mono, bitrate thấp"
    _size_est_kb: 150
    _usage_scenes: [Gameplay]

mechanics:
  lane_count: 3
  lane_axis: horizontal
  bee:
    base_speed: 120               # khớp progression.difficulty.start_speed (thấp 10s đầu)
    speed_increment: 8
    speed_interval_s: 5
    spawn_rate_max: 4
  score:
    points_per_dodge: 1           # +1 mỗi lần né thành công (khớp score rule §1.7)
    points_per_second: 1
  reward:
    continue_max_per_gameover: 1
  ad:
    interstitial_delay_games: 2
  progression:
    milestone_interval: 10        # mỗi 10 điểm = 1 level (level = floor(score/10)+1) (BR-14)
    combo_per: 5                  # mỗi 5 lần né liên tiếp => +thưởng (BR-15)
    combo_bonus: 5                # điểm thưởng mỗi combo (BR-15)
    palettes:
      - key: pal_morning
        level: 1
        bg_top: "#FDF1DC"
        bg_bottom: "#FFD6A5"
        grass: "#8FCA7B"
        lane_color: "#EAF2E0"
        primary: "#4A7C59"
        accent: "#E2725B"
      - key: pal_sunset
        level: 2
        bg_top: "#FFD8A8"
        bg_bottom: "#F79D65"
        grass: "#6FA86B"
        lane_color: "#F6E3C5"
        primary: "#8A4226"
        accent: "#5D6BA6"
      - key: pal_night
        level: 3
        bg_top: "#2E3A59"
        bg_bottom: "#151E3B"
        grass: "#3E6B4F"
        lane_color: "#C7D6E5"
        primary: "#E3E9FF"
        accent: "#FFB454"
    difficulty:
      start_speed: 120            # tốc độ ong BAN ĐẦU — thấp trong 10s đầu (BR-17)
      speed_increase_per_sec: 8   # px/s tăng mỗi giây sau giai đoạn khởi đầu
      spawn_increase: 0.03        # mật độ spawn ong tăng dần mỗi giây sau 10s đầu

publisher:
  name: "ExceltApp Games"
  contact_email: "games@exceltoapp.vn"
  website: ""
```

### 1.6 Palette spec (progression.palettes — BR-14)

Mỗi palette định nghĩa **bảng màu cảnh** cho một mức level. Khi level-up (mỗi `milestone_interval` điểm) game đổi palette nền (ảnh `bg_pal_*` + màu); level ≥ số palette thì **vòng lại** theo modulo. Màu trong config là **baseline** dùng khi dựng gradient/lane; nếu có ảnh nền riêng (`bg_pal_*` trong asset manifest) thì ưu tiên ảnh, màu làm fallback đồng bộ.

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `key` | string | ✅ | định danh palette, khớp asset nền `bg_pal_<key>` nếu có (VD: `pal_morning`) |
| `level` | int | nên | level mà palette áp dụng (level 1/2/3); từ đó vòng lại theo modulo |
| `bg_top` / `bg_bottom` | color (hex) | ✅ | màu gradient nền trên/dưới của cảnh |
| `grass` | color | ✅ | màu khu vực cỏ/dưới track |
| `lane_color` | color | ✅ | màu các lane track |
| `primary` / `accent` | color | nên | màu UI/đối tượng phụ nếu đổi theo level (không bắt buộc) |

### 1.7 Score & level rule (BR-14 · BR-15 · BR-16)

Quy tắc tính điểm và level — đơn vị điểm thống nhất giữa gameplay và saved-game:

| # | Quy tắc | Công thức |
|---|---------|-----------|
| 1 | Mỗi lần **né thành công** 1 ong | `score += score.points_per_dodge` (**= 1**/lần) |
| 2 | Trụ được theo thời gian | `score += score.points_per_second` (**= 1**/s) |
| 3 | **Combo**: mỗi `combo_per` (**5**) lần né liên tiếp không chạm | `score += combo_bonus` (**+5**); popup `combo-popup`; **reset streak khi chạm ong** (BR-15) |
| 4 | **Level**: tăng theo điểm, KHÔNG reset | `level = floor(score / milestone_interval) + 1 = floor(score/10) + 1` (BR-14) |
| 5 | **Đổi cảnh/nhảy khó** khi đạt mốc level mới | dùng palette ở `floor((level-1) / N)` với N = số palette (vòng lại) + áp difficulty nhảy bậc (BR-14/17) |
| 6 | **Kỷ lục mới** | `score > best_score` (đã lưu) → popup `record-popup` **1 lần/phiên** + cập nhật `best_score` vào saved-game & `sendScore` (BR-16) |

> **Điểm tổng khi game over** = score phiên hiện tại (bao gồm cả bonus combo) — gửi `sendScore(score)`; đồng thời lưu `best_score` + `level` + `total_games_played` (xem §4).

---

## 2. ASSET MANIFEST (asset key → file → size)

Manifest là **map** sinh từ CLI `assets` (đọc file trong `assets/raw/`), dùng bởi CLI `validate` và `package`. KHÔNG lưu DB — tạo mới mỗi lần chạy.

### 2.1 Bảng manifest

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `asset_key` | string | khớp `key` trong config §1.2 |
| `file_path` | string | đường dẫn tương đối vào `assets/raw/` |
| `type` | enum `png` \| `audio` \| `json` | khớp config |
| `size_bytes` | int | dung lượng thật đo được |
| `size_kb` | number | = size_bytes / 1024 |
| `usage_scenes` | list[string] | scene dùng (đối chiếu code game) |
| `missing` | bool | `true` nếu khai báo trong config nhưng không có file trong `assets/raw/` |

### 2.2 Ràng buộc size (TRỌNG TÂM — mỗi asset phải không vượt)

| Hạng mục | Giá trị | Mức |
|----------|---------|-----|
| **File lẻ** | **< 30 MiB (target < 512 KiB)** | MUST (BR-03) |
| Tổng asset ảnh+audio (bundle load ban đầu) | target < 5 MiB | MUST |
| Tổng bundle cả game | **< 250 MiB (target < 15 MiB)** | MUST |
| **CẤM nén** | không allowed; decompression fallback OK | CẤM (BR-03) |
| Saved-game data | **< 3 MiB (target < 500 KiB)** | MUST |

> Nếu `size_kb` của asset nào vượt 512 KiB → validate đánh dấu `FAIL` cho asset đó, đề xuất giảm (resize ảnh, thấp hơn bitrate audio, loại bỏ frame thừa).

### 2.3 Ví dụ restore manifest (minh họa — không code)

| asset_key | file_path | type | size_kb | usage_scenes |
|-----------|-----------|------|---------|--------------|
| `cat_idle` | `assets/raw/cat_idle.png` | png | 78 | Gameplay, GameOver |
| `bee_wasp` | `assets/raw/bee_wasp.png` | png | 41 | Gameplay, Tutorial |
| `bg_gradient` | `assets/raw/bg_gradient.png` | png | 29 | Start, Tutorial |
| `bg_pal_morning` | `assets/raw/bg_pal_morning.png` | png | 38 | Gameplay (Level 1) |
| `bg_pal_sunset` | `assets/raw/bg_pal_sunset.png` | png | 39 | Gameplay (Level 2) |
| `bg_pal_night` | `assets/raw/bg_pal_night.png` | png | 37 | Gameplay (Level 3+) |
| `ui_icons` | `assets/raw/ui_icons.png` | png | 24 | Start, GameOver |
| `sfx_dodge` | `assets/raw/sfx_dodge.mp3` | audio | 19 | Gameplay |
| `bgm_main` | `assets/raw/bgm_main.mp3` | audio | 148 | Gameplay |

---

## 3. METADATA OUTPUT — nộp playable portal (`build/metadata/`)

Metadata là **bộ file + fields** mà CLI `package` sinh ra trong `build/metadata/`, dùng để điền form nộp lên YouTube Playables portal (thủ công M1 hoặc qua publisher pilot).

### 3.1 Bảng metadata portal

| Field | Kiểu | Bắt buộc | Ràng buộc (BR-07) |
|-------|------|----------|-------------------|
| `title` | string | ✅ | **≤ 50 ký tự**, không branding/logo |
| `short_desc` | string | ✅ | **≤ 150 ký tự**, mô tả cơ chế game |
| `genre` | list[string] | ✅ | **1–2** genre từ danh sách portal (VD: `["Hyper Casual", "Arcade"]`) |
| `publisher.name` | string | ✅ | tên publisher |
| `thumbnails["1:1"]` | file path | ✅ | ảnh 1:1 (vuông), path + px |
| `thumbnails["5:7"]` | file path | ✅ | ảnh 5:7 (dọc, mobile), path + px |
| `thumbnails["16:9"]` | file path | ✅ | ảnh 16:9 (ngang), path + px |
| `preview_video["16:9"]` | file path | ✅ | preview video 16:9, path |
| **KHÔNG branding** | — | ✅ | thumbnail/title/desc KHÔNG chứa logo/branding thương hiệu trong game |

### 3.2 Kích thước thumbnail & preview (mô tả — px khuyến nghị)

| Asset | Tỷ lệ | Khuyến nghị px | Ghi chú |
|-------|-------|----------------|---------|
| thumbnail | 1:1 | 1080×1080 | vuông |
| thumbnail | 5:7 | ~770×1078 | dọc — chỗ ưu tiên mobile/portrait |
| thumbnail | 16:9 | 1920×1080 | ngang — cover chính |
| preview video | 16:9 | H.264/MP4 1080p | ngắn ~10-30s thể hiện gameplay |

> Nguồn thumbnail/preview: dựng từ asset trong `assets/raw/` + screenshot gameplay thật (không bịa asset không có).

---

## 4. SAVED-GAME / SCORE SCHEMA (runtime trên Playables SDK)

Dữ liệu này **tồn tại trong game runtime** và được lưu/đọc qua **YouTube Playables SDK** (`saveData`/`loadData`, `sendScore`). KHÔNG phải DB; payload là JSON đối tượng duy nhất.

### 4.1 Rule bắt buộc (BỊ ràng buộc)

| Rule | Mô tả |
|------|-------|
| **Lưu** | dùng `saveData(payload)` — dữ liệu < 3 MiB (target < 500 KiB) |
| **Đọc** | dùng `loadData()` lúc khởi tạo để khôi phục score |
| **Điểm cao** | `sendScore(best_score)` để đẩy lên YouTube (BR-11) |
| **Lỗi load/save** | NẾU lỗi → dùng hoàn toàn phiên hiện tại, KHÔNG crash (BR-11) |
| **Dữ liệu tối thiểu** | chỉ lưu thông tin tóm gọn: best score + coins (nếu có); không lưu trạng thái scene/object tạm |

### 4.2 Saved-game schema (payload JSON cho `saveData`/`loadData`)

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `schema_version` | int | ✅ | version schema để migrate sau này (M1: `1`) |
| `best_score` | int | ✅ | điểm cao nhất mọi thời gian (BR-16) |
| `level` | int | nên | **level cao nhất đã đạt** = `floor(best_score/…)`+1; dùng khôi phục nhanh màn mở đầu + giữ cảnh (BR-14) |
| `streak` | int | nên | **streak ổn định hiện tại** (chuỗi né liên tiếp đang duy trì) để hiển thị combo khi trở lại; reset khi chạm ong (BR-15) |
| `palette_index` | int | nên | chỉ số palette nền đang dùng (0..N-1) — thuận tiện khôi phục đúng cảnh; nếu thiếu thì suy từ `level` theo modulo |
| `coins` / `currency` | int | nếu có | tiền/nội tệ nếu game có tiền (M1 MVP: có thể bỏ hoặc để `0`) |
| `total_games_played` | int | nên | tổng số lượt chơi (đo engagement) |
| `last_updated_ts` | int (epoch ms) | nên | thời điểm lưu gần nhất |
| `flags` | object | ❌ | cờ tùy ý: VD `pod_tutorial_seen`, `achievements` |

> **Kích thước cả payload tối đa:** < 3 MiB (MUST), target < 500 KiB. JSON này nhỏ → thoải mái.

### 4.3 Ví dụ payload saved-game (minh họa)

| Field | Giá trị |
|-------|--------|
| `schema_version` | 1 |
| `best_score` | 1234 |
| `level` | 124 |
| `streak` | 7 |
| `palette_index` | 0 |
| `total_games_played` | 42 |
| `flags.pod_tutorial_seen` | true |

### 4.4 Score schema (payload `sendScore`)

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `score` | int | điểm phiên hiện tại khi game over gửi lên YouTube |
| (chỉ gửi số score) | — | KHÔNG kèm metadata ad-hoc; YouTube tự map |

> Luồng: khi game over → gọi `sendScore(score)`; đồng thời cập nhật `best_score` (nếu vượt), `level`, `streak`, `palette_index` vào payload saved-game rồi `saveData()`.

### 4.5 Score & level khi kết thúc phiên (BR-14 · BR-15 · BR-16)

Tóm tắt quy tắc điểm (chi tiết tại §1.7) áp dụng khi lưu/gửi:

| # | Field được lưu | Nguồn / công thức |
|---|----------------|-------------------|
| 1 | `score` (gửi `sendScore`) | điểm phiên = tổng `points_per_dodge`(1/cú né) + `points_per_second`(1/s) + `combo_bonus`(+5 mỗi 5 né liên tiếp) |
| 2 | `best_score` | `max(best_score cũ, score phiên)` nếu vượt → popup `record-popup` 1 lần/phiên (BR-16) |
| 3 | `level` | level đạt cao nhất = `floor(score/…)+1` (với score tương ứng `best_score`) (BR-14) |
| 4 | `streak` | chuỗi né liên tiếp hiện tại; **reset về 0 khi chạm ong** (BR-15) |
| 5 | `palette_index` | chỉ số palette đang dùng theo `level` → vòng lại qua 3 palette (BR-14) |
| 6 | `total_games_played` | tăng 1 mỗi lượt chơi (đo engagement) |

> Dữ liệu lưu luôn **nhỏ** (chỉ vài field số nguyên) → thỏa giới hạn **< 3 MiB (target < 500 KiB)**.

---

## 5. BUILD VALIDATION REPORT SCHEMA (CLI `validate`)

CLI `validate` chạy trên `build/` hoặc `assets/raw/` + config, trả ra **một đối tượng JSON report** (KHÔNG DB). Kết quả tổng: **PASS khi tất cả MUST check pass**, ngược lại FAIL (chặn đóng gói).

### 5.1 Cấu trúc report (bảng)

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `game_name` | string | game đang validate |
| `validated_at` | ISO8601 | thời điểm chạy |
| `version` | string | version build |
| `overall` | enum `PASS` \| `FAIL` | PASS khi mọi MUST pass |
| `checks` | list[check] | từng mục check — xem §5.2 |

### 5.2 Mỗi mục check

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `id` | string | tên check (dòng 5.3) |
| `level` | enum `MUST` \| `WARN` | MUST fail → không package; WARN → cảnh báo |
| `status` | enum `pass` \| `fail` \| `warn` | kết quả |
| `value` | number \| string \| bool | giá trị đo được |
| `limit` | string | giới hạn target (VD: "< 5 MiB") |
| `message` | string | ghi chú ngắn nếu fail |

### 5.3 Danh sách check (ngưỡng — từ SPEC §5 / BR-03)

| id | Nội dung | level | Ngưỡng / Giá trị cần |
|----|----------|-------|----------------------|
| `bundle_initial` | bundle trước `gameReady` | MUST | **< 30 MiB, target < 5 MiB** |
| `file_individual` | file lẻ | MUST | **< 30 MiB, target < 512 KiB** |
| `bundle_total` | tổng bundle | MUST | **< 250 MiB (target < 15 MiB)** |
| `load_time` | load → tương tác | MUST | **< 5 giây** |
| `save_size` | saved-game data | MUST | **< 3 MiB, target < 500 KiB** |
| `no_compression` | cấm nén | MUST | KHÔNG bị nén; decompression fallback OK |
| `no_external_network` | cấm gọi mạng ngoài | MUST | không analytics/multiplayer/payment server |
| `responsive` | mọi aspect ratio, co theo viewport, giữ state khi resize | MUST | không khóa orientation |
| `pause_mute` | obey pause/mute/resume ngay lập tức | MUST | `onPause`/`onResume`/`onAudioEnabledChange` đúng |

> Thêm (không phải size): `input_touch_mouse` (MUST), `target_audience_13plus` (MUST), `no_self_monetize` (MUST — chỉ dùng YouTube SDK).

---

## 6. Ràng buộc & quyết định thiết kế dữ liệu (tóm tắt)

| Quyết định | Lý do |
|-----------|-------|
| Không dùng DB — mọi dữ liệu là file/config/JSON | pipeline nhẹ, deploy game thuần tĩnh, tuân thủ "cấm gọi mạng ngoài" của Playables |
| `games/cuu-meo.yaml` là nguồn sự thật duy nhất (BR-13) | asset + metadata luôn nhất quán, dễ nhân rộng M2 |
| Metadata KHÔNG branding/logo, title ≤50, desc ≤150 (BR-07) | tiêu chuẩn nộp portal, tránh reject |
| Saved-game chỉ lưu tóm gọn (best_score, coins) | thỏa giới hạn <3MiB và không phình bundle thời gian chạy |
| Progression là dữ liệu thuần (config block `progression:` + palette) | level/combo/khó đổi cảnh đều suy từ config — không code cứng, dễ nhân rộng + tune retention |
| ≥3 palette nền & đổi cảnh theo level (vòng lại) | BR-14 giữ chân: cảm giác mới liên tục, không nhàm; ảnh nhỏ <512KB mỗi cái |
| Score rule thống nhất 1 nơi (§1.7/§4.5) | +1/ne + combo +5 + level=floor(score/10)+1 — nhất quán giữa gameplay và saved-game |
| Validate bắt buộc PASS mọi MUST trước khi package | chặn nộp build vi phạm ràng buộc Playables (size/nén/mạng/responsive/pause) |
| `flag_movie` tách riêng khỏi build chính thức | cho phép test animation/cinematic không ảnh hưởng build nộp |

---

*FILE NÀY = ĐẶC TẢ DỮ LIỆU LOGIC cho M1. Không phải schema DB; không tạo bảng/migration. Pipeline Python đọc/ghi theo schema trên. Xem thêm `SPEC.md` (nguồn sự thật module M1).*