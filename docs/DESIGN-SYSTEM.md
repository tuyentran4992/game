# DESIGN SYSTEM — YouTube Playables Games

> **Tầng 1 — CHUNG toàn business.** File này là source of truth DUY NHẤT cho token & component core của mọi game trong YouTube Playables Games.
> Mỗi module có `DESIGN-SPEC.md` (tầng 2) **CHỈ THAM CHIẾU** token ở đây + mô tả bố cục màn cụ thể của game đó. **CẤM mọi module tự bịa token/component khác.**
> Muốn thêm token/component dùng chung → sửa file NÀY (rồi các game đổi theo). Override cục bộ 1-cảnh mới ghi trong design-spec của game.
> Cập nhật: 2026-08-22
> Đối tượng: casual hyper-casual game HTML5 (Phaser canvas), render trên YouTube Playables, responsive mọi aspect ratio.

## 🔤 QUI ƯỚC NAMING TOKEN
Tên token chính thức dùng **dấu chấm** (namespace): `color.primary`, `type.display`, `sp.4`, `radius.md`, `shadow.btn`, `dur.pop`, `z.40`. Mọi DESIGN-SPEC bắt buộc theo convention này.

## ⚖️ PHẠM VI: CHUNG BẮT BUỘC vs ART-THEME PER-GAME
- **CHUNG BẮT BUỘC** (mọi game dùng y hệt, KHÔNG override): typography (§1.2), spacing (§1.3), radius (§1.4), shadow (§1.5), motion (§1.6), z-layering (§1.7), component core (§3), feedback/error (§6), accessibility (§7). Đây là "vỏ UI" nhận diện chung thương hiệu.
- **ART-THEME PER-GAME** (được phép override trong design-spec của game): màu art nền (`color.bg.*`), nhân vật/chướng ngại, `color.primary` + `color.accent` (thế giới nghệ thuật riêng), theme không khí. Quy tắc: art-theme thay màu CŨNG PHẢI giữ đủ semantic success/danger/warning + contrast §7; không đổi type/spacing/radius/shadow/motion/component.
- **Vì sao:** studio đa game — ép mọi game cùng 1 màu art làm game mất cá tính & không hợp theme. Đồng nhất là ở **UI chrome + quy tắc**, không phải màu sơn mỗi game.

---

## 1. DESIGN TOKENS

### 1.1 Màu — semantic (màu art mỗi game có thể override theo §1.0)
> CẤM hardcode HEX trong code game — dùng tên token semantic.

**Brand / Primary (art-theme có thể đổi)**
| Token | HEX | Dùng |
|-------|-----|------|
| `color.primary` | `#FF9F1C` (cam) | Nút chính, điểm nhấn — M1 chốt; game sau có thể đổi |
| `color.primary.dark` | `#E8820F` | viền dưới / hover primary |
| `color.primary.grad` | `#FF9F1C → #FFAB3D` | gradient nút chính |

**Semantic (bắt buộc giữ nghĩa)**
| Token | HEX | Dùng |
|-------|-----|------|
| `color.success` | `#2ECC71` | điểm cộng, thành công |
| `color.danger` | `#E74C3C` | va chạm, game over, chướng ngại |
| `color.warning` | `#FFC048` | cảnh báo |
| `color.accent` | `#FF9F43` | cam phụ, nổi bật nhẹ |

**Surface / Text (bắt buộc)**
| Token | HEX | Dùng |
|-------|-----|------|
| `color.surface` | `#FFFFFF` | nền panel/card |
| `color.surface.alt` | `#F5F7FA` | nền phụ |
| `color.overlay` | `rgba(0,0,0,0.55)` | tối hậu cảnh khi panel mở |
| `color.text.primary` | `#3A2E39` | chữ trên surface sáng |
| `color.text.secondary` | `#636E72` | chữ phụ |
| `color.text.onprimary` | `#FFFFFF` | chữ trên màu primary/dark |
| `color.text.stroke` | `rgba(0,0,0,0.35)` | viền chữ HUD đọc trên nền sáng |

**Nền game (art-theme override per-game)**
| Token | HEX | Dùng |
|-------|-----|------|
| `color.bg.top` | `#7EC8FF` | gradient bầu trời (đỉnh) — M1; game sau đổi |
| `color.bg.bottom` | `#B8E6A8` | đáy — M1; game sau đổi |

