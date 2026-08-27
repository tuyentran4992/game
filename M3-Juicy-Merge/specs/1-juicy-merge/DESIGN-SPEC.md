# M3: DESIGN-SPEC — "Juicy Merge: Fruit Pop" (Physics-Merge · Kawaii)

> **Tầng 2 (per-module).** THAM CHIẾU `../docs/DESIGN-SYSTEM.md` (tầng 1 chung) cho token, typography, spacing, radius, shadow, motion, z-layering, component core. File này CHỈ giữ: layout màn cụ thể + art-theme override của game + bố cục các màn + data-testid. **CẤM tự bịa token/component core mới**.
> Cập nhật: 2026-08-23 · Art-theme: **TRÁI CÂY KAWAII** (pastel, viền đậm chibi).

---

## 1. DESIGN TOKENS

### 1.1 Tham chiếu & override
- **Tham chiếu toàn bộ** `color.*`, `type.*`, `sp.*`, `radius.*`, `shadow.*`, `dur.*`, `z.*` từ `docs/DESIGN-SYSTEM.md`. KHÔNG định nghĩa lại.
- **Override art-theme** (được phép theo SS §1.0 — đổi màu art thế giới, giữ semantic + contrast):
  | Token | Giá trị | Ghi chú |
  |-------|---------|---------|
  | `color.bg.top` | `#FFF8E7` (kem sáng) | nền trên — không gian ấm sữa |
  | `color.bg.bottom` | `#FFE4C4` (mơ nhạt) | nền dưới — chuyển nhẹ mondo pastel |
  | `color.primary` | `#FF6B81` (hồng dưa hấu) | nút chính, điểm nhấn merge |
  | `color.primary.dark` | `#E8556F` | viền dưới / hover |
  | `color.primary.grad` | `#FF6B81 → #FF8FA3` | gradient nút |
  | `color.accent` | `#7ED957` (xanh lá dưa) | accent phụ, nút ghost / jackpot |
  | `color.text.primary` | `#4A2C2A` | nâu socola chibi (trên surface sáng) |
- Đảm bảo contrast chữ ≥ 4.5:1 trên surface (§7 SS). Chữ trên trái cây dùng `color.text.stroke` để đọc được trên nền màu.

### 1.2 Trái cây (art-theme, vẽ trong game)
- 12 bậc trái cây, mỗi bậc = 1 sprite PNG tĩnh (không frame animation — tween/physics trong engine). Kích thước tăng dần theo bậc.
- Viền đậm (outline ~6px tối màu đồng tông) để nổi trên nền pastel + khi chồng lên nhau dễ phân biệt.
- Màu theo bậc (bảng §6): Cherry đỏ, Strawberry hồng đốm, Grape tím chùm, Dekopon cam, Pomegranate đỏ sẫm, Orange cam đậm, Apple đỏ xanh, Pear xanh vàng, Peach hồng kem, Pineapple vàng gai, Melon xanh vân, Watermelon xanh — jackpot (to nhất + glow nhẹ).

---

## 2. LAYOUT GRID & BREAKPOINTS

- **Base world:** camera **1920×1080**, Phaser `Scale.FIT` → tự co + letterbox/pillarbox theo viewport (9:16 portrait dự kiến chính, hỗ trợ rộng từ 9:32 → 32:9).
- **Thùng (bucket):** vùng chơi chính — rộng `BUCKET_W = 640` px (camera world), đặt **centered**, phía dưới 60% màn. Xem §3.3.
- **Vùng HUD:** top bar sát mép an toàn ≥ `sp.4` (16px), không dính notch.
- **Grid:** trái cây xếp theo vật lý (tự nhiên) — không grid cứng. Ghost thả theo pointer X clamp trong bucket.
- **Safe-area rule:** mọi phần tử tương tác vùng chạm ≥ 44×44px; nút ≥ 44px.

---

## 3. SCREEN-BY-SCREEN MOCKUP

### 3.1 Start (data-testid: `start-btn`)
```
┌──────────────────────────────┐
│         [Juicy text logo]      │  type.display 64px, primary.dark
│   (icon chuỗi trái: cherry→     │   sprite nhỏ row 1-4
│    →watermelon cung ngang)      │
│                                │
│         ┌─────────┐            │
│         │  Chơi   │  start-btn  │  btn-primary 320×96, type.display
│         └─────────┘            │
│   (watermelon to dưới góc)     │  sprite trang trí alpha 0.5
└──────────────────────────────┘
```
- Nền: gradient `color.bg.top→bottom`. Logo chữ có `color.text.stroke`.
- Bấm `start-btn` → Gameplay (khởi tạo scene, RNG seed mới).

### 3.2 Gameplay — HUD (data-testid: `score-label`, `best-label`, `next-fruit`, `pause`...)
```
┌──────────┬──────────────┬──────────┐
│ [score]  │   (vùng thả)  │ [best]   │  HUD top: score badge trái, best phải
│  1234    │   ▼ ghost x  │  567     │
└──────────┴──────────────┴──────────┘
   next-fruit: [🍓][🍒]        (2 trái kế tiếp, row nhỏ dưới HUD)
┌──────────────────────────────┐
│         ▲ DangerLine (vạch)   │  z.10 đường kẻ dashed danger
│          █ bucket             │  z.10 bucket (nền chứa)
│   fruit physics (rơi/merge)   │
└──────────────────────────────┘
   HUD bottom: [pause] [mute] (góc phải, nhỏ)
```
- **ScoreLabel** (component 3.2 SS): huy hiệu tròn primary, điểm `type.score`. Best nhỏ hơn `type.h2`, surface.alt.
- **next-fruit:** 2 sprite nhỏ (60px) hiện trái kế tiếp chuỗi — giúp lên kế hoạch.
- **DangerLine:** vạch ngang dashed, `color.danger`, độ rõ medium; khi có trái sắp quá vạch → nhấp nháy nhẹ cảnh báo.

### 3.3 Bucket & thả (data-testid: `bucket`, `drop-ghost`)
- Bucket: từ `y≈30%` (đỉnh) đến `y≈100%` (đáy). Rộng `BUCKET_W=640`, centered x. Vách trái/phải để trái không lăn ra ngoài (vật lý wall).
- **Drop-ghost:** sprite trái trong suốt (alpha 0.45) theo pointer X, clamp trong bucket [x0+B_r/2, x1−B_r/2]. Nhả/tap → thả trái thật tại X đó.
- **Thả:** trái sinh tại y=đỉnh bucket, rơi do Matter.js. Cooldown thả ≥250ms (BR M3-01).

### 3.4 Merge pop (data-testid: `combo-popup`)
- Khi 2 trái cùng loại chạm → scale-up pop ở điểm merge + `dur.pop` (250ms back.easeOut) → trái bậc mới.
- Score +1 bậc theo bảng §6: hiện "+N" trôi lên (float), `color.success`.
- Combo liên tiếp (trong ~2s) → `combo-popup` "Combo xN" to giữa `type.h1`, primary, hiện `dur.slow` rồi fade.

### 3.5 Game Over — lần 1 (rewarded — data-testid: `continue-btn`, `final-score`, `best-score`, `record-popup`)
```
  (overlay color.overlay z.40 + spinner)
┌──────────────────────────────┐
│   GAME OVER    (type.display)  │
│  Điểm: 1234     (type.score)   │
│  Best: 567      (type.body)    │
│  [Tiếp tục 🎁]  continue-btn   │  btn-primary + icon quà (rewarded)
│  [Chơi lại]     retry-btn       │  btn-ghost
└──────────────────────────────┘
```
- **Lần 1 game over:** chỉ hiện rewarded "Tiếp tục" (KHÔNG interstitial). Earned → trái trên vạch biến mất + đẩy trái còn xuống (BR M3-05), ẩn panel, tiếp tục.
- Không earned / hủy → ở lại (BR M3-06). Bấm Chơi lại → RNG seed mới, restart.

### 3.6 Game Over — lần 2+ (interstitial — data-testid: `retry-btn`)
- Chạy **interstitial** trước → xong mới hiện panel game over (retry + score + best).
- **Kỷ lục mới** (vượt best): `record-popup` "KỶ LỤC MỚI! 🎉" + gọi sendScore/saveData.

---

## 4. ANIMATION & TRANSITION

| Animate | Giá trị |
|---------|---------|
| Scene enter/exit | fade `dur.base` (200ms ease-out) |
| Trái thả | rơi theo Matter.js (physics tự nhiên) — ko tween thủ công |
| Merge pop | `dur.pop` scale 1→1.15→1 (250ms back.easeOut) |
| Score +N float | 0.9s ease-out trôi lên + fade |
| Combo pop | `dur.slow` scale-in + fade giữa màn |
| Game over panel | slide-up + fade `dur.slow` (400ms) |
| Continue earned | trái trên vạch fade-out `dur.base`, trái còn đẩy xuống dần |
| Button press | `dur.fast` scale 0.96 |
| DangerLine nháy khi nguy hiểm | alpha 0.4↔1, 300ms lặp, ease linear |

---

## 5. FEEDBACK & ERROR STATES

| Tình huống | Hiển thị |
|-----------|----------|
| Merge hợp lệ | pop + score +N + sfx theo bậc |
| Thả trong cooldown | bỏ qua (không tạo trái), không lỗi |
| Trái gần/log quá vạch | DangerLine nháy + sfx nhắc nhẹ |
| Game over | flash danger + shake + panel |
| Reward tiếp tục earned | resume; not-earned → ở lại panel, không trừ điểm |
| Save/load lỗi | im lặng, mặc định, console (BR M3-08) |
| Bấm nút | `dur.fast` scale + hover |

---

## 6. ART-THEME: CHUỖI TRÁI CÂY (bảng bậc + sprite)

| Bậc | Trái | Màu chủ | Kích thước sprite (px~) | Điểm merge |
|----|------|---------|------------------------|-----------|
| 1 | Cherry | đỏ #D32F2F | 48 | 1 |
| 2 | Strawberry | hồng #FF5C8A | 64 | 3 |
| 3 | Grape | tím #9C27B0 | 80 | 6 |
| 4 | Dekopon | cam #FF9800 | 96 | 10 |
| 5 | Pomegranate | đỏ sẫm #C62828 | 112 | 15 |
| 6 | Orange | cam đậm #F57C00 | 128 | 21 |
| 7 | Apple | đỏ+đuôi xanh #E53935 | 144 | 28 |
| 8 | Pear | xanh-vàng #AEDI6F→#EFE05C | 162 | 36 |
| 9 | Peach | hồng kem #FFB6C1 | 180 | 45 |
| 10 | Pineapple | vàng #FDD835 | 200 | 55 |
| 11 | Melon | xanh vân #81C784 | 220 | 66 |
| 12 | Watermelon | xanh #4CAF50 + glow | 244 | 100 (jackpot) |

> Sprite kích thước tăng theo bậc (vật lý merge cần trái lớn hơn nặng hơn). Viền đậm 6px đồng tông. **Jackpot Watermelon** thêm glow (blur/sprite đè) khi sinh.

---

## 7. ACCESSIBILITY & THEME

- Contrast chữ trên surface ≥4.5:1; HUD trên nền pastel có `color.text.stroke`.
- Không phụ thuộc màu: ngoài màu, merge còn kích thước + số bậc + hình dạng trái (mỗi bậc hình khác nhau) — truyền đạt được khi đen trắng/mù màu.
- Audio: nút mute; mọi feedback quan trọng có visual tương đương (pop, danger nháy).
- Khán giả 13+, không nội dung gớm. Vạch danger rõ ràng.

---

## 8. UX CHECKLIST (manual review gate)

- [ ] User mới đạt hành động chính "thả trái" trong ≤3 thao tác (Start 1 tap → di chuyển ghost → thả).
- [ ] Ghost preview vị trí thả rõ ràng, không mơ hồ.
- [ ] Merge tự giải thích (2 cùng loại pop thành trái lớn) không cần chữ.
- [ ] Vạch danger dễ nhận biết; game over lý do rõ.
- [ ] Rewarded "Tiếp tục" không gây khó hiểu (nói rõ "xem quảng cáo để chơi tiếp").
- [ ] Không màn quá tải, không nút mơ hồ, click thừa tối thiểu.
- [ ] Contrast HUD đạt; không lỗi đè nút (kể cả desktop ngang).

---

## 9. TÀI LIỆU KHÔNG THUỘC DESIGN

- Logic merge, luật đổ, RNG chuỗi, score (bảng §6), BR — xem **SPEC.md** §4, §6.
- Cấu trúc dữ liệu (config yaml, asset manifest, build report, save payload) — xem **DATA-MODEL.md**.
- Test case chi tiết — xem **TEST-CASES.md** + **E2E-TESTS.md**.

---

## 10. STAGE MODE UI & ACTION BAR DESIGN

### 10.1 Stage Select Map Scene (`StageSelectScene`)
- **Layout:** Grid 3x5 hoặc Danh sách cuộn saga với 30 level nodes.
- **Node Cấp độ:** Nút tròn nổi bật với số thứ tự Level (1..30), hiển thị 0-3 Sao màu vàng cam phát sáng. Màn chưa mở có icon ổ khóa xám.
- **Top Header:** Nút Quay lại (Back), Tổng số sao đã tích lũy (⭐ X/90), Nút Daily Challenge.

### 10.2 In-Game Stage Goal HUD
- **Vị trí:** Thanh thông tin phía trên đỉnh thùng.
- **Thành phần:**
  - 🎯 **Mục tiêu:** Icon trái cây cần đạt hoặc số lượng Băng/Gỗ cần phá (vd: `🎯 x1` hoặc `🧊 0/4`).
  - 🪂 **Số lượt thả còn lại (Moves Left):** Huy hiệu bo tròn thể hiện số lượt còn lại (đổi màu vàng khi ≤ 5 lượt, đỏ khi ≤ 2 lượt).

### 10.3 Action Power-ups Bar (Dưới đáy thùng)
- **3 Nút Tác vụ:**
  - 🔨 **Hammer:** Icon Búa màu xanh cyan, hiển thị số lượng badge `xN`. Bấm vào sẽ chuyển con trỏ sang chế độ đập target.
  - 💣 **Bomb:** Icon Quả bom đen nổ lửa, số lượng `xN`. Bấm vào sẽ nạp quả bom làm lượt thả tiếp theo.
  - 🌈 **Rainbow:** Icon Trái cầu vồng đa sắc, số lượng `xN`. Bấm vào sẽ nạp quả cầu vồng làm lượt thả tiếp theo.

### 10.4 Obstacle Visuals & VFX
- 🧊 **Ice Block:** Khối hình vuông màu xanh băng trong suốt (#81D4FA) có viền phản quang, khi nứt có vệt nứt trắng và hiệu ứng băng vỡ lấp lánh.
- 🪵 **Wooden Crate:** Hộp gỗ phong cách hoạt hình (#8D6E63) với thanh chéo chữ X, khi vỡ tạo ra các mảnh gỗ văng tung tóe.
- 💣 **Bomb Blast VFX:** Vòng tròn sóng xung kích nổ sáng (#FFD54F), rung chấn camera nhẹ 100ms.