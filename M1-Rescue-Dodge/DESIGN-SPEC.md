# M1 "Cứu Mèo" — DESIGN-SPEC (Visual Spec)

> **Dự án:** YouTube Playables Games · Module M1 · Game rescue/dodge "Cứu Mèo"
> **Engine:** Phaser 3.60+ (WebGL), mọi UI/GUI vẽ trong **canvas** — KHÔNG dùng HTML/DOM của trang web (trừ nút toàn-màn hình platform tự vẽ). Các giá trị px = đơn vị logic của Phaser (camera world space, đã scale theo viewport).
> **Ngôn ngữ bản giao:** tiếng Việt; cung cấp cặp `VI / EN` cho mọi copy (fallback EN cho khán giả quốc tế 13+).
> **NGUỒN CHỨC NĂNG:** SPEC.md (bắt buộc đọc trước) — section 3.1 user flow, 4.2 data-testid, 4.3 copy.
> **Quy tắc:** KHÔNG viết code thật (không CSS/JS hoàn chỉnh). Chỉ token, bảng giá trị, layout ASCII, mô tả dur/easing. Mọi component THAM CHIẾU token — CẤM hardcode HEX lộn xộn.

---

## 1. DESIGN TOKENS

> **NGUỒN TOKEN:** token **UI chrome** (typography, spacing, radius, shadow, motion, component core, semantic success/danger/warning, surface/text) lấy từ `docs/DESIGN-SYSTEM.md` — CẤM tự bịa lại.
> **Phần dưới đây = ART-THEME của riêng game M1** (thế giới nghệ thuật outdoor "Cứu Mèo"): override `color.primary`, `color.accent`, `color.bg.*`, `color.*` liên quan theme. Tuân thủ quy tắc art-theme trong DESIGN-SYSTEM.md (§0): giữ đủ semantic danger/success/warning + contrast ≥ §7 system.

### 1.1 Màu — ART-THEME M1 (override từ DESIGN-SYSTEM.md)
> Game tối giản, nền gradient 2 lớp tươi sáng (trời + cỏ), outdoor ban ngày. Không texture nhiễu, không vignette đậm. 13+ kid-friendly, phù hợp cả dọc lẫn ngang.
> Các token KHÔNG liệt kê ở đây (success/danger/warning, surface/text theo system §1.1) dùng thẳng từ DESIGN-SYSTEM.md.

| Token | Tên | HEX | Công dụng |
|-------|-----|-----|-----------|
| `color.bg.top` | Nền trên | `#7EC8FF` | Gradient bầu trời — đỉnh màn |
| `color.bg.bottom` | Nền dưới | `#B8E6A8` | Gradient bầu trời/đất — đáy màn |
| `color.grass` | Cỏ | `#5ED07A` | Dải mặt đất chạy của mèo |
| `color.lane` | Vạch lane | `#FFFFFF` (alpha 0.35) | Vạch phân 3 lane, nét 4px đứt |
| `color.primary` | Cam chủ đạo | `#FF9F1C` | Nút chính, huy hiệu score, accent |
| `color.primary.dark` | Cam đậm | `#E8820F` | Viền nút / hover |
| `color.surface` | Mặt panel | `#FFFFFF` | Nền panel Game Over / hộp thoại |
| `color.surface.dim` | Mặt tối | `#9ED8FF` | Panel tutorial semi-transparent |
| `color.text.primary` | Chữ chính | `#3A2E39` | Chữ trên nền sáng |
| `color.text.onaccent` | Chữ trên cam | `#FFFFFF` | Chữ trên nút cam |
| `color.success` | Thành công | `#2ECC71` | +điểm, vòng sáng né thành công |
| `color.danger` | Nguy hiểm | `#E74C3C` | Va chạm ong, game over, vòng cảnh báo |
| `color.overlay` | Đè màn | `#000000` (alpha 0.55) | Tối hậu cảnh khi panel mở |
| `color.shadow` | Đổ bóng | `#000000` (alpha 0.25) | Shadow chung |

**Art-theme theo LEVEL — MULTI-PALETTE (BR-14).** Level 1 chạy default trên (§1.1 ban ngày). Mỗi level đổi cảnh nền bằng override `color.bg.*` + `color.grass` + `color.lane`; **chữ/nút/HUD/`color.primary` + semantic success/danger/warning KHÔNG đổi theo level** (luôn lock token §1.1, contrast AA trên mọi nền). Cứ **10 điểm → lên 1 level**; palette **vòng lại sau level 3** theo `level_index = ((n−1) % 3) + 1`.

| Level | Điểm | Chủ đề | `color.bg.top` | `color.bg.bottom` | `color.grass` | `color.lane` |
|-------|------|--------|----------------|-------------------|---------------|--------------|
| 1 | 0–9 | Ban ngày (mặc định) | `#7EC8FF` | `#B8E6A8` | `#5ED07A` | `#FFFFFF` (a 0.35) |
| 2 | 10–19 | Hoàng hôn | `#FFB578` | `#FF8E7A` | `#C97B5D` | `#FFE4C2` (a 0.40) |
| 3 | 20–29 | Đêm · Tím | `#2B3A67` | `#4A3B8C` | `#3D6B8E` | `#A9C6FF` (a 0.40) |

> Quy tắc chuyển palette: giữ `color.grass`/`color.lane` đủ **contrast với `color.text.primary`** và đủ phân biệt với nhân vật/ong; nếu 1 màu đụng quá gần mèo/ong thì điều chỉnh **hue/alpha** giữ nguyên cấu trúc lane (không đổi hình). Chữ luôn dùng `surface`/`onprimary`, đọc tốt trên cả 3 nền (xem §7). Asset nền: gradient 2 lớp + parallax (theo DESIGN-SYSTEM §4), KHÔNG sinh ảnh riêng cho từng level ngốn bundle — đổi màu token lúc runtime.

**Chuẩn contrast:** chữ `text.primary` trên `surface` (FFF) ≥ 9:1; `text.onaccent` trên `primary` cam ≥ 4.5:1 → luôn pass WCAG AA. Với ong đỏ/cam trên nền xanh sáng, đảm bảo phân biệt bằng **cả màu lẫn hình dạng + kích thước** (xem §7). Mọi palette level phải giữ các cặp contrast này (kiểm tra §7).

### 1.2 Typography — game scale (chỉ text tĩnh; score chạy dùng font mặc định Phaser)
> Gồm: base size (px), weight (0–900), line-height (số nhân hoặc px). Weight 900 = hiệu ứng chữ đậm bóng giống chibi-casual.

| Cấp | Token | Size | Weight | Line-height | Cách dùng |
|-----|-------|------|--------|-------------|-----------|
| Display | `type.display` | 44px | 900 | 1.1 | Số score lớn khi +điểm, chữ "Chơi" nút chính |
| H1 | `type.h1` | 36px | 800 | 1.15 | "Chơi lại", "Tiếp tục", title Game Over |
| H2 | `type.h2` | 28px | 800 | 1.2 | Label "Điểm cao", score panel |
| Body | `type.body` | 24px | 700 | 1.3 | Tutorial text, chữ phụ trên panel |
| Small | `type.small` | 18px | 600 | 1.3 | Caption, "xem ad", ghi chú nhỏ |
| ScoreHUD | `type.score` | 30px | 800 | 1.0 | Score-label trên HUD (chỉ số) |

> Thang tối thiểu: **size ≥ 18px** cho mọi chữ tương tác (khán giả mobile nhỏ). Font: system sans-serif đậm (game không nhúng font riêng để giữ bundle < 5MB); dùng `bold 900`.

### 1.3 Spacing — 4px grid
| Token | Giá trị |
|-------|---------|
| `sp.1` / `sp.2` / `sp.3` / `sp.4` / `sp.6` / `sp.8` | 4 / 8 / 12 / 16 / 24 / 32 px |
| Padding nút chuẩn | 16px ngang × 12px dọc |
| Gutter panel nội dung | 24px |
| Khoảng cách HUD tới mép safe | ≥ 16px |

### 1.4 Radius
| Token | Giá trị |
|-------|---------|
| `radius.sm` | 12px (huy hiệu, icon) |
| `radius.md` | 20px (nút góc bo vừa) |
| `radius.lg` | 32px (panel Game Over) |
| `radius.full` | = ½ chiều cao (nút pill) |

### 1.5 Shadow
| Token | dx | dy | blur | alpha | Cách dùng |
|-------|-----|-----|------|-------|-----------|
| `shadow.btn` | 0 | 6px | 12px | 0.30 | Nút nổi trên nền |
| `shadow.panel` | 0 | 10px | 24px | 0.35 | Panel Game Over |
| `shadow.char` | 0 | 4px | 8px | 0.25 | Mèo & ong (đổ xuống như rơi trên cỏ) |

### 1.6 Z-index (thứ tự vẽ canvas, vì Phaser layering)
| Layer | Z | Đối tượng |
|-------|-----|-----------|
| 0 | Nền gradient + cỏ + vạch lane |
| 10 | Mèo, ong, hiệu ứng hạt |
| 20 | HUD top bar (score-label) |
| 30 | Tutorial text |
| 40 | Overlay tối (`color.overlay`) khi panel mở |
| 50 | Panel Game Over + các nút |

---

## 2. LAYOUT GRID & BREAKPOINTS (responsive mọi aspect ratio)