### 1.2 Typography (game font)
> Font: system sans-serif đậm (KHÔNG nhúng font riêng để giữ bundle < 5MB — ràng buộc Playables). Phaser `setFontFamily('sans-serif')`, weight 900 = chữ bóng chibi-casual.
| Token | Size | Weight | Line-height | Dùng |
|-------|------|--------|-------------|------|
| `type.display` | 44px | 900 | 1.1 | số +điểm lớn, chữ chính nút |
| `type.h1` | 36px | 800 | 1.15 | tiêu đề màn / nút phụ |
| `type.h2` | 28px | 800 | 1.2 | label, score panel |
| `type.body` | 24px | 700 | 1.3 | nội dung, tutorial |
| `type.small` | 18px | 600 | 1.3 | caption, ghi chú |
| `type.score` | 30px | 800 | 1.0 | score-label HUD |
> Thang tối thiểu: mọi chữ tương tác ≥ 18px (mobile).

### 1.3 Spacing (4px grid)
`sp.1:4 | sp.2:8 | sp.3:12 | sp.4:16 | sp.5:24 | sp.6:32 | sp.7:48`

### 1.4 Radius
`radius.sm:12 (huy hiệu, icon) | radius.md:20 (nút bo vừa) | radius.lg:32 (panel) | radius.pill:½ chiều cao (nút pill)`

### 1.5 Shadow
| Token | dx | dy | blur | alpha | Dùng |
|-------|----|----|------|-------|------|
| `shadow.btn` | 0 | 6px | 12px | 0.30 | nút nổi trên nền |
| `shadow.panel` | 0 | 10px | 24px | 0.35 | panel Game Over |
| `shadow.char` | 0 | 4px | 8px | 0.25 | nhân vật/chướng ngại (rơi trên nền) |

### 1.6 Motion (duration + easing)
| Token | Giá trị | Dùng |
|-------|---------|------|
| `dur.fast` | 120ms, ease-out | press, hover, micro-interaction |
| `dur.base` | 200ms, ease-out | scene transition, fade |
| `dur.slow` | 400ms, ease-in-out | panel slide, shake |
| `dur.pop` | 250ms, back.easeOut | score pop, appear |
| `dur.hover` | 180ms, ease-out | hover lift |

### 1.7 Z-layering (thứ tự vẽ canvas)
| Layer | Z | Đối tượng |
|-------|-----|-----------|
| `z.0` | 0 | nền gradient + cỏ + vạch lane |
| `z.10` | 10 | nhân vật, chướng ngại, hạt |
| `z.20` | 20 | HUD top bar |
| `z.30` | 30 | tutorial text / popup |
| `z.40` | 40 | overlay tối khi panel |
| `z.50` | 50 | panel + nút |

---

## 2. LAYOUT GRID & BREAKPOINTS

- **Design base:** camera world **1920×1080**, Phaser `Scale.FIT` → tự co theo viewport, thêm **letterbox** (dọc) / **pillarbox** (ngang); KHÔNG méo/cắt.
- **Responsive (Playables bắt buộc):** hỗ trợ 9:32, 9:21, 9:16, 3:4, 1:1, 4:3, 16:9, 21:9, 32:9. Game center + letterbox/pillarbox; KHÔNG khóa orientation.
- **Safe area HUD:** phần tử HUD (điểm, pause, audio) cách mép ≥ `sp.4` (16px), không dính notch. Gameplay render full canvas.
- **Rule touch:** mọi phần tử tương tác vùng chạm ≥ 44×44px.
- State (điểm, lane, vị trí) giữ khi resize; chỉ re-center HUD.

---

## 3. COMPONENTS CORE (dùng chung mọi game)
> Nút/GUI vẽ trong canvas (Phaser Graphics), KHÔNG dùng HTML `<button>` (trừ platform tự vẽ). Đặc tả 1 lần tại đây → tái dùng.

### 3.1 btn-primary (PrimaryButton)
| Thuộc tính | Giá trị |
|-----------|---------|
| Kích thước | 280 × 72px |
| Radius | `radius.lg` (32) |
| Fill | `color.primary`; viền dưới `color.primary.dark` dày 6px (nút nổi chibi) |
| Text | `type.display` 44px, `color.text.onprimary`, weight 900, giữa |
| Shadow | `shadow.btn` |

**States:**
| State | Thay đổi |
|-------|----------|
| default | như trên |
| hover | fill sáng +8% (`color.primary.grad`), viền đậm, scale 1.03, `dur.hover` |
| active | scale 0.96, viền dưới giảm 2px (nút "ngồi xuống"), fill `color.primary.dark`, `dur.fast` |
| disabled | alpha 0.40, không nhận input |
| focus (bàn phím) | ring trắng 3px ngoài viền |

> **btn-ghost** (nút phụ khiêm tốn): surface `color.surface`, viền `color.primary` 4px, text `color.text.primary`, cao 72px, width theo nội dung +32px.

### 3.2 HUD ScoreLabel
| Thuộc tính | Giá trị |
|-----------|---------|
| Vị trí | `x=sp.4`, `y=sp.4`, căn trái trên (safe) |
| Huy hiệu | đĩa tròn `radius.pill` đường kính 64px, fill `color.primary`, ring trắng 3px |
| Label | `type.score` 30px, `color.text.onprimary`, 900, giữa trong huy hiệu |
| Phản hồi | tăng điểm → `dur.pop` pulse |
| data-testid | gán theo design-spec của game (vd `score-label`) |

### 3.3 GameOverPanel
| Thuộc tính | Giá trị |
|-----------|---------|
| Kích thước | 480 × 560px (co 0.9 nếu viewport nhỏ, giữ tỷ lệ) |
| Radius | `radius.lg` (32) |
| Fill | `color.surface`; border 4px `color.primary` |
| Shadow | `shadow.panel` |
| Xuất hiện | `dur.slow` slide-up + fade, overlay `color.overlay` (z.40) |
| Chứa | tiêu đề `type.h1`, score/best `type.score` + `type.body`, 2 nút PrimaryButton |

### 3.4 TutorialBanner
| Thuộc tính | Giá trị |
|-----------|---------|
| Kiểu | bong bóng `radius.md` (20), fill `color.surface.alt` alpha 0.9, padding 16×12 |
| Text | `type.body` 24px, `color.text.primary`, 700, giữa |
| Thời gian | hiện 3s rồi fade `dur.base` |
| data-testid | theo design-spec (vd `tutorial-text`) |

### 3.5 Spinner (loading, trước gameReady)
- Vòng tròn 48px, viền 6px `color.surface` alpha 0.3, phần quay `color.primary`, xoay 0.9s/vòng, ease linear, lặp. Giữa camera.

---

## 4. ILLUSTRATION / ART STYLE (guideline cho AI asset)
- **Phong cách:** 2D flat + toon, viền đậm, màu tươi sáng, nhân vật đáng yêu. Khán giả 13+.
- **Nhân vật chính:** ảnh tĩnh (sprite) + animation tween/physics trong engine (KHÔNG sprite-sheet nhiều frame — AI image-to-image không tạo khung mới tin cậy).
- **Nền:** gradient + vài lớp parallax nhẹ (tạo chiều sâu rẻ tiền).
- **Màu art** theo palette §1.1; art game override `color.bg.*` theo theme; **chữ/nút/HUD bắt buộc dùng token §1**.

---

## 5. MOTION PATTERNS (dùng chung)
| Pattern | Giá trị |
|---------|---------|
| Scene enter/exit | fade `dur.base` |
| Score pop | `dur.pop` scale 1→1.15→1 |
| Hit/va chạm | flash `color.danger` + shake `dur.slow` |
| Panel appear | slide-up `dur.slow` |
| Button press | `dur.fast` scale 0.96 |
| Reward continue loading | overlay spinner |

---

## 6. FEEDBACK & ERROR STATES
| Tình huống | Hiển thị |
|-----------|----------|
| Điểm + | pop `color.success` + âm thanh |
| Va chạm | flash `color.danger` + shake + game over |
| Reward continue loading | overlay spinner + `color.overlay` |
| Continue earned/not-earned | earned → resume mạng; not-earned → ở game over (không trừ điểm) |
| Save/load score lỗi | im lặng (không crash), đặt mặc định, ghi console (BR-11) |
| Bấm nút | `dur.fast` scale + đổi màu hover |

---

## 7. ACCESSIBILITY & THEME
- **Contrast:** chữ trên surface ≥ 4.5:1 (AA); HUD trên nền sáng có `color.text.stroke`.
- **Không phụ thuộc màu:** mỗi state thêm hình/icon; truyền đạt được cả khi mute (vd chướng ngại nguy hiểm đổi 3 kênh: màu `danger` + kích thước + hình dạng).
- **Audio:** có nút mute; mọi feedback quan trọng có visual tương đương.
- **Khán giả 13+, không dành trẻ em** — không nội dung gớm/đáng sợ.

---

## 8. QUY TRÌNH ĐỔI DESIGN
1. Token/component DÙNG CHUNG → sửa file NÀY → cập nhật các game (mention trong SPEC sau).
2. Art/theme riêng 1 game (nền, nhân vật, không khí, `color.primary`) → ghi trong `DESIGN-SPEC.md` của game đó.
3. **CẤM** game tự tạo component/token core mới không qua design system (trừ khi đưa lên đây).

---

*File này = source of truth visual CHUNG. DESIGN-SPEC.md mỗi game bắt buộc tham chiếu + chỉ giữ phần bố cục màn cụ thể.*