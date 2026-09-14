# GÓI NGỮ CẢNH B3a — render vòng chơi: Boot · Title · Play + animation mở bung từng lớp

> Batch phủ PC-05/PC-09 (BATCH-PLAN.md:25). Mốc verify: **M1 — game chơi được** (BATCH-PLAN.md:14).
> Mọi số dưới đây TRÍCH từ `specs/1-paper-crease/DESIGN-SPEC.md` (DS) / `SPEC.md` / `DATA-MODEL.md` (DM) — kèm số dòng. CẤM tự đổi số.

## 0. Stack đã cài (số thật, đừng đoán)
- `game/package.json`: **phaser ^4.2.1** (lưu ý: tài liệu cũ nói "Phaser 3" — theo package.json), vite ^5.4, typescript ^5.5 strict (`noUnusedLocals`+`noUnusedParameters` — biến thừa là LỖI), vitest ^2.
- `src/main.ts` hiện là placeholder Composition Root. `src/render/`, `src/ui/`, `src/platform/` **chưa tồn tại file nào** — B3a tạo phần render của mình.

## 1. File ĐƯỢC PHÉP tạo/sửa (tạo file khác ⇒ BÁO TRƯỚC, không lén thêm)
| File | Pattern (STRUCTURE.md:45-55) | Trách nhiệm |
|---|---|---|
| `src/render/scenes/BootScene.ts` | MVC mỏng (view) | loading screen (logo + tiến trình mảnh, KHÔNG màn hình trắng — SPEC:246), prefill TESTIDS canvas |
| `src/render/scenes/TitleScene.ts` | view | §4.2 Title — xem mục 4 |
| `src/render/scenes/PlayScene.ts` | view | §4.1 Play — xem mục 4 |
| `src/render/components/SheetView.ts` | view | tờ giấy 480×480 + lỗ + nếp (DS:62-64) |
| `src/render/components/OptionCard.ts` | view | ô đáp án 240×240 (DS:65) |
| `src/render/components/StarRow.ts` | view | cụm sao 48px (DS:66) |
| `src/render/components/InkBadge.ts` | view | huy hiệu ⌀64 Mực (DS:56) |
| `src/render/theme/paperTheme.ts` | **Registry** | theme giấy theo chương — dữ liệu, thêm chương = thêm dòng (STRUCTURE:55) |
| `src/render/anim/unfoldPlan.ts` | pure view-model (Hermes chốt thêm, ngoài STRUCTURE — KHÔNG import Phaser) | lịch mở bung từng lớp: `unfoldPlan(layers:number) -> {layerDelayMs, layerDurMs, holeStaggerMs, totalMs}[]` từ hằng số DS:120-121 |
| `src/ui/testids.ts` | registry (tiền lệ M10: `/data/youtube-playables/M10-BanhMi-Master/game/src/ui/testids.ts`) | `registerTestid(id,x,y,w,h)` + `markCanvas()` gắn `data-testid="game-canvas"` + export `window.__pcTestids` — QA click bằng rect |
| `src/main.ts` | composition root | CHỈ thêm dòng đăng ký scene + chọn adapter qua `platform/index` (B2). 0 luật. |
| `game/tests/logic/view-b3a-*.test.ts` | vitest thuần node | test cho `unfoldPlan.ts` + `paperTheme.ts` + `ui/testids.ts` (3 file này cấm import phaser ⇒ chạy được trong `npm run test:logic`) |

CẤM sửa: `src/logic/**`, `src/platform/**`, `docs/**`, `specs/**`, `package.json` (cấm `npm install`), `vite.config.ts`.

## 2. Palette + chữ (nguyên văn DS §1 — dòng nguồn)
| Token | Giá trị | Dùng | Contrast đã đo |
|---|---|---|---|
| primary | `#1F6FEB` (DS:19) | nút chính, viền ô đang chọn, HUD | trắng/nền = 4,63:1 ✅ |
| primary.dark | `#1554B8` (DS:20) | viền dưới nút, pressed | 7,02:1 |
| primary.grad | `#1F6FEB → #4C8DF5` (DS:21) | hover nút chính | — |
| accent | `#F5B301` (DS:22) | sao, particle, streak | CẤM chữ nhỏ, chỉ fill lớn |
| bg.top | `#FFF7E8` (DS:23) | đỉnh gradient nền | chữ mực 12,1:1 |
| bg.bottom | `#EADFC4` (DS:24) | đáy gradient + vignette α≤0.12 | 9,73:1 |
| paper | `#FFFFFF` (DS:25) | mặt tờ giấy | — |
| ink | `#17324D` (DS:26) | lỗ đục + nét nếp | trên giấy 13,13:1 |
| crease | `#9FB3C8` (DS:27) | đường nếp 2px | trang trí thuần |

