# M10 Banh Mi Master — DESIGN-SPEC (art production, không prototype)
> Nguồn: SPEC.md v1 + DATA-MODEL.md. **Tham chiếu `docs/DESIGN-SYSTEM.md`** — file này CHỈ ghi art-theme per-game + bố cục màn cụ thể + danh mục asset. Token chung (typography/spacing/radius/shadow/motion/z-layer/component core §3) dùng Y HỆN design-system, CẤM tự bịa.
> Luật boss 08/09: **assets production do supervisor (Hermes) gen bằng WAN 2.7 TRƯỚC khi giao code** — CẤM coding agent vẽ art; Claude chỉ tích hợp theo manifest sha256.

## 1. ART-THEME (override hợp lệ per-game theo DESIGN-SYSTEM §1.0)
- **Không khí:** đường phố Việt 6h sáng — nắng vàng mật ong xiên chéo, hơi nước nồi nước dùng xa xa, xe đẩy gỗ + bạt xanh dương, vài chiếc ghế đẩu nhựa đỏ, dây đèn lồng nhỏ. Ấm, đông vui, sạch sẽ (premium casual — không bụi bặm hiện thực).
- `color.primary` (game này) = `#E85D26` (cam-đỏ tương ớt) — nút SERVE, điểm nhấn; `color.accent` = `#2A9D8F` (xanh ngọc bạt quầy). Semantic success/danger/warning GIỮ nguyên design-system.
- `color.bg.top` = `#FFE8B0` (nắng sớm) → `color.bg.bottom` = `#F4A261` (phố ấm).
- Khách: cartoon Việt đa dạng tuổi (học sinh áo trắng khăn quàng, bà cụ áo nâu, dân văn phòng sơ mi, VIP vest + đồng hồ vàng, sinh viên balo, công nhân áo xanh…). Mỗi persona 1 sprite, biểu cảm 3 trạng thái (chờ vui / giận / cười cảm ơn).
- Nguyên liệu: **candy volumetric** (DESIGN-SYSTEM §4.1) — pâté bóng mềm, ớt đỏ mọng, ngò tươi giọt nước; viền đậm 3px `#3A2E39` để tách lớp khi stack.

## 2. CAMERA & LAYOUT (720×1280 logic, Scale.FIT)
```
┌─────────────────────────────┐ y=0
│ 💰 120   ⭐⭐⭐⭐⭐☆☆☆   💢○○ │ HUD (h=88)
│  [nền phố + xe đẩy]         │
│        ☺ khách              │ y≈300 (khách đi vào từ phải)
│      ╭─────────╮            │
│      │ 🥖pâté  │ bong bóng  │ ORDER FLASH: stack mini dưới→trên
│      │ 🍖thịt  │ order      │ + đồng hồ vòng tròn mép bong bóng
│      │ 🥒dưa   │ (4.5s)     │
│      ╰─────────╯            │
│    ┌───────────┐            │
│    │  ▓▓▓▓▓▓▓  │ nắp bánh  │ y≈780
│    │  ░ ngò ░  │            │ STACK ZONE: ổ bánh giữa màn
│    │  ░ thịt ░ │            │ layer bay lên từ khay, snap
│    │  ░ pâté ░ │            │ (mỗi layer h=44px, stack tối đa 6)
│    │  ▓▓▓▓▓▓▓  │ ổ dưới    │
│    └───────────┘            │
│ ┌────┬────┬────┬────┐       │ y=860 KHAY 4×3
│ │pâté│mayo│ớt  │thịt│       │ ô 150×150 (chạm ≥44 ✓), icon 96px
│ ├────┼────┼────┼────┤       │ + tên EN 20px dưới icon
│ │gà  │chả │dưa │chua│       │
│ ├────┼────┼────┼────┤       │
│ │ngò │ớtlát│ ... │   │       │
│ └────┴────┴────┴────┘       │
│  [UNDO 80×80] [SERVE 280×96] [HINT👁 80×80]  │ y=1160
└─────────────────────────────┘ y=1280
```
- Patience: vòng cung quanh đầu khách (r=64, stroke 10) — KHÔNG thanh chữ nhật (khác Cooking Mania về mặt hình, đúng art-direction memory-centric).
- Khi FLASH: toàn UI dưới mờ 20% (focus bong bóng); khay dimmed nhưng VẪN NHÌN THẤY (người chơi liếc trước vị trí ô — kỹ năng đọc-trước §5 SPEC).

## 3. DANH MỤC ASSET PRODUCTION (supervisor gen WAN 2.7 — 33 file)
> Kích thước px tại scale 1, PNG transparent (nền riêng JPG-look PNG). Prompt chuẩn skill `aibox-image-generation` §Sprite game; mỗi file vào `game/public/assets/`, sha256 ghi `assets/manifest.json`.

| ID | Nội dung | Size | Anim |
|---|---|---|---|
| bg_street | Nền phố sáng + xe đẩy + bạt (parallax 2 lớp: phố xa 0.3×, quầy 1×) | 720×1280 | hơi nước loop 2f |
| cust_1..8 | 8 persona (§DATA-MODEL 3), mỗi con 3 biểu cảm (wait/angry/happy) | 220×300 ×8 | idle bob 2f |
| ing_pate, ing_mayo, ing_chili | 3 sốt — lớp sóng sánh trong khay + bản đã-trải trên bánh | 96×96 / 200×36 ×3 | — |
| ing_pork, ing_chicken, ing_ham | 3 thịt | 96×96 / 200×48 ×3 | — |
| ing_cuke, ing_pickle, ing_herb, ing_chili_f | 4 rau | 96×96 / 200×40 ×4 | — |
| bread_bottom, bread_top | Ổ dưới + nắp (nắp có rạch chéo, vừng) | 280×90 / 280×110 | nắp úp squash |
| bubble_order | Bong bóng thoại (đuôi nhọn) + viền | 420×280 | pop scale |
| tray_bg | Khay gỗ 4×3 | 680×440 | — |
| fx_star, fx_coin, fx_sparkle, fx_angry | Juice: sao 3 cỡ, coin ₫/💰, tia sáng, 💢 | nhỏ | particle |
| ui_hint, ui_undo, ui_serve | Icon nút (SERVE nền cam gradient theo btn-primary design-system) | 80/80/280×96 | pulse |
| overlay_win | Bàn tiệc bánh mì + pháo giấy + hạng S/A/B khung gỗ | fullscreen | 3f |
| overlay_lose | Quầy đóng bạt, ghế úp, đèn tắt | fullscreen | — |
| title_logo | "BANH MI MASTER" chữ gỗ + ổ bánh mì hero + nắng | 600×260 | bob |

Tổng atlas/ảnh ≤ 4MB (gate TB-03). Thiếu 1 file = coding agent BÁO, không tự chế thay thế.

## 4. SCREEN-BY-SCREEN
- **Title:** logo giữa y=360, nút PLAY (btn-primary design-system, 280×96) y=760, best-tips nhỏ dưới ("BEST: 💰260"), khách persona đi bộ trang trí dưới nền.
- **Gameplay:** như §2. Thứ tự vào ca: khách đi bộ vào 600ms (walk 4f) → dừng → bong bóng pop → FLASH.
- **Scoring reveal:** nắp úp 400ms → bánh "mổ ngang" (cross-section overlay 500ms) hiện từng layer: khớp = tick xanh ✅ + chime; lệch = ❌ đỏ + rung 6px; rồi sao bay lên HUD, coin tip bay thành vòng cung về 💰.
- **WIN:** overlay hạng (S = vàng xoay tia, A = bạc, B = đồng) + tổng sao + tips + FAST! count + CHƠI LẠI.
- **LOSE:** "STALL CLOSED" + khách đã phục vụ + tips + THỬ LẠI (+ REWARDED hồi 1 strike nếu chưa dùng — 1 lần/ca).

## 5. JUICE (số để verify — DESIGN-SYSTEM §4.3)
- Tap ô khay: scale 0.9→1.06→1 140ms + sfx "pop" (WebAudio synth, 5 loại: pop/chime/coin/angry-buzz/fanfare — không file âm thanh).
- Layer đáp stack: squash 1.12×0.88 90ms + 2 fx_sparkle mép.
- Stack sai (khách #7 WAIT!): KHÔNG phạt visual khi đang lắp — chỉ reveal lúc serve (không spoil trí nhớ).
- 3 sao: confetti 24 particle + fanfare 3 nốt; combo FAST!: huy hiệu vàng bay + coin ×2 anim.
- Strike: screen shake 8px 300ms + vignette đỏ 120ms + khách giận (mắt 💢).
- Patience <30%: vòng cung nhấp nháy 1Hz + heartbeat synth trầm.
- Bong bóng FLASH tắt: co lại + bay lên thành "ký ức mờ" (ghost bubble 30% opacity) đậu góc HUD — **nhắc trực quan: đơn đã biến mất, chỉ còn trong đầu bạn** (không hiện lại nội dung — chỉ hình dạng mờ).

## 6. DATA-TESTID (cho QA browser)
`screen-title` · `btn-play` · `hud-tips` · `hud-stars` · `hud-strikes` · `customer-sprite` · `order-bubble` · `flash-timer` · `stack-zone` · `stack-layer-{i}` · `tray-slot-{ingId}` · `btn-undo` · `btn-serve` · `btn-hint` · `hint-badge` · `patience-arc` · `wait-bubble` · `scoring-reveal` · `screen-win` · `rank-badge` · `screen-lose` · `btn-retry` · `btn-rewarded-continue` · `debug-seed` (input seed khi `?debug=1`).

## 7. UX CHECKLIST (manual review gate — anh Tuyền/QA verify TRƯỚC khi trình)
- [ ] Người mới hiểu "order biến mất" trong 10s không cần chữ (khách #1 highlight từng layer)
- [ ] Mọi ô khay nhìn thấy đồng thời, không cuộn; chạm ≥44px
- [ ] Không thao tác nào cần 2 ngón / drag / giữ-chờ
- [ ] Reveal serve đọc được ngay: layer nào sai hiện đúng vị trí ❌
- [ ] HINT không ép: chỉ hiện khi người chơi chủ động bấm; badge đếm còn lại
- [ ] Ghost bubble KHÔNG tiết lộ nội dung đơn (kiểm bằng cách úp màn hình chụp lại — không đọc được gì)
- [ ] Contrast chữ trên nền phố nắng đạt 4.5:1 (DESIGN-SYSTEM §7)
- [ ] Thắng/thua rõ trong 1 ca ≤4 phút (đúng luật boss: có THẮNG có THUA)
