# Slice Studio — DESIGN-SPEC (art pipeline · audio · polish)

**Stage:** 2-slice-studio. Freeze logic theo SPEC.md §0. Kênh đích Playgama — mọi mục dưới đây phải phục vụ compliance (full-screen mobile, 0 system player, desktop one-hand, ≤300MB) — chi tiết kiểm chứng ở E2E-TESTS.md.

---

## 1. NGUYÊN TẮC ART (án lệ factory + án lệ M3)

1. **Programmatic-first:** mọi asset dựng từ `@game/core` tokens / Graphics trước; sprite gen chỉ khi phẳng và lặp lại nhiều lần. Proto đã đủ chơi-vui bằng Graphics — art nâng CẢM GIÁC, không đụng logic (freeze §0).
2. **WAN 2.7 chỉ khi token-able:** silhouette có thể gen texture (nửa táo, đồng hồ, quả cầu...); core reveal (star/circle/heart) giữ vector — reveal phải sắc cạnh ở mọi scale.
3. **0 nạp động:** không load font ngoài, không load ảnh runtime — mọi sprite gói atlas lúc build. (Compliance: tên file Latin — schema tên mục 3.)
4. **UI in-game 100% EN** (PB-5) — copy mục 6.

## 2. ART DIRECTION — 4 CHƯƠNG 4 CHÂN DUNG

Palette logic giữ nguyên data (THEMES levels.ts freeze — chỉ swap giá trị hex qua config S1, không đổi interface `Theme`):

| Chương | Level | Mood | Palette (bg → accent) | Silhouette chủ đề | Material cảm giác |
|---|---|---|---|---|---|
| 1 | L1–2 | Fresh start | navy #0f172a → sky #38bdf8 | giao cụm hình cơ bản (blob) | cắt mượt, hạt sao nhỏ |
| 2 | L3–5 | Secret garden | tím #1f1033 → lavender #c084fc | táo / đồng hồ / quả cầu | reveal chime + sparkle vàng |
| 3 | L6–9 | Steady hand | xanh lá #0d2818 → mint #4ade80 | hình cong lớn (mặt trăng, sóng) | vệt lượn + hạt theo vận tốc |
| 4 | L10–12 | Danger studio | đỏ #22090c → cam #fb923c | hình lớn + lõi cuối | chunk-lost: vụn đỏ; skip clean: dải sáng né đỏ |

- **Silhouette:** ellipse giữ làm hit-shape logic (freeze); art có thể vẽ CHI TIẾT trong ellipse (mép gồ ghề ±12px render-only — không đổi hit-shape, không đổi shape trong engine). Lệch ≤5% giữa mask art và hit-shape là kill-condition của parent t_e3f3bb6d — config S1 phải nêu cách đo (so mask-art vs ellipse bằng polygon-overlap trong TEST — không code game, là test đọc config).
- **Core reveal:** star/circle/heart vector sắc, scale từ 0→1 elastic <300ms sau khi tách — cùng beat âm chime (S3).
- **Nửa hình tách đôi:** proto dịch 2 nửa lùi 2 phía + fade; production: giữ hướng dịch, thêm rotation nhẹ (≤4°) + hạt dọc vết cắt — không đổi `bakeHalves` signature (fx.ts — tầng B, được phép thêm param optional KHÔNG đổi chữ ký cũ).

## 3. ART PIPELINE (quy trình tạo/bỏ asset vào game)

```
concept per chapter (bảng §2) → gen WAN nếu silhouette cần texture
→ gen_sprites (scripts/tools gen_sprites THAM SỐ HÓA — 1 lệnh mọi game)
→ atlas per chapter (4 atlas, ≤1 mỗi chương, tên Latin: atlas-m1.png … atlas-m4.png)
→ theme config S1 (src/config/theme-config.ts — NHẬN giá trị hex đã dữ từ THEMES, không tự đổi)
→ verify asset manifest (rào 4 của verify_game.sh) + boot check
```

- **Tên file/chỉ Latin** (compliance): `atlas-m1.png`, `slice-logo.png`, `star-icon.png`… regex kiểm ở E2E-TESTS.md C-6.
- **Atlas:** mọi sprite nằm atlas, KHÔNG load rời (ROLE-RULES fe-dev perf). Kích thước atlas ≤2048×2048.
- **Bundle ≤300MB đích Playgama hiện tại ~386KB build proto** — art được tiêu tối đa ~8MB (dư địa cho 4 atlas + logo) — vẫn xa dưới 300MB.
- **Config theme S1** — `src/config/theme-config.ts`: mọi hex/particle/alpha vào đây; scene KHÔNG hardcode màu mới. Freeze files không đụng.

## 4. AUDIO DESIGN (S3)

**Nguyên tắc giữ nguyên:** WebAudio synth thuần (proto), 0 file audio → 0 system player ở mọi browser (compliance) + 0 chờ tải.

**Voice inventory (production):**

| Voice | Khi nào | Thiết kế | Đúng pillar |
|---|---|---|---|
| slice whoosh+snap | pointerup + score commit | giữ proto (noise bandpass 4.2k→700 + tri 300+pct×2) | 1 — cú cắt thỏa mãn |
| reveal chime | core reveal | giữ proto 660/880/1320Hz | 2 — bí mật lộ |
| ghost signature | streak GHOST CUT | giữ proto 1760/2340Hz + air noise | 2 — danh hiệu |
| chunk buzz | chạm vùng đỏ | giàu hơn proto: buzz 2 lớp + thud thấp | 3 — tiếc của có trọng lượng |
| strum tách đôi | nửa hình rời nhau | MỚI: strum 4 nốt theo pct (cao = chính xác) | 1 |
| resume cue | vào `mid` sau khi nhả mép đỏ | MỚI: ping nhẹ 880Hz 2 lần | 3 — dạy nhả–tiếp không chữ |
| ambience per chapter | loop nhẹ theo palette chương | MỚI: pad sine 2 osc, gain rất thấp (0.04) | mood chương |

- **Config audio:** `src/config/audio-config.ts` — mọi gain/freq/dur vào config; scene chỉ gọi method. Synth API chỉ THÊM method (`slice/reveal/ghost/chunkLost` giữ nguyên chữ ký).
- **Unlock policy:** tạo/resume AudioContext trong pointerdown đầu tiên (mục 3.6 SPEC).
- **Mute:** nút mute HUD 1 chạm (giữ proto state `muted`).
- **[PLACEHOLDER]** mọi freq/gain/dur mới là placeholder tới playtest: duyệt = boss tay + smoke bot "âm phát ra" (S6).

## 5. UX / HUD POLISH (S5)

- **HUD đọc được khi đang gấp (trục 1 ux-ui game):** % hiện to giữa-màn-sau-cắt, ≤0.3s liếc hiểu; streak chip góc trên; ngưỡng sao hiển thị dạng 3 vạch mờ trên path (người chơi thấy mình đang vượt vạch nào khi kéo).
- **Popup có nút đóng (compliance):** mọi popup (End, retry hint, mute confirm nếu có) có X hoặc nút đóng rõ; không popup bẫy.
- **Popup End:** tổng sao (x/36), streak max, nút "PLAY AGAIN" + "REPLAY LEVEL" — 1 tay chạm được (thumb-reach bottom 40%).
- **Copy EN ≤3 từ** ("NICE CUT", "GHOST CUT!", "CHUNK LOST", "KEEP GOING", "LEVEL 7/12", "NEXT"...) — copywriter-vn ROLE-RULES.
- **Progression visible (trục 4):** level counter luôn thấy (7/12), palette chương đổi = thấy "lên chương" bằng mắt.
- **Mobile:** nút ≥44px, thumb-reach, text ≥24px canvas 720. **Desktop:** playable bằng chuột (di chuyển + giữ trái) VÀ phím/một tay: Space giữ = vẽ auto theo path? — KHÔNG: verb là trace, desktop chỉ đổi input device: chuột giữ kéo = cùng verb; phím tắt Enter/Space = confirm popup (đúng "điều khiển mặc định bằng bàn phím hoặc chuột" — trace bằng chuột là chính).
- **0 scrollbar hệ thống** (compliance): `overflow:hidden` giữ nguyên từ proto index.html; scroll nội dung (nếu có list) là scroll trong canvas (End screen score list nếu thêm — scroll tay trong game, không phải scrollbar DOM).
- **Active field ≤1:2 aspect, sát mép:** canvas FIT 720×1280 = 9:16 ≤1:2 — desktop window dài → letterbox, visual không biến dạng (Scale.FIT giữ nguyên).

## 5bis. COMPLIANCE THIẾT KẾ TỪ ĐẦU (liên kết E2E-TESTS.md)

- Progress save qua SDK storage → xoay thiết bị/process bị kill không mất slice state/score/unlocked level (điểm A compliance).
- Full-screen mobile: index.html giữ `viewport-fit=cover` + full-screen button optional (S5) — không khai orientation lock, cả 2 orientation chơi được, visual FIT không biến dạng.
- 0 analytics, 0 URL-lock, 0 network ngoài SDK, Latin filenames, index.html gốc archive — thiết kế chặn từ nguồn; test chứng minh ở E2E-TESTS.md C-1…C-8.

## 6. TUNING LEVERS TỔNG (điểm hẹn chỉnh số sau playtest)

| Lever | Nơi sống | Giá trị hiện | Ghi chú |
|---|---|---| vitest 22/22 |
| START_RADIUS / MAGNET_RADIUS | engine.ts (freeze) | 90 / 48 | muốn đổi = boss gật + retierA |
| thresholds per level | levels.ts data | 55/75/90 (M2 95) | data, retune tự do sau playtest |
| wobbleWeight L6–9 | levels.ts data | 1.5→2 | data |
| no-go [from,to] | levels.ts data | (40,48)…(46,56) | data, validate chặn đầu/cuối |
| tolerance/samples/… | slice.ts DEFAULTS (freeze) | 26/96/5/18/56 | freeze |
| gain/freq audio | audio-config.ts (S3 mới) | placeholder | playtest chốt |
| hex palette/particle | theme-config.ts (S1 mới) | giá trị THEMES hiện | playtest chốt |
| GHOST_PCT | scoring.ts (freeze) | 95 | freeze |

## 6bis. RANH GIỚI FILE (contract tóm tắt — chi tiết DATA-MODEL.md §4)

- Freeze tuyệt đối: `geom/path.ts`, `geom/slice.ts`, `core/scoring.ts`, `core/engine.ts`, `__tests__/tierA.test.ts`.
- Được sửa: `scenes/*`, `render/fx.ts`, `ui/hud.ts`, `audio/synth.ts` (chỉ thêm), `level/levels.ts` (chỉ thêm field hiển thị, KHÔNG đổi path/shape/noGo/thresholds), `main.ts` (chỉ SDK bootstrap), config mới `src/config/`.
- Được THÊM: `sdk/` glue file mới (S4), config mới, atlas mới.
- Cấm: split polygon thật, đổi verb, network ngoài SDK, ads/IAP, analytics, URL-lock.