- success `#2ECC71` (2,1:1) + danger `#E74C3C` (3,82:1): CHỈ fill lớn + icon, không chữ nhỏ (DS:29).
- Chữ tương tác ≥18px (`type.small`); title `type.display` 44px — KHÔNG tự thêm cỡ (DS:99, DS:150). Toàn bộ `type.*/sp.*/radius.*/dur.*` lấy từ DESIGN-SYSTEM tầng 1, cấm định nghĩa lại (DS:13).
- Camera base **1920×1080, Scale.FIT + letterbox/pillarbox**, không khoá orientation (DS:35). Playfield = **cột dọc 720px** giữa, 2 bên nền giấy + vignette (DS:36) — QA không tính 2 bên trống là lỗi. Safe area ≥16px, chạm ≥44×44 (DS:37). Tỷ lệ phải sống: 9:16 · 3:4 · 1:1 · 4:3 · 16:9 · 21:9 · 32:9 (DS:38).
- ⚠️ Đã chốt: y trong mockup DS:76-91 là hệ trục **dọc** (tới 1420), không khớp camera ngang 1080 ⇒ scene dựng layout theo TỈ LỆ cột 720 × chiều cao camera, giữ đúng thứ tự HUD→sheet→banner→2×2 ô→hàng nút→hint; KHÔNG copy pixel tuyệt đối.

## 3. Component số thật (DS §3)
- PrimaryButton **280×72**, radius.lg, fill `primary.grad`, viền dưới `primary.dark` 6px (DS:54) — nút PLAY/UNFOLD.
- btn-ghost: "Peek a fold" / "Undo (watch video)" / retry — KHÔNG gạch chân chữ (DS:55).
- Sheet **480×480**, `paper`, radius 6, shadow.char, gloss chéo α0.5, viền dưới `#E6E2D8` (DS:62).
- Punch hole **⌀36** `ink`; lỗ TRÊN nếp ⇒ vẽ nửa lỗ mỗi lớp, 2 lớp trùng khít — đây là chữ ký D1, không được làm tròn thành 1 lỗ nguyên (DS:64).
- Option card **240×240**, surface, border 4px `#EADFC4`, radius 20 (DS:65); đúng ⇒ border `success`+glow+2 vòng particle `accent`, 3 ô kia alpha **0.45** (DS:94); đang chạm ⇒ border `primary` + scale 1.03 (DS:95).
- Sao 48px, fill `accent` viền `#8A5A2B` 3px; chưa đạt = viền rỗng `#C9BFA6` — phân biệt bằng HÌNH DẠNG đặc/rỗng, không chỉ màu (DS:66, DS:149).

## 4. Màn + trạng thái phải dựng
**Boot**: loading có tiến trình mảnh, ≤3s, 0 lỗi console (E2E PC-B-01/05). Không white flash quá 1 khung hình (PC-B-04).
**Title** (DS:99): sheet gấp lớn 560×560 thở nhẹ + chữ "Paper Crease" + PrimaryButton `testid-title-play` (label qua i18n: "PLAY" hoặc "Continue — Level {n}" khi có save) + btn-ghost `testid-title-shop` (scene đích Map/Shop do B3b — B3a chỉ navigation stub `scene.start`). 0 popup, 0 xin quyền.
**Play** (DS:73-96; testid SPEC:118-133): HUD (`testid-hud-level` "MÀN n/120" · `testid-hud-stars` · `testid-hud-ink` · `testid-btn-sound` · `testid-btn-menu`) → `testid-sheet-folded` + `testid-sheet-hole` → `testid-feedback-wrong` (bannerTutorialBanner chỉ hiện khi sai) → 2×2 `testid-option-0..3` → hàng nút `testid-btn-hint` + `testid-btn-undo` → `testid-hint-breath`. Kết quả trong cùng scene: `testid-unfold-anim`, `testid-btn-retry`, `testid-btn-undo-ad`.
**Máy trạng thái ở logic, scene chỉ render** (SPEC §7:244-256):
- `ready`: 4 ô bấm được. Đúng 1 lượt/màn (PC-05).
- `Đang mở bung`: 4 ô disabled alpha 0.6 nhưng **vẫn buffer input**, không mất lượt, không register 2 lượt (DS:96, SPEC:248, E2E PC-L-05).
- `Đúng`: ô đúng success, sao sáng `testid-hud-stars`, tờ màn kế **đã gấp sẵn**, 1 nút UNFOLD — CẤM có win screen (PC-09); màn kế sinh sẵn trong lúc animate (TC-SES-04, DM:375 target ≤250ms).
- `Sai`: micro-shake ≤4px + animate giải thích + banner copy + 2 nút. Hết lượt undo ⇒ **ẩn hẳn** `testid-btn-undo` (SPEC:251). Ad không load ⇒ ẩn nút ad, không chặn, không báo đỏ (SPEC:253).
- Timer: chỉ đọc cờ `LevelSpec.timerOn` + `timer_sec` từ config (chương 7+, bật ở màn 8 — SPEC:233); đồng hồ đếm + game over do `levelState` tính — scene chỉ vẽ. Mất focus ⇒ dừng timer+nhạc+animate, resume đúng frame — nối `platform.lifecycle` (SPEC:254, PC-17), CẢ resolve qua lifecycle, không tự bắt `window` rải rác.
- Master mode (PC-18): Play nhận cờ "không hint/không timer" từ logic ⇒ ẩn `testid-btn-hint` — E2E PC-G-02 (B3b) nghiệm thu.
- Bàn phím cho QA: 1-4 chọn, Enter mở, Esc menu + focus ring trắng 3px (DS:151).

## 5. Animation B3a (số từ DS §5 — không đổi)
| Anim | Thông số | Dòng |
|---|---|---|
| **Mở bung từng lớp (D1)** | mỗi lớp **140ms ease-out**, so le **110ms** ⇒ 4 lớp ≈0,7s · 8 lớp ≈0,9s; lớp ngoài cùng mở trước, lỗ hiện dần theo lớp | DS:120 |
| Lỗ hiện ra | scale 0→1 `dur.pop` (250ms), so le **60ms** giữa các lỗ | DS:121 |
| Giải thích khi SAI | vệt sáng dọc nếp **500ms** + 2 lỗ trùng khít đè (blend) + TutorialBanner; **cấm rút ngắn dưới 700ms tổng** | DS:122 |
| Màn kế đã gấp | trượt lên `dur.slow` (400ms) | DS:123 |
| Nếp "thở" (`testid-hint-breath`) | scale 1,00→1,02, **1,2s yoyo, lặp ĐÚNG 2 nhịp**, chỉ khi idle ≥5s VÀ chỉ màn dạy luật | DS:124 |
| Sao đạt | `dur.pop` 1→1,15→1 + particle `accent` | DS:125 |
| Chạm ô | scale 0,96 `dur.fast` — phản hồi thị giác ≤150ms (E2E PC-U-06) | DS:126 |
| Rung khi sai | micro-shake ≤4px `dur.slow` | DS:127 |

KHÔNG ghi save trong lúc animate mở bung (DM:358).

## 6. `data-testid` thuộc B3a — 20 tên (DESIGN-SPEC §4:76-99 + SPEC:118-133,139-141)
`testid-title-play` · `testid-title-shop` · `testid-hud-level` · `testid-hud-stars` · `testid-hud-ink` · `testid-btn-sound` · `testid-btn-menu` · `testid-sheet-folded` · `testid-sheet-hole` · `testid-hint-breath` · `testid-option-0` · `testid-option-1` · `testid-option-2` · `testid-option-3` · `testid-btn-hint` · `testid-btn-undo` · `testid-unfold-anim` · `testid-feedback-wrong` · `testid-btn-retry` · `testid-btn-undo-ad`
Quy ước: mỗi element gọi `registerTestid()` khi dựng + cập nhật rect sau tween/resize. Thiếu bất kỳ tên nào ⇒ reviewer FAIL. 14 tên còn lại (map/scorecard/shop/album/settings/end) thuộc B3b — `harness/packs/b3b.md` §6.

## 7. Hợp đồng dữ liệu — scene CHỈ ĐỌC từ logic (không tự tính)
Ký hiệu thật phải ĐỌC từ file tại thời điểm bắt đầu B3a; tên dưới là hợp đồng dự kiến (STRUCTURE:43-55, types.ts:30-42):
- **ĐÃ CÓ (B1a xanh)**: `generator.ts`: `levelSpec(seed, levelIndex, cfg) -> LevelSpec` (generator.ts:467), `levelConfigFor(chapters, levelIndex)` (:589), `shareCode` (:506). `types.ts`: `LevelSpec { seed, levelIndex, chapter, folds, action, answerHoles, options: Option[], correctIndex, difficulty, timerOn }`. `validator.ts`: `validateSpec` — KHÔNG chạy trong scene, chỉ trong test.
- **PHẢI CÓ trước khi B3a code (B1b)**: `levelState.ts` — máy trạng thái màn (loading→ready→answered→correct/wrong→next; API dispatch/subscribe) + `progression.ts` (chương/sao/mở khoá).
- **PHẢI CÓ (B1c)**: `i18n.ts` — `t(key, params?)`, mọi chuỗi hiển thị ĐI QUA `t()`, file `i18n/en.json` phủ key (TEST-CASES TC-I18-02); `save.ts`/`records.ts`/`economy.ts` cho HUD sao/mực.
- **PHẢI CÓ (B2)**: `platform/index` — `PlatformAdapter { storage, ads, lifecycle }` + Null Object + debug hooks `?level/?seed/?ad=mock`.
- **Luật chặn mềm**: scene CẤM so `chosenIndex === spec.correctIndex`, cấm tính số lỗ, cấm suy sao — mọi phán quyết lấy từ `levelState`. Nếu file B1b/B1c/B2 chưa tồn tại ⇒ BÁO blocked, KHÔNG tự viết tạm logic.

## 8. Lệnh build / cổng (chỉ dùng lệnh này)
```
cd /data/youtube-playables/M11-Gap/game
npm run gate          # = typecheck + test:logic + node tools/gate-smell.mjs — chạy ĐÚNG 1 LẦN cuối phiên
npm run build         # tsc --noEmit && vite build — 1 lần; dán tail output
npm run build:standalone && npx vite preview  # boot 0 lỗi console (chuẩn B2/PC-B-01)
grep -rnE "fetch\(|XMLHttpRequest|WebSocket|sendBeacon" src/render src/ui   # ⇒ RỖNG (PC-15)
grep -rn "correctIndex" src/render            # ⇒ chỉ đọc để hiển, KHÔNG có phép so sánh ra đúng/sai trong scene
```
- gate-smell chỉ quét `src/logic` ⇒ file render giữ ≤250 dòng/file là chuẩn mềm; scene phình = FAIL A2.
- Bundle <5MB, 0 network (STRUCTURE:77). CẤM build:playgama/ytgame (B5).

## 9. Bẫy đã biết (đo bằng E2E nhóm B/O/L — bắt buộc đọc E2E-TESTS.md:19-53)
- B-01: title ≤3s + 0 console error. O-01: **1 click** từ title vào chơi với 4 ô bấm được. O-03: hint "thở" ĐÚNG 1 lần, không lặp. O-05/L-02: không win screen. L-01: animate từng lớp, không "bập" ra kết quả. L-03: sai ⇒ giải thích bằng hình + 2 nút. L-04: retry về CÙNG đề (seed), sao tối đa 2. L-05: bấm giữa animate ⇒ buffer. L-08: hint 1 lần/màn, lần 2 disabled. U-05: không vùng "ảo giác nút" — rect registered = hit area thật ≥44px.
- Text: mọi chuỗi qua `t()`, EN mặc định (PC-19); copy nộp đúng SPEC:149-151 ("PLAY", "Continue — Level N", "UNFOLD", "Peek a fold", "Undo (watch video)", "Right on the crease — that punch only makes 2 holes."). 0 chuỗi tiếng Việt hardcode trên UI.