### 2.1 Nguyên tắc
- Game dùng **camera world 1920×1080** cố định. Phaser `Scale.FIT` → tự co theo viewport, thêm **letterbox** (thanh đen ngoài) khi dọc, **pillarbox** khi ngang → KHÔNG bao giờ méo hay cắt.
- State (điểm, lane, vị trí mèo/ong) giữ khi resize; chỉ re-centering HUD theo kích thước mới.
- **Vùng an toàn HUD:** luôn thuộc hình chữ nhật cách mép camera `${sp.4} = 16px`. HUD top bar không bao giờ ra khỏi an toàn màn ngang hẹp khi `32:9`.

### 2.2 Camera & layout theo nhóm aspect
> Mọi aspect: gameplay (3 lane + mèo + ong) nằm ở **1/2 đáy** camera. Cỏ chiếm 38% chiều cao đáy.

| Nhóm aspect | Cách xử lý | Vị trí nút/panel |
|-------------|-----------|------------------|
| Dọc `9:16 · 9:21 · 9:32` | Co theo chiều rộng; camera thừa chiều cao → đổ bầu trời, cỏ đẩy xuống đáy | Panel/nút căn giữa camera; mèo ở giữa-đáy |
| Gần vuông `3:4 · 1:1 · 4:3` | FIT mặc định | Panel căn giữa tuyệt đối |
| Ngang `16:9 · 21:9 · 32:9` | Co theo chiều cao; thừa ngang → mở rộng cỏ & bầu trời 2 bên; 3 lane căn giữa | Panel căn giữa; nút nằm ngang nhau không chồng |

> **ASCII layout cơ bản (mọi aspect chung):**
```
┌───────────────────────────────┐
│  bầu trời gradient (2/3 trên)  │
│  ┌─────────────────────────┐  │
│  │  HUD top (score)  ...   │  │ <- safe top (z20)
│  └─────────────────────────┘  │
│                               │
│        (panel/overlay)        │  <- z40-50 (khi có màn phủ)
│                               │
│  ┌─────────────────────────┐  │
│  │  [lane1][lane2][lane3]  │  │ <- 3 lane ngang, giữa
│  │        🐱   🐝          │  │ <- mèo giữa lane, ong bay tới
│  └─────────────────────────┘  │
│  ▓▓▓▓▓▓ cỏ xanh (đáy 38%) ▓▓▓ │
└───────────────────────────────┘
```

### 2.3 Lane track (gameplay)
- **3 lane ngang** song song, mỗi lane cao **160px**, tổng cao 480px, căn giữa camera (chiều ngang).
- Mèo đi trong **lane giữa theo trục dọc** (mèo nhảy xuống dưới), hoặc mèo giữ lane cố định và **ong di chuyển ngang** — TÙY agent chọn 1 cơ chế NHẤT QUÁN (ưu tiên: mèo cố định giữa, ong bay tới từ phải). Design cho cơ chế ưu tiên này.
- Vị trí mèo: `x = camera.centerX`, `y = camera.h * 0.72`. Phạm vi né (dọc): từ `h*0.55` (lane trên) tới `h*0.80` (lane dưới), duyệt qua 3 lane cách nhau 160px.

---

## 3. COMPONENTS (GUI trong canvas)

> Mọi nút: 1 Graphics + hitbox riêng, có 4 state. Nút không dùng HTML `<button>` (trừ platform tự vẽ).

### 3.1 Nút chính (Pill Button) — `btn-primary`
| Thuộc tính | Giá trị |
|-----------|---------|
| Kích thước | 280 × 72px |
| Radius | `radius.lg` = 32px (bo lớn) |
| Fill | `color.primary` `#FF9F1C`; viền dưới `primary.dark` `#E8820F` dày 6px (kiểu nút nổi chibi) |
| Text | `type.display` 44px, `onaccent`, weight 900, căn giữa |
| Shadow | `shadow.btn` |

**States:**
| State | Thay đổi |
|-------|----------|
| default | như trên |
| hover | fill sáng hơn 8% (≈ `#FFAB3D`); viền đậm hơn; scale 1.03 |
| active (nhấn giữ) | scale 0.96; viền dưới giảm còn 2px (nút "ngồi xuống"); fill đậm `#E8820F` |
| disabled | alpha 0.40, không nhận input, con trỏ biến mất |
| focus (bàn phím) | ring trắng `#FFFFFF` 3px ngoài viền cam |

> Nút phụ **`btn-ghost`** (nếu cần nút thứ 2 khiêm tốn, vd "xem ad" nhỏ): surface FFF, viền `primary` 4px, text `text.primary`, cùng 72px cao, width tuỳ nội dung + 32px.

### 3.2 HUD Top Bar (luôn hiện khi Gameplay)
| Thuộc tính | Giá trị |
|-----------|---------|
| Vị trí | `x = sp.4`, `y = sp.4`, căn trái trên (vùng safe) |
| Huy hiệu score | đĩa tròn `radius.full` đường kính 64px, fill `primary`, thin ring trắng 3px |
| Label | `type.score` 30px, `onaccent`, weight 900, căn giữa trong huy hiệu |
| data-testid | `score-label` (gán lên text số bên trong huy hiệu) |
| Padding | 24px giữa huy hiệu và mép | 
- Score hiện tại sáng lên (pulse) mỗi khi +điểm (xem §5.5).

**Level badge `level-label`** (hiện level hiện tại — BR-14): pill `radius.full` (½ chiều cao), cao **40px**, padding ngang 16px, đặt cạnh huy hiệu score (cách `sp.3` = 12px), cùng `y = sp.4`. Fill `color.surface` alpha 0.92, border 3px `color.primary`, text `type.small` 18px `color.text.primary` weight 800, nội dung `Cấp {n}` / EN `Lv{n}`. data-testid=`level-label` (gán lên text). Khi level-up: đổi số + pulse `dur.pop` (không làm rời khỏi vùng safe).

### 3.3 Panel (màn phủ Game Over)
| Thuộc tính | Giá trị |
|-----------|---------|
| Kích thước | 480 × 560px (co 0.9 nếu viewport nhỏ hơn, giữ tỷ lệ) |
| Radius | `radius.lg` 32px |
| Fill | `color.surface` `#FFFFFF`; border 4px `primary` |
| Shadow | `shadow.panel` |
| Nội dung | title + 2 dòng số + 2 nút (xem §4.5) |

### 3.4 Tutorial Text (màn tutorial 3s)
| Thuộc tính | Giá trị |
|-----------|---------|
| Kiểu | bong bóng bo `radius.md` 20px, fill `surface.dim` `#9ED8FF` alpha 0.9, padding 16×12 |
| Text | `type.body` 24px, `text.primary` (#3A2E39), weight 700, căn giữa |
| data-testid | `tutorial-text` (gán lên text) |
| Vị trí | `y = h*0.35`, căn giữa ngang |

### 3.5 Huy hiệu điểm-né (bonus popup)
| Thuộc tính | Giá trị |
|-----------|---------|
| Text | `type.display` 44px, `color.success` `#2ECC71`, weight 900, có stroke trắng 3px để đọc trên nền |
| Xuất hiện | tại vị trí mèo vừa né thành công, bay lên 80px rồi fade |
| Nội dung | `+1` (mỗi lần né), `+5` mỗi 5 lần liên tiếp |

### 3.6 Spinner (loading, trước gameReady)
- Vòng tròn 48px, viền 6px `#FFFFFF` alpha 0.3, phần quay `primary`, xoay 0.9s/vòng, ease linear, lặp. Giữa camera.

### 3.7 Progression & Retention popups (BR-14/15/16) — style theo §3.5
> Cả 3 popup đều **non-blocking** (KHÔNG chặn gameplay, KHÔNG ad, KHÔNG chiếm input), tự tắt theo thời gian. Làm rõ: popup là 1 **lớp text + Graphics** trên scene (z.30), không phải panel modal.

**`level-popup`** — Level-up (BR-14), mỗi 10 điểm:
| Thuộc tính | Giá trị |
|-----------|---------|
| Text | `type.h1` 36px, weight 900, `color.text.onaccent` `#FFFFFF`, stroke 4px `color.shadow`, nội dung `Cấp {n}` / EN `Level {n}` |
| Vị trí | giữa camera `x = centerX`, `y = h*0.40` |
| Thời gian | hiện **1.5s** (xem §5.14) rồi fade, không chặn input |
| Nhấn mạnh | trùng đánh dấu flash đổi palette nền (5.13) + pulse `level-label` |
| data-testid | `level-popup` |

**`combo-popup`** — Combo bonus (BR-15), mỗi 5 lần né liên tiếp:
| Thuộc tính | Giá trị |
|-----------|---------|
| Text | `type.display` 44px, `color.success`, weight 900, stroke trắng 4px, nội dung `+5` |
| Vị trí | ngay tại mèo vừa né thành công ($3.5), bay lên 80px (xem §5.15) |
| Đi kèm | hạt `color.success` (5.12) + âm thanh ding |
| data-testid | `combo-popup` |

**`record-popup`** — KỶ LỤC MỚI (BR-16), 1 lần/phiên khi vượt best:
| Thuộc tính | Giá trị |
|-----------|---------|
| Text | `type.h1` 36px, weight 900, `color.warning` `#FFC048`, stroke trắng 4px, nội dung `KỶ LỤC MỚI!` / EN `NEW RECORD!` |
| Dạng | banner ngang giữa, width = nội dung +48px, padding 12px×8px, fill `color.surface` alpha 0.95, `radius.lg` 32px, border 4px `color.warning` |
| Vị trí | giữa camera `y = h*0.28`, slide-in từ trên xuống (xem §5.16) |
| Thời gian | 1.6s rồi fade, 1 lần/phiên |
| data-testid | `record-popup` |

---

## 4. SCREEN-BY-SCREEN MOCKUP

> Bảng 4.2 SPEC: mỗi data-testid CẮM đúng 1 phần tử, đúng chính tả.

### 4.1 Màn START (data-testid: `start-btn`)
```
┌──────────────────────────────┐
│                              │
│       bầu trời gradient      │
│                              │
│          ┌───────┐           │
│          │  🐱   │  <- mèo to 260px, giữa, idle (thở nhẹ)
│          └───────┘           │
│                              │
│   "Chơi" / "Play"           │  <- btn-primary, z50
│   [ data-testid=start-btn ]  │
│      280×72px, giữa ngang    │
│                              │
│   ▓▓▓▓ cỏ xanh ▓▓▓▓▓▓▓▓▓    │
└──────────────────────────────┘
```
- Căn: nút `y = h*0.60`; mèo `y = h*0.38`.
- Title game KHÔNG hiện trong canvas (title do portal metadata; BR-07). Nền tĩnh tươi.

### 4.2 Màn TUTORIAL (data-testid: `tutorial-text`) — kéo 3 giây, không ad
```
┌──────────────────────────────┐
│                              │
│   ┌────────────────────┐     │
│   │ "Giữ để né ong"     │     │  <- bong bóng tutorial, z30
│   │ "Hold to dodge"     │     │  data-testid=tutorial-text
│   └────────────────────┘     │
│                              │
│          🐱      🐝          │  <- demo nhẹ: ong từ phải, mèo lật né
│   ▓▓▓▓▓▓▓▓ cỏ ▓▓▓▓▓▓▓▓▓▓▓▓  │
└──────────────────────────────┘
- Sau 3s (đếm qua timer) tự vào Gameplay. Nền tươi không overlay.
```
- Demo tutorial: **mèo nghiêng/lật sang lane kế** đúng 1 lần khi ong tới gần, để người chơi hiểu cơ chế mà không cần bấm.

### 4.3 Màn GAMEPLAY (data-testid: `game-canvas` + `score-label` + `level-label`)
```
┌──────────────────────────────┐
│ ┌─────┐ ┌──────────┐ bầu trời│
│ │  5  │ │  Cấp 1   │         │  data-testid=score-label, level-label
│ └─────┘ └──────────┘         │
│                              │
│   🐝      🐝      🐝         │  <- ong bay từ phải → trái
│    ░░░ [lane trên] ░░░      │
│            🐱    +5          │  <- combo-popup (BR-15), tại mèo
│    ░░░ [lane giữa] ░░░      │
│            🐝               │  <- ong thêm
│    ░░░ [lane dưới] ░░░      │
│  ▓▓▓▓▓▓▓▓ cỏ ▓▓▓▓▓▓▓▓▓▓▓▓  │
└──────────────────────────────┘
- data-testid=game-canvas gán lên **vùng chơi** (ảnh/camera game-play) — nơi nhận tap.
- Tap/giữ trong game-canvas → mèo lật/đổi lane (xem §5.4).
- `level-label` bên cạnh huy hiệu score (HUD, z20). Khi lên level: palette nền đổi (5.13) + `level-popup` "Cấp {n}" hiện giữa màn (5.14), đúng copy SPEC 4.3.
- `combo-popup` "+5" hiện tại vị trí mèo mỗi 5 lần né liên tiếp (5.15). `record-popup` "KỶ LỤC MỚI!" hiện banner giữa-trên 1 lần/phiên (5.16).
```
- Điểm tăng mỗi lần né thành công ong + mỗi ~2s trôi (`game-canvas` GHI score → `score-label`). Hiệu ứng `+1` xuất hiện (component 3.5).

### 4.4 Màn GAME OVER (data-testid: `final-score`, `best-score`, `retry-btn`, `continue-btn`)
```
┌──────────────────────────────┐
│   ████ overlay 0.55 ████     │  <- z40, làm tối hậu cảnh
│   ┌──────────────────────┐   │
│   │  "GAME OVER"          │   │  h1 36px, danger #E74C3C, z50
│   │                       │   │
│   │  ĐIỂM     "12"        │   │  h2 28px / số type.display
│   │  [final-score]        │   │  data-testid=final-score
│   │                       │   │
│   │  ĐIỂM CAO  "34"       │   │  h2 28px / số type.display
│   │  [best-score]         │   │  data-testid=best-score
│   │                       │   │
│   │  ["Chơi lại"]         │   │  btn-primary 280×72 (lần chơi 1)
│   │  [data-testid=retry-btn]│  │
│   │  ┌───────────────────┐│   │
│   │  │ "Tiếp tục (xem ad)"│  │  btn-ghost 280×72 (lần chơi 2+, BR-09/10)
│   │  │ [continue-btn]     │  │  data-testid=continue-btn
│   │  └───────────────────┘│   │
│   └──────────────────────┘   │
│  ▓▓▓▓▓▓▓▓ cỏ ▓▓▓▓▓▓▓▓▓▓▓▓   │
└──────────────────────────────┘
- Panel `color.surface` trắng, bong ra từ scale 0.8→1 khi xuất hiện.
```
- **Bố cục 2 nút:** lần chơi 1 → chỉ có `retry-btn` (giữ chân, BR-09 không ad đầu). Lần chơi 2+ → thêm `continue-btn` (rewarded, BR-10 tối đa 1 lần/game over). Nút "Chơi lại" luôn ở trên, "Tiếp tục" ở dưới.
- Interstitial ad (BR-09) + `sendScore` chạy đúng lúc hiện panel.

---

## 5. ANIMATION & TRANSITION (dur + easing cụ thể)

> Easing dùng tên chuẩn Phaser: `quad`/`cubic`/`cubic.inout`/`elastic.out`/`back.out`/`linear`.

| # | Hiệu ứng | Duration | Easing | Chi tiết |
|---|----------|----------|--------|----------|
| 5.1 | Chuyển scene (Start→Tutorial→Gameplay→GameOver) | 300ms | `cubic.inout` | Fade toàn camera: alpha 0→1 (vào), 1→0 (rời). Không cắt nháy |
| 5.2 | Panel Game Over bung ra | 320ms | `back.out` (overshoot 1.1) | scale 0.8→1, alpha 0→1; nút xuất hiện sau 100ms delay |
| 5.3 | Mèo đổi lane / lật né | 120ms chính + 80ms hồi | `cubic.inout` | Mèo nghiêng theo hướng nhảy (rotate -15° khi lên, +15° khi xuống), tịnh tiến 160px theo trục, quay lại 0° khi tới lane. Tạo cảm giác cắt-lướt |
| 5.4 | Mèo idle (Start/đứng yên) | 1.6s lặp | `sine.inout` | Scale y thở: 1.0 → 1.04 → 1.0 (nhịp thở), đuôi đung đưa rotate ±8° |
| 5.5 | Score +điểm (pulse HUD) | 300ms | `back.out` | `score-label` scale 1→1.35→1, tạm đổi màu `#FFE082` rồi về `onaccent` |
| 5.6 | Popup `+1` né thành công | 600ms tổng | bay lên `quad.out`, fade·scale | tịnh tiến -80px theo trục, scale 0.7→1.2, alpha 1→0 ở 70% |
| 5.7 | Ong bay tới (spawn→chạm) | theo tốc độ khó (xem §9) | `linear` | Ong từ phải (x = camera.right) → trái (x = camera.left - 120px), y cố định trong lane. Sin nhẹ dọc ±20px chu kỳ 1s để sinh động |
| 5.8 | Va chạm ong + mèo (Game Over) | 350ms | `cubic.out` | Camera `shake` 160ms biên độ 8px; lông/rơi: mèo xoay +30° và rơi -90px; overlay tối đưa vào |
| 5.9 | Nút (hover) | 120ms | `quad.out` | scale 1→1.03 |
| 5.10 | Nút (active) | 80ms | `quad.in` | scale →0.96, viền dưới co 6→2px |
| 5.11 | Loading spinner | 900ms lặp | `linear` | xoay vòng |
| 5.12 | Firework/Hạt +điểm streak | 400ms | `quad.out` | 12 hạt `color.success` bắn tỏa từ vị trí mèo, rơi xuống hết ~350px |
| 5.13 | **Level-up đổi palette nền** (BR-14) | 380ms | `cubic.inout` | Flash chuyển cảnh: overlay `color.surface` alpha 0→0.35→0 trong **300ms** trong lúc đổi `color.bg.*`/`color.grass`/`color.lane` sang palette level kế, rồi về trong suốt; phủ thêm `color.primary` flash nhẹ 1 frame. Tổng 300–400ms (`dur.slow` family). Đồng thời: `level-popup` (5.14) + đổi số/pulse `level-label` |
| 5.14 | `level-popup` xuất hiện | 1500ms tổng | vào `back.out`, ra `cubic.in` | scale 0.6→1 + alpha 0→1 (200ms in), giữ ~1.0s, fade 300ms (về alpha 0). Non-blocking, KHÔNG chặn input |
| 5.15 | `combo-popup` +5 (BR-15) | 700ms tổng | `quad.out` vào, `back.out` scale | bay lên -80px, scale pop 0.7→1.25→1, alpha 1→0 cuối; kèm hạt success (5.12), nhỉnh chậm hơn popup `+1` (5.6) để nổi |
| 5.16 | `record-popup` slide-in (BR-16) | 1600ms tổng | vào `back.out`, ra `linear` | slide từ trên (y start `h*0.28` tịnh tiến xuống) + alpha 0→1 + scale 0.8→1 (250ms), giữ ~1.0s, fade 350ms; tia sáng `color.warning` 2 bên banner |

> **Nguyên tắc:** mọi chuyển frame đều có dur tường minh, KHÔNG để mặc định leap. Character nudity/kinh dị KHÔNG có.

---

## 6. FEEDBACK & ERROR STATES

### 6.1 Hành động ĐÚNG (feedback tích cực)
| Sự kiện | Visual (không lệ thuộc âm thanh) |
|---------|----------------------------------|
| Né thành công | popup `+1` (5.6) + hạt `color.success` (5.12) + pulse HUD (5.5) |
| **Level-up** (mỗi 10đ) | flash đổi palette nền (5.13) + `level-popup` "Cấp {n}" giữa màn (5.14) + đổi `level-label` + tăng tốc ong (BR-17). Có âm thanh nấc "level-up" chuông + luôn có visual (stroke nhấn mạnh) — không lệ thuộc âm |
| **Combo +5** (mỗi 5 lần né) | `combo-popup` "+5" tại mèo (5.15) + hạt success (5.12) + âm "ding" cao; visual đủ độc lập âm |
| **Kỷ lục mới** | `record-popup` banner "KỶ LỤC MỚI!" (5.16) + tia sáng warning + âm fanfare; visual nổi bật độc lập âm (không mute trắng) |
| Game over | camera shake + mèo rơi (5.8) + panel (5.2) |

### 6.2 `continue-btn` (rewarded) — loading
| Trạng thái | Hiển thị |
|-----------|----------|
| Đang request ad | nút `continue-btn` đổi text "Đang tải…", alpha 0.6, icon spinner 24px bên phải, disabled |
| Earned | fade 200ms → tắt panel, mèo hồi sinh, resume; 1 lần duy nhất (BR-10) |
| Not earned / cancel | revert nút về default, ở nguyên Game Over (KHÔNG cảnh báo nặng; chỉ flash viền an toàn) |

### 6.3 Save/load score (BR-11) — KHÔNG crash
| Tình huống | Xử lý |
|-----------|-------|
| `loadData` thành công | hiện `best-score` từ cloud |
| `loadData` lỗi / null | dùng hoàn toàn phiên hiện tại; hiện `best-score = 0` nếu chưa có; game vẫn chạy bình thường |
| `saveData` reject | im lặng bỏ qua, đánh dấu phiên không lưu; không toast lỗi, không chặn |

### 6.4 Khác
- Không có "điểm cao" (chưa save): hiện `best-score` = 0, và title hiện số bình thường — KHÔNG hiện placeholder sai.
- Không có mạng / offline: game 100% cục bộ, không khối (SPEC 7 network mất — không xử lý).

---

## 7. ACCESSIBILITY & THEME

- **Visual feedback độc lập âm thanh:** mọi hành động đều có hiệu ứng hình (pulse, hạt, shake, popup) — người điếc/mute vẫn biết chuyện gì xảy ra. Âm thanh là **phụ**, tự tắt khi platform mute (BR-04) và có toggle mặc định ON nhưng lặng.
- **KHÔNG phụ thuộc màu đơn lẻ:** ong nguy hiểm được truyền đạt bằng **3 kênh** — màu đỏ/cam, hình dạng (ong có cánh/râu rõ ràng, kích thước to), và chuyển động nhanh bất thường. Người mù màu vẫn phân biệt được hình dạng + tốc độ.
- **Contrast:** text trên nền ≥ 4.5:1; `onaccent` trên cam ≥ 4.5:1. Danh sách token §1.1 đã lock pass AA.
- **Touch target:** mọi nút ≥ 72px chiều cao (đủ ngón tay). Tap vùng core `game-canvas` bắt che phủ thủ công.
- **Theme:** game luôn sáng/nhiều màu, KHÔNG có dark mode riêng (tối giản M1) — nhưng overlay tối khi panel luôn đảm bảo focus panel.
- **Multi-palette KHÔNG phụ thuộc màu (BR-14):** đổi nền theo level là **mặt phụ**, trạng thái level luôn có **text "Cấp {n}"** trên `level-label` + `level-popup` — người mù màu / nền đêm tối vẫn biết level. Ong nguy hiểm giữ **3 kênh truyền đạt** (màu danger + hình + tốc độ) ở mọi palette, kể cả nền đêm/tím tối (đảm bảo đủ tương phản bằng stroke/outline).
- **Contrast mọi palette (BR-14):** ở level 2 và 3, `color.text.primary` (đậm) dùng trên panel/surface sáng; `color.text.onprimary` (trắng) dùng trên primary/nút — 2 cặp này lock AA trên **cả 3 nền** (không đổi màu chữ theo nền). `color.surface`/`color.text.onprimary` lấy từ DESIGN-SYSTEM §1.1.
- Không có văn bản chớp > 3Hz; không có màn toàn nhấp nháy.

---

## 8. UX CHECKLIST (manual review gate — anh Tuyền verify TRƯỚC khi cho code)

> Đạt hết mới coi là design spec "xong". Nếu thiếu → bổ sung vào DESIGN-SPEC rồi mới code.

- [ ] **Người mới ≤ 3 click** từ mở game tới hành động chính (né ong): click `start-btn` (1) → tutorial tự chạy (0 click, 3s) → chơi. ✅ đạt ≤ 2 click.
- [ ] **Nút rõ ràng:** mọi nút có label tường minh (Chơi / Chơi lại / Tiếp tục), kích thước ≥ 72px, state hover/active phân biệt.
- [ ] **Màn không quá tải:** ≤ 4 phần tử tương tác cùng lúc; Game Over panel ≤ 2 nút.
- [ ] **Chơi trong < 5s** từ mở (load): bundle tối thiểu, preload gọn, spinner cho thấy progress.
- [ ] **Contrast đủ:** kiểm tra các cặp §7 pass AA; chữ ≥ 18px.
- [ ] **Audio có toggle + tôn trọng mute platform** (BR-04): vào Game Over/ad/pause đều mute đúng.
- [ ] **data-testid khớp EXACT** SPEC 4.2: `start-btn` `tutorial-text` `game-canvas` `score-label` **`level-label` `level-popup` `combo-popup` `record-popup`** `final-score` `best-score` `retry-btn` `continue-btn`.
- [ ] **Không màn hình chờ thừa:** interstitial KHÔNG ở lần chơi 1/10s đầu (BR-09); rewarded tối đa 1 lần (BR-10).
- [ ] **PROGRESSION & RETENTION đủ:** level-up rõ ràng (`level-popup` + đổi palette nền + `level-label` đổi, copy "Cấp {n}")? combo thưởng thấy rõ (`combo-popup` +5 + hạt + âm)? kỷ lục động viên (`record-popup` banner, 1 lần/phiên)? difficulty tăng **từ từ** — 10s đầu THẤP rồi nhảy bậc ở mốc level (BR-17), KHÔNG dồn dập mất kiểm soát?
- [ ] **Responsive hiển thị đúng 9 mảnh aspect** (9:32→32:9) không cắt nút: xem §2.2.
- [ ] Phong cách nhất quán token §1, KHÔNG tự bịa màu.

---

## 9. THAM CHIẾU KHÔNG THUỘC DESIGN (tránh trùng lặp/mâu thuẫn)

> Mọi logic game, BR, dữ liệu nhân/ong, cơ chế khó, score theo thời gian, ads/save/score — **LÀ của SPEC.md + DATA-MODEL.md**, DESIGN-SPEC KHÔNG định nghĩa lại. Tham chiếu:
- **Logic tốc độ ong / số ong / nhịp tăng khó:** SPEC §4.1 (khó tăng theo thời gian: tốc độ · số ong · nhịp). Chi tiết value → DATA-MODEL.
- **User flow & state:** SPEC §3.1, §7 (Start→Tutorial→Gameplay→GameOver; continue 1 lần; interstitial sau lần 2+).
- **Business rules:** SPEC §6 (ads chỉ qua YouTube SDK BR-01, cấm network BR-02, size BR-03, pause/mute BR-04, responsive BR-05, 13+ BR-06, metadata BR-07, asset tĩnh+tween BR-08, interstitial BR-09, rewarded 1 lần BR-10, sendScore/saveData BR-11, nút rõ BR-12). **Progression/Retention:** BR-14 (level 10đ → multi-palette §1.1), BR-15 (combo +5), BR-16 (kỷ lục mới), BR-17 (difficulty curve) — design mô tả tại §1.1, §3.7, §5.13–5.16, §6, §7.
- **data:** DATA-MODEL.md (score, best, schema save/score, config `games/cuu-meo.yaml`).
- **Test:** E2E-TESTS.md (Hermes QA chạy Playwright + vision verify visual/usability nhóm).

> FILE NÀY = NGUỒN SỰ THẬT HÌNH THỨC M1. Code theo token §1, kích thước §3, màn §4, animation §5. CẤM hardcode HEX lộn xộn ngoài token; mọi component tham chiếu §1.