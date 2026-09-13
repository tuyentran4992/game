# M11 — Paper Crease · DESIGN-SPEC (tầng 2, per-module)

> **Tham chiếu bắt buộc:** `docs/DESIGN-SYSTEM.md` (tầng 1 — token + component core + art standard + accessibility).
> File này **CHỈ** giữ: token mô-đun dùng + **art-theme riêng của game** + bố cục màn cụ thể + animation riêng.
> **CẤM** định nghĩa lại token core/typography/spacing/radius/shadow/motion/component — thấy thiếu thì sửa file tầng 1.
> **Art-theme:** "PAPER STUDIO" — thế giới giấy & mực (kem sáng + mực xanh), khác biệt với các game trước (M1/M2/M4 dùng nền trời/neon).
> Cập nhật: 2026-09-13 · Trạng thái: chờ anh Tuyền review visual TRƯỚC khi code.

---

## 1. DESIGN TOKENS (chỉ phần mô-đun + override)

**Dùng nguyên từ DESIGN-SYSTEM (không đổi):** toàn bộ `type.*` (typography), `sp.*` (4px grid), `radius.*`, `shadow.*`, `dur.*`, `z.*`, component core §3, feedback §6, accessibility §7.

**Art-theme override của game (được phép theo DS §1.0)** — kèm số contrast đo bằng máy (WCAG, đo 13/09/2026):

| Token | Giá trị | Dùng | Contrast kiểm |
|---|---|---|---|
| `color.primary` | `#1F6FEB` (xanh mực) | nút chính, viền ô đáp án đang chọn, HUD | trắng trên nền này = **4,63:1** ✅ AA |
| `color.primary.dark` | `#1554B8` | viền dưới nút, pressed | trắng trên nền này = **7,02:1** ✅ |
| `color.primary.grad` | `#1F6FEB → #4C8DF5` | hover nút chính | — |
| `color.accent` | `#F5B301` (vàng sao) | sao đạt, particle, streak | **KHÔNG** dùng làm chữ nhỏ; chỉ fill lớn (xem §7) |
| `color.bg.top` | `#FFF7E8` (kem sáng) | đỉnh gradient nền | chữ mực `#3A2E39` trên nền này = **12,1:1** ✅ |
| `color.bg.bottom` | `#EADFC4` (kraft nhạt) | đáy gradient nền + vignette α≤0.12 | chữ mực trên nền này = **9,73:1** ✅ |
| `color.paper` (mô-đun) | `#FFFFFF` | mặt tờ giấy | — |
| `color.ink` (mô-đun) | `#17324D` | **lỗ đục** + nét vẽ nếp | trên giấy trắng = **13,13:1** ✅ |
| `color.crease` (mô-đun) | `#9FB3C8` | đường nếp gấp (mảnh 2px) | chỉ trang trí, không mang nghĩa |

- Giữ nguyên `color.success/danger/warning/surface/text.*` của DS (semantic bắt buộc). Lưu ý đã đo: `success #2ECC71` trên trắng chỉ 2,1:1 và `danger #E74C3C` 3,82:1 ⇒ **chỉ dùng cho fill lớn + icon**, KHÔNG dùng làm chữ nhỏ trên surface sáng (chữ thì dùng `color.text.primary`).

---

## 2. LAYOUT GRID & BREAKPOINTS

- Base camera **1920×1080**, `Scale.FIT` + letterbox/pillarbox (DS §2). Không khoá orientation.
- **Mobile-first playfield COLUMN** (kế thừa quyết định M1): toàn bộ gameplay nằm trong **cột dọc rộng 720px** giữa màn hình; desktop hiển thị y hệt mobile, 2 bên là nền giấy + vignette. QA **không** được coi "2 bên trống" là lỗi.
- Safe area: HUD cách mép ≥ `sp.4` (16px); vùng chạm ≥ 44×44px.
- Tỷ lệ phải pass: 9:16 · 3:4 · 1:1 · 4:3 · 16:9 · 21:9 · 32:9 (tests E2E).

```
        desktop 32:9 (ví dụ)
┌─────────────────────┬──────────────────────┬─────────────────────┐
│  nền giấy + vignette│   CỘT PLAYFIELD 720  │ nền giấy + vignette │
│  (không gameplay)   │   (toàn bộ game ở đây)│  (không gameplay)   │
└─────────────────────┴──────────────────────┴─────────────────────┘
```

---

## 3. COMPONENTS (dùng từ DS — ghi rõ chỗ áp art-theme)

| Component | Nguồn | Áp dụng cho game này |
|---|---|---|
| `PrimaryButton` (280×72, radius.lg) | DS §3.1 | nút PLAY / UNFOLD / chapter next. Fill `color.primary.grad`, viền dưới `color.primary.dark` 6px |
| `btn-ghost` | DS §3.1 | "Peek a fold" · "Thử lại" · nút phụ ở shop (KHÔNG gạch chân chữ — lỗi đã dính ở M1) |
| `HUD ScoreLabel` (huy hiệu ⌀64) | DS §3.2 | dùng cho **Mực Gấp** (đếm tiền tệ); sao của màn là cụm sao riêng (dưới) |
| `GameOverPanel` (480×560) | DS §3.3 | dùng lại làm **Chapter Score Card** + **panel kết quả chương** |
| `TutorialBanner` | DS §3.4 | dòng giải thích khi chọn sai ("Right on the crease…") |
| `Spinner` | DS §3.5 | chờ SDK ad trước khi chạy rewarded |

**Component mô-đun (không phải core, ghi ở đây vì chỉ game này dùng):**
- **Sheet (tờ giấy)**: 480×480px, `color.paper`, radius 6px (giấy thật hơi vuông), `shadow.char`, mép giấy có 1 vệt gloss chéo α0.5 (DS §4.1) + viền dưới tối hơn 15% (`#E6E2D8`).
- **Crease line**: nét 2px `color.crease`, chỉ vẽ nếp đã gấp.
- **Punch hole**: tròn ⌀36px `color.ink` + gloss nhỏ lệch trên-trái; khi lỗ nằm trên nếp thì vẽ nửa lỗ ở mỗi lớp (khác biệt D1).
- **Option card**: 240×240, `color.surface`, border 4px `#EADFC4`, radius.md (20).
- **Sao màn chơi**: 48px, fill `color.accent` + viền `#8A5A2B` 3px; sao chưa đạt = viền rỗng `#C9BFA6` (phân biệt bằng **hình dạng**, không chỉ màu — DS §7).

---

## 4. SCREEN-BY-SCREEN MOCKUP

### 4.1 PLAY (màn chính — 90% thời gian chơi)
```
cột 720 (giữa màn 1920)
┌──────────────────────────────────────────────┐
│ y16  [MÀN 23/120]  type.small        ⌀64 🔊 ⌀64 ☰ │ testid-hud-level, testid-btn-sound, testid-btn-menu
│ y88  ★★☆ (48px)              [Mực ⌀64: 42]         │ testid-hud-stars, testid-hud-ink
│                                                  │
│ y170 ┌────────────────────────┐                  │
│      │   TỜ GIẤY GẤP 480×480  │  (shadow.char)   │ testid-sheet-folded
│      │   1 lỗ đen ⌀36 ở chỗ   │                  │ testid-sheet-hole
│      │   đã đục                │                  │
│      └────────────────────────┘                  │
│ y690   (chỗ trống cho banner giải thích khi sai)  │ testid-feedback-wrong
│ y700  ┌────────┐ 24px ┌────────┐                 │
│       │ ô A240 │      │ ô B240 │                 │ testid-option-0, testid-option-1
│ y964  └────────┘      └────────┘                 │
│       ┌────────┐      ┌────────┐                 │ testid-option-2, testid-option-3
│ y1228 └────────┘      └────────┘                 │
│ y1312 [💡 Peek a fold]  [↩ Undo (video)]  cao 72  │ testid-btn-hint, testid-btn-undo
│ y1420  ⓘ nếp gấp "thở" (chỉ màn dạy luật, 2 nhịp) │ testid-hint-breath
└──────────────────────────────────────────────┘
```
- Ô đáp án **đúng**: border 4px `color.success` + glow + 2 vòng particle `color.accent`; 3 ô còn lại alpha 0.45.
- Ô đáp án **đang được chạm**: border `color.primary` + scale 1.03 (`dur.hover`).
- Trong lúc animate mở bung: 4 ô `disabled` (alpha 0.6) nhưng **vẫn buffer** input (PC-05/PC-09).

### 4.2 TITLE
Sheet gấp lớn 560×560 (thở nhẹ) giữa trên; chữ **Paper Crease** (`type.display` 44px, không tự thêm cỡ mới); dưới: `PrimaryButton` "PLAY" / "Continue — Level 23" (testid-title-play) + `btn-ghost` "Shop" (testid-title-shop). Không có popup, không banner xin quyền.

### 4.3 LEVEL MAP
8 tab chương dạng pill (200×72, cuộn ngang) → lưới **5 cột × 3 hàng** ô màn 168×168 (radius.md) + cụm sao 32px dưới mỗi ô; chương khoá: ô xám + ổ khoá + dòng điều kiện "cần 12/15 ★" (testid-map-locked).

### 4.4 CHAPTER SCORE CARD
Dùng `GameOverPanel` 480×560: tổng sao chương (cụm sao 48px) · thời gian chơi chương · kỷ lục cá nhân (ghost) · 2 nút: "Next chapter" + "View map". **Đây là điểm DUY NHẤT interstitial được phép hiện**, và chỉ hiện **sau** khi panel + sao đã animate xong (PC-14).

### 4.5 SHOP / ALBUM
Shop: lưới 2×4 skin 260×300 (preview tờ giấy với hoa văn), giá Mực ở dưới, skin đã mua có dấu ✓, đang dùng có viền `color.primary` 4px.
Album: lưới 4 cột mẫu giấy 200×200 (đã mở = đủ màu, chưa mở = silhouette xám) + hàng huy hiệu ⌀96 (≤6).

### 4.6 END SCREEN
Tổng sao /120, tổng thời gian, nút "Master mode" (testid-end-master). Ghi rõ "You unfolded all 120" — khai báo hết nội dung (bắt buộc với Playables).

---

## 5. ANIMATION & TRANSITION (đặc trưng game — quan trọng nhất là D1)

| Animation | Thông số | Ghi chú |
|---|---|---|
| **Mở bung từng lớp** (D1) | mỗi lớp **140ms** ease-out, so le **110ms** ⇒ 4 lớp ≈ 0,7s · 8 lớp ≈ 0,9s | Lớp ngoài cùng mở trước; lỗ hiện dần theo từng lớp |
| **Lỗ hiện ra** | scale 0→1 `dur.pop` (250ms), so le 60ms giữa các lỗ | Lỗ nhân bản đúng vị trí thật |
| **Giải thích khi SAI** | vệt sáng chạy dọc nếp 500ms + 2 lỗ trùng khít hiện đè (blend) + `TutorialBanner` copy | Đây là "khoảnh khắc dạy học" — không được rút ngắn dưới 700ms |
| **Màn kế đã gấp sẵn** | tờ giấy mới trượt lên `dur.slow` (400ms) | KHÔNG có win screen (PC-09) |
| **Nếp gấp "thở"** (hint idle) | scale 1,00→1,02, 1,2s yoyo, lặp 2 nhịp, chỉ khi idle ≥5s và chỉ màn dạy luật | testid-hint-breath |
| **Sao đạt** | `dur.pop` scale 1→1,15→1 + particle `color.accent` | |
| **Chạm ô** | scale 0,96 `dur.fast` | feedback tức thì |
| **Rung khi sai** | micro-shake ≤4px `dur.slow` | DS §4.3 |
| **Streak tăng** | floating text "+2" bay lên 400ms + fade | màu `color.accent` |

---

## 6. FEEDBACK & ERROR STATES (phần riêng của game)

| Tình huống | Hiển thị |
|---|---|
| Chọn đúng | border success + particle + sao sáng + màn kế sẵn sàng |
| Chọn sai | rung ≤4px + animate giải thích + banner copy + 2 nút (Thử lại / Undo video) |
| Hết lượt undo trong màn | nút undo ẩn hẳn, chỉ còn "Thử lại" |
| Ad không load / SDK vắng | nút ad ẩn, chơi bình thường, KHÔNG chặn, không báo lỗi đỏ (Null Object) |
| Save hỏng/thiếu field | im lặng, chơi lại từ màn 1, skin đã mua giữ nguyên (PC-16) |
| Mất focus / nền tảng pause | dừng timer + nhạc + animate; quay lại tiếp đúng frame (PC-17) |
| Hết 120 màn | End screen + Master (PC-18) |

---

## 7. ACCESSIBILITY & THEME

- Contrast đã đo bằng máy (xem §1): chữ mực trên nền kem/kraft **12,1:1 / 9,73:1**; trắng trên nút chính **4,63:1**; lỗ `color.ink` trên giấy **13,13:1**.
- **Không phụ thuộc màu:** sao đạt/chưa đạt phân biệt bằng **hình dạng** (đặc vs rỗng); đúng/sai khác nhau bằng **animation + icon**, không chỉ màu; ô nhiễu khác đáp án bằng **hình**.
- Chữ tương tác ≥18px (`type.small`); HUD trên nền sáng có `color.text.stroke`.
- Focus ring bàn phím: ring trắng 3px (DS §3.1) — game chơi được bằng bàn phím (1-4 chọn, Enter mở, Esc menu) cho QA tự động.
- Nút mute riêng luôn hiện ở HUD; mọi âm thanh có phản hồi thị giác tương đương.
- Không nội dung gớm/sợ; 13+.

---

## 8. UX CHECKLIST (gate review tay của anh Tuyền TRƯỚC khi code)

- [ ] Tờ giấy + 4 ô đáp án đọc được **trong 0,5 giây** ở ảnh thu 240px?
- [ ] Màn 1 chơi được **không cần đọc chữ nào**?
- [ ] Người mới ≤3 click là đang chơi thật?
- [ ] Không có màn/trạng thái nào chỉ có 1 nút mà không rõ bấm xong ra sao?
- [ ] Ô đáp án có đủ to để chạm trên điện thoại (≥44px, ở đây 240px)?
- [ ] Màu nút/ô không bị "flat nghiệp dư" (có gradient + viền dưới + gloss theo DS §4.1)?
- [ ] Không có chữ nào ≤18px, không có chữ cắt cụt?
- [ ] Khi sai, người chơi **hiểu vì sao** chỉ nhìn animation (không cần đọc)?

---

## 9. TÀI LIỆU KHÔNG THUỘC DESIGN
Quy tắc nghiệp vụ PC-01..PC-20 → `SPEC.md` §6 · cấu trúc save/config/log → `DATA-MODEL.md` · test → `TEST-CASES.md` (dev) · `E2E-TESTS.md` (QA browser).
