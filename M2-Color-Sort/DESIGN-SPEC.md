# DESIGN-SPEC — M2 · "Neon Sort: Galaxy Pour" (NEON GALAXY)

> **Game:** Color Sort / Water Sort · Neon Galaxy art-theme
> **Tầng 2 của DESIGN-SYSTEM.** UI chrome (typography/spacing/radius/shadow/motion/z-layering/component core/feedback/accessibility) **THAM CHIẾU** `../docs/DESIGN-SYSTEM.md` — KHÔNG bịa lại.
> **File này GHI ĐÈ** các phần cho phép override theo design-system §1.0 (art-theme): màu nền art, màu chất lỏng neon, glow. Chữ/HUD/panel/nút dùng token system.
> **Art-theme chốt (anh Tuyền 2026-08-22):** nền tối **deep space gradient đen→tím**, chất lỏng **neon phát sáng glow** — khác hẳn apps "nước màu" truyền thống (nền xanh/nước trắng).
> **Source of truth logic:** SPEC M2 (luật đổ M2-01..11, data-testid §5). Đọc cùng nhau, thiếu gì tra về SPEC.
> Cập nhật: 2026-08-22 · Canvas Phaser 3 (KHÔNG HTML DOM) · responsive mọi aspect · khán giả 13+.

---

## 1. DESIGN TOKENS

### 1.0 NGUYÊN TẮC OVERRIDE (theo design-system §1.0)

| Thứ | Nguồn | Ghi chú |
|-----|-------|---------|
| `type.*` | DESIGN-SYSTEM | KHÔNG override |
| `sp.*` | DESIGN-SYSTEM | KHÔNG override |
| `radius.*` / `shadow.*` | DESIGN-SYSTEM | KHÔNG override (glow thêm riêng dưới `nz-shadow.*`) |
| `dur.*` / z-layering | DESIGN-SYSTEM | KHÔNG override |
| btn / panel / HUD / banner / spinner | DESIGN-SYSTEM §3 | KHÔNG override cấu trúc, chỉ lên màu art |
| **Màu nền game** `color.bg.*` | **ĐÈ ở file này** | deep space gradient |
| **Màu chất lỏng ống** | **THÊM ở file này** | palette neon `nz.liquid.*` |
| `color.primary` + `color.accent` | **ĐÈ ở file này** | tím neon (theo design-system cho phép đổi) |

> **Quy tắc cốt lõi:** **chất lỏng + nền = art Neon Galaxy** (đổi theo theme). **Chữ + HUD + nút + panel = token system** (giữ nhận diện chung). Không bao giờ để chữ tím-glitter trên nền tím-glitter.

### 1.1 Màu art — NỀN GAME (override `color.bg.*`)

| Token | HEX | Dùng |
|-------|-----|------|
| `color.bg.top` | `#0B0B1E` (đen-navy) | đỉnh gradient bầu trời |
| `color.bg.mid` | `#16123B` (tím đậm) | điểm giữa gradient |
| `color.bg.bottom` | `#2A1668` (tím magenta) | đáy gradient — ánh sáng hành tinh |

> **Ngoài 3 điểm gradient:** thêm vài **ngôi sao nhỏ** (chấm trắng alpha 0.20–0.60, đường kính 1–3px) phân bố ngẫu nhiên vùng trên (y < 60% height), nhấp nháy nhẹ (`dur.slow` sine, mỗi sao phase lệch) — chiều sâu rẻ tiền theo design-system §4. **Tinh vân/mây sáng tím nhạt alpha 0.05** dạng oval bo tròn mờ ở giữa (hướng mắt vào board). Không ảnh hưởng đọc HUD.

### 1.2 Màu art — PRIMARY / ACCENT (override)
| Token | HEX | Dùng |
|-------|-----|------|
| `color.primary` | `#B967FF` (tím neon) | nút chính, điểm nhấn |
| `color.primary.dark` | `#8E3CE0` | viền dưới / hover primary |
| `color.primary.grad` | `#B967FF → #D98DFF` | gradient nút chính (sáng lên khi hover) |
| `color.accent` | `#00E5FF` (cyan neon) | điểm nhấn phụ, glow ống chọn |

> Giữ nguyên semantic system: `color.success #2ECC71`, `color.danger #E74C3C`, `color.warning #FFC048` (dùng cho trạng thái đúng/sai/cảnh báo theo design-system, KHÔNG đổi ý nghĩa).

### 1.3 Màu art — PALETTE CHẤT LỎNG NEON (`nz.liquid.*`)
> Đây là **đồ chơi màu** của game. Neon sáng rực, khác biệt từng màu, đủ tương phản trên nền tối. **Cấm dùng 2 màu quá giống nhau trong cùng level** (xem §7). Tối thiểu 12 màu, dùng dần khi level tăng.

| Token | HEX | Hue | Ghi chú phân biệt |
|-------|-----|-----|-------------------|
| `nz.liquid.cyan` | `#00E5FF` | Cyan | đỉnh sáng nhất, dễ nhầm với trắng → tránh kèm `nz.liquid.white` |
| `nz.liquid.magenta` | `#FF2EC4` | Magenta | hồng-đậm neon |
| `nz.liquid.lime` | `#A8FF3E` | Lime | xanh chanh, rất sáng |
| `nz.liquid.amber` | `#FFC400` | Vàng cam | vàng nghệ neon |
| `nz.liquid.violet` | `#9D5CFF` | Tím | tím điện — tránh kèm `nz.liquid.blue` |
| `nz.liquid.blue` | `#2D8CFF` | Xanh dương | xanh đậm hơn cyan rõ rệt |
| `nz.liquid.red` | `#FF3B30` | Đỏ | đỏ neon |
| `nz.liquid.green` | `#00E56A` | Xanh lá | khác lime (đậm hơn, ít vàng) |
| `nz.liquid.orange` | `#FF7A00` | Cam | cam neon |
| `nz.liquid.pink` | `#FF6FD0` | Hồng | hồng pastel-hiện — khác magenta (nhạt hơn) |
| `nz.liquid.white` | `#FFFFFF` | Trắng | trắng tinh — thêm streak xám nhẹ để khác cyan |
| `nz.liquid.black` | `#2A2A4A` | Đen-tím | xám đen tím (vẫn thấy trên nền, có glow) |

> **Glow chất lỏng** (mỗi màu):
> - **Lớp 1 — gradient dọc:** từ `HEX` (đáy) → `HEX` sáng +25% (đỉnh lớp), tạo độ "phát sáng" theo chiều.
> - **Lớp 2 — glow ngoài:** vẽ viền mờ side/dưới bằng chính `HEX` với alpha 0.55, blur ~12px → halo neon quanh khối chất lỏng.
> - **Lớp 3 — đỉnh highlight:** dải trắng alpha 0.35 dày ~2px trên mặt thoáng lớp trên cùng (bề mặt ánh sáng).
> - Không dùng texture nhiễu/particle phức tạp (bundle nhỏ).

### 1.4 Tokens GLOW riêng Neon Galaxy (`nz-shadow.*`) — PHỤ TRỢ, không thay shadow system
| Token | Giá trị | Dùng |
|-------|---------|------|
| `nz.glow.tube` | glow blur 18px, alpha 0.30, `color.accent` (#00E5FF) | ống chọn (ring ngoài) |
| `nz.glow.liquid` | blur 12px, alpha 0.55, = HEX chất lỏng | halo quanh khối chất lỏng |
| `nz.glow.primary` | blur 24px, alpha 0.55, `color.primary` | nút chính/panel neon |

### 1.5 UI chrome tham chiếu (KHÔNG bịa — bảng đối chiếu)
| Nhóm token | Giá trị | Nguồn |
|------------|---------|-------|
| `type.display` 44/900 | tiêu đề, chữ nút chính | DESIGN-SYSTEM §1.2 |
| `type.h1` 36/800 · `type.h2` 28/800 | tiêu đề panel, label | §1.2 |
| `type.body` 24/700 · `type.small` 18/600 | nội dung, caption | §1.2 |
| `type.score` 30/800 | move-count, level-label | §1.2 |
| `sp.1..7` 4→48 | grid | §1.3 |
| `radius.sm` 12 · `radius.md` 20 · `radius.lg` 32 · `radius.pill` | bo góc | §1.4 |
| `shadow.btn` / `shadow.panel` | nút, panel | §1.5 |
| `dur.fast` 120 · `dur.base` 200 · `dur.slow` 400 · `dur.pop` 250 · `dur.hover` 180 | motion | §1.6 |
| `z.0..z.50` | layering | §1.7 |

---

## 2. LAYOUT

### 2.1 Camera & responsive
- **Design base:** camera world **1920×1080**, Phaser `Scale.FIT`, letterbox (dọc) / pillarbox (ngang). Game center, KHÔNG khóa orientation (theo design-system §2).
- **Hướng chính 9:16 dọc** (điện thoại). Board tự co theo viewport bằng **giãn cách ống**, KHÔNG co ống (giữ kích thước chạm ≥ 44px).

### 2.2 Cấu trúc 3 vùng (dọc)
```
┌────────────────────────────┐
│  SAFE  │   HUD (z.20)      │  ← level-label + move-count + nút audio
│ AREA   │   ┌─────┐         │     (cách mép ≥ sp.4, không dính notch)
├────────┼──────────────────┤
│        │   BOARD (z.10)    │  ← trung tâm, bảng ống
│ GAME   │   o o o o o       │
│ PLAY   │   o o o o o       │     lưới ống đều, giữa màn
│        │   o o o o         │
├────────┼──────────────────┤
│ SAFE   │  TOOLBAR (z.20)   │  ← undo / restart / hint (hàng dưới)
│ AREA   │  [undo][restart][hint] │
└────────────────────────────┘
```
- **HUD top:** trái = `level-label` (huy hiệu đĩa theo design-system §3.2, text "Lv 12"), cạnh đó `move-count` (icon ⤵ + số). Phải = nút âm thanh (thuộc system, data-testid `audio-toggle`).
- **Board:** giữa, cao chiếm ~55–65% chiều cao camera, cột ống căn đều.
- **Toolbar:** hàng ngang 3 nút ở ~12–15% dưới cùng, là nút icon/ghost (design-system §3.1) — to, tương phản trên nền tối.

### 2.3 Lưới ống (số cột theo width)
| Chiều rộng khả dụng | Số cột | Ghi chú |
|---------------------|--------|---------|
| ≥ 1500px (16:9/21:9 ngang bọc) | cột = ceil(ống/2), tối đa 7 | board thấp, ống to |
| 900 – 1499px | cột = ceil(ống/2) | cân bằng |
| < 900px (9:16 dọc) | cột tối đa 5, ống nhỏ hơn | hàng ống xếp dọc tự nhiên |

> Ống KHÔNG co dưới 44px ngang; nếu không vừa → tăng số hàng (cuộn không áp dụng trong level thường, board sinh đủ vừa).

### 2.4 An toàn
- Safe area HUD ≥ `sp.4` (16px) mọi mép. Không có phần tử tương tác sát ngoài khuất.
- Board/toobar nằm trong vùng an toàn khi notch (điện thoại).
- Rule touch: mọi nút và ống vùng chạm ≥ 44×44px (design-system §2).

---

## 3. COMPONENTS (art Neon Galaxy trên nền component core)

> Cấu trúc/token layout theo design-system §3; ở đây **chỉ đặc tả riêng phần art Neon Galaxy + thành phần mới của game** (ống, chất lỏng, board, glow chọn). Component core (btn-primary/ghost, HUD score, panel, banner, spinner) mặc định áp dụng y nguyên, trừ khác biệt ghi rõ.

### 3.1 Tube — Ống thủy tinh (data-testid `tube-<i>`)
| Thuộc tính | Giá trị |
|-----------|---------|
| Kích thước | rộng 84px, cao 200px (co tối thiểu 44×120 khi viewport nhỏ) |
| Hình dạng | thân thẳng, **đáy bo tròn** `radius` ~40px (nửa elip dưới) |
| Thân ống | **thủy tinh**: fill gradient xám-alpha 0.18→0.05 (trong suốt thấy chất lỏng), **2 sọc dọc sáng alpha 0.30 bên trái** (phản chiếu kính) |
| Viền | **2 nét**: nét ngoài mảnh (2px) trắng alpha 0.20; nét trong mảnh (1.5px) trắng alpha 0.40 — tạo cảm giác kính cong |
| Miệng | ngang viền trên 2px trắng alpha 0.35 (loe nhẹ) |
| Đáy | ellipse trắng alpha 0.25 (đế đứng) |

**Trạng thái ống:**
| State | Thay đổi |
|-------|----------|
| default | như trên |
| selected (nguồn) | **ring glow ngoài:** viền `color.accent` #00E5FF 3px, `nz.glow.tube` blur 18px alpha 0.30, scale 1.04, `dur.fast` |
| hover (có thể đổ) | viền ngoài sáng hơn alpha 0.45, `dur.hover`, scale 1.02 |
| đổ không hợp lệ | rung `dur.slow` shakeX ±4px ×3, viền nhấp `color.danger` (xem §6) |
| full | miệng thêm vạch vàng alpha 0.2 (mờ, không quan trọng) |

### 3.2 Liquid — Chất lỏng trong ống
| Thuộc tính | Giá trị |
|-----------|---------|
| Render | khối fill per-layer (đổ từ đáy lên), mỗi layer màu `nz.liquid.*` |
| Xếp lớp | lớp đáy cùng → lớp đỉnh. Giữa 2 lớp: **đường ngăn 1px** tone tối hơn màu lớp dưới 20% (tách khối rõ) |
| **Mặt thoáng (lớp trên cùng)** | bo tròn nhẹ phần trên khối (gợi bề mặt úp cong), thêm highlight trắng alpha 0.35 dày 2px ngay đỉnh |
| Giáp thành | để hở **khe 3px** giữa khối chất lỏng và thành trong (thủy tinh + chất lỏng tách bạch) |
| Glow | `nz.glow.liquid` quanh phần ngoài khối (alpha 0.55) → neon phát sáng |
| Màu | từ `nz.liquid.*` palette; mỗi level chỉ dùng subset, KHÔNG dùng 2 màu khó phân biệt cùng lúc |

### 3.3 Board (data-testid `board`)
- Vùng chứa ống, không nền riêng (trong suốt trên nền galaxy) — hoặc vành khu vực cực nhạt alpha 0.04 `color.primary` `radius.lg` (định khung mắt, không tranh chấp chất lỏng).
- Ống căn đều giữa theo §2.3.

### 3.4 Buttons — Undo / Restart / Hint (data-testid theo SPEC §5)
- Kiểu: **btn-ghost theo design-system §3.1** nhưng điều chỉnh cho nền tối (override fill): nền `#FFFFFF` alpha 0.08, viền 4px `color.primary` (#B967FF), text `type.body` 24/700 `color.surface` (#FFFFFF).
- Kích thước: mỗi nút hình **pill** cao 72px, rộng theo icon+text +32px. Ở 9:16 hẹp → thu gọn thành **icon-only 72×72** (icon + tooltip caption ngắn bên dưới via `type.small`).
- Icon: **Undo** ↺ · **Restart** ⟳ · **Hint** 💡 (vẽ bằng Phaser Graphics, glyph/triangle — không cần sprite asset).
- Trạng thái hover/active/disabled/focus theo design-system §3.1 (scale 1.03 → 0.96, `dur.hover`/`dur.fast`). Icon Hint có thêm glow chạy nhẹ để gợi "rewarded".
- `data-testid`: `undo-btn` / `restart-btn` / `hint-btn`.

### 3.5 Start / Panel — trên nền galaxy
- **btn-primary** (design-system §3.1) nhưng **màu art**: fill `color.primary` #B967FF, viền dưới `color.primary.dark` #8E3CE0, thêm `nz.glow.primary` blur 24px — nổi trên nền tối.
- **Level Clear panel** (design-system §3.3): fill `color.surface` alpha 0.92 (thấp hơn default 1.0 để mặt panel vẫn thấy xuyên chút galaxy — nhưng giữ ≥ đọc tốt), border 4px `color.primary`, `shadow.panel`. Chữ `color.text.primary` #3A2E39 (vẫn semantic đọc trên surface sáng).

---

## 4. MOCKUP (ASCII)

### 4.1 Start (data-testid `start-btn`)
```
┌──────────────────────────────┐
│  ✦        ✧   ✦   ✧          │   ← galaxy + sao (nền gradient 0B0B1E→2A1668)
│      ✦          ✧      ✦     │
│                              │
│    ┌──────────────────┐      │
│    │   NEON SORT       │      │   Title type.display 44/900, color.surface
│    │    GALAXY POUR   ✦│      │   (có stroke đậm để đọc trên nền sáng nền)
│    └──────────────────┘      │
│        (minh họa 1 ống       │   ~ tube đổ neon glow, nhấp nháy nhẹ
│         chất lỏng neon)      │
│                              │
│      ┌───────────────┐       │
│      │ ▶   CHƠI     │       │   btn-primary (data-testid: start-btn)
│      └───────────────┘       │   fill #B967FF + nz.glow.primary
│         [Lv 1 bắt đầu]       │   type.small caption
└──────────────────────────────┘
```

### 4.2 Gameplay (data-testid: board, tube-<i>, level-label, move-count, undo-btn, restart-btn, hint-btn)
Người chơi đang chọn **từ nguồn ống 2 (magenta đỉnh)**:
```
┌──────────────────────────────┐
│ (Lv 3)  ●Lv    Moves: 12     🔊│   HUD: level-label, move-count, audio-toggle
│ [score/badge]  [icon+num]    │
├──────────────────────────────┤
│        ╭───╮                  │
│      ╭─┤mag ╠─╮   ╭───╮      │   tube-2 SELECTED (ring accent glow cyan)
│   ╭─┤ │cyan│ │ │ │mag│ │      │   ↑ nguồn; tube-5 không cùng màu đỉnh
│   │ │ │mag │ │ │ │ amb│ │     │       → táp sẽ rung lỗi
│   │ │ │mag │ │ │ │red │ │     │
│   │ │ │cyan│ │ │ │lime│ │     │
│  ╭┴─┴─┴────╴┴─┴─┴───┴─╯      │   7 ống, capacity 4, vài ống 1-màu/trống
│   (tube-1)(t2)(t3)(t4)(t5)    │
│   ╭───╮   ╭───╮   ╭┄┄┄╮      │   t6=full đơn sắc cyan (sáng đỉnh)
│   │cy ││... │cy │ ... │      │
│   └───┘   └───┘   └┄┄┄┘      │
├──────────────────────────────┤
│   [↺ Undo]  [⟳ Restart]  [💡 Hint] │   undo-btn, restart-btn, hint-btn
└──────────────────────────────┘
```
> Chú thích: `mag`=magenta, `cyan`=cyan, `amb`=amber, `red`=red, `lime`=lime; `╭┄┄╮`=ống trống thủy tinh.

### 4.3 Level Clear popup (data-testid: next-level-btn)
```
┌──────────────────────────────┐   overlay z.40 (color.overlay 0.55)
│        ✦   ✧  ✦               │
│    ✦✧  ✦ ✧ ✦ ✧  ✦            │   confetti (particle neon)
│  ┌────────────────────────┐   │
│  │   🎉  HOÀN THÀNH!      │   │   panel (z.50) type.h1, color.success glow
│  │   Moves: 12  ★Best: 9  │   │   type.score + type.body
│  │   ┌───────────────┐    │   │
│  │   │  LEVEL TIẾP │    │   │   btn-primary (data-testid: next-level-btn)
│  │   └───────────────┘    │   │   → interstitial ad rồi qua level kế
│  └────────────────────────┘   │
└──────────────────────────────┘
```

---

## 5. ANIMATION (motion tokens từ design-system §1.6)

| # | Hoạt cảnh | Diễn biến | dur / easing |
|---|-----------|-----------|--------------|
| A1 | **Đổ chất lỏng (đổ từ nguồn → đích)** | (a) trước khi đổ: nguồn **co scale 0.94 để"chuẩn bị"** `dur.fast`; (b) ống nguồn nghiêng nhẹ góc ~12° về phía đích; (c) khối chất lỏng đỉnh (các layer cùng màu được đổ) **tách khỏi nguồn, bay theo cung** ngắn sang miệng đích, scale thu nhỏ tại vệt bay; (d) tại đích: khối **rơi xuống lấp vào chỗ trống** (y từ miệng → đáy/trên lớp hiện), fade-in mượt; (e) level chất lỏng **nguồn giảm dần** (khối tách làm chiều cao nguồn co lại), đích tăng dần — cả 2 cập nhật đồng bộ trong cùng tween (~150–220ms tổng). KẾT THÚC: khối đổ chạm → **ripple** 1 vòng ellipse trên mặt thoáng đích alpha fade-out `dur.pop`. | đổ: 200ms `dur.base` ease-out; ripple: `dur.pop` 250ms |
| A2 | **Glow chọn ống** | khi tap ống nguồn: ring accent xuất hiện `dur.fast` + có **glow pulse** lặp (scale ring 1.0↔1.06, alpha 0.30↔0.55, sine) tới khi bỏ chọn. | xuất hiện `dur.fast`; pulse `dur.slow` sine lặp |
| A3 | **Đổ hợp lệ xong** | ống đích nhấp nháy 1 lần `color.success` trên vành miệng. | `dur.fast` |
| A4 | **Level Clear** | confetti neon (chấm/vạch 1–3px, màu palette, nổ từ giữa màn, rơi + xoay) `dur.slow`; đồng thời mỗi ống đã clean glow sáng `color.success` flash; sau đó panel slide-up `dur.slow`. | confetti `dur.slow` 400ms ease-in-out; panel slide `dur.slow` (design-system) |
| A5 | **Nút hover / press** | scale 1.03 (`dur.hover`) → press scale 0.96 + viền đậm (`dur.fast`) — theo design-system §3.1. | `dur.hover` 180 / `dur.fast` 120 |
| A6 | **Hint highlight** | sau khi xem rewarded: ống nguồn+nước đi đúng lần lượt bắt ring glow cyan nhấp nháy 3 lần (mỗi 300ms) rồi giữ glow ở nguồn. | `dur.slow` lặp ×3 |
| A7 | **Extra tube xuất hiện** (rewarded) | ống trống factory-animate: scale từ 0 → 1 `dur.pop` + drop nhẹ từ trên xuống. | `dur.pop` 250ms back.easeOut |
| A8 | **Scene enter** | Start→Gameplay: fade cross `dur.base`. | `dur.base` 200 |

> Mọi animation phải **không chặn tap quá lâu**: giữ interactive giữa 2 nước đổ ≥ 40ms sau khi đổ tween xong; move-count cập nhật ngay khi tween bắt đầu (feel instant).

---

## 6. FEEDBACK / ERROR (kết hợp design-system §6 + riêng Neon Galaxy)

| Tình huống | Phản hồi visual | Sfx |
|------------|-----------------|-----|
| **Đổ hợp lệ** | ống đích nhấp `color.success` 1 lần (§5 A3) + move-count pop `dur.pop` | "glug" dứt khoát, nốt cao |
| **Đổ không hợp lệ** (đỉnh khác màu / đích đầy — M2-01) | ống nguồn **rung shakeX ±4px ×3** `dur.slow` + viền nháy `color.danger`; KHÔNG đổi board; nguồn vẫn giữ glow chọn (người chơi hiểu là chưa hợp lệ thay vì mất chọn) | "không được" (buzz trầm) |
| **Level Clear** (M2-02) | confetti neon + panel slide-up + `color.success` flash ống | thang âm clear tăng dần + tiếng reo |
| **Kẹt (no legal move)** (M2-03) | sau 1.2s không đổ gì hợp lệ: tooltip nhỏ "Dùng Undo / Restart nhé" (TutorialBanner `type.small`, `color.warning` icon) hiện 3s rồi fade `dur.base`, đặt giữa toolbar | tiếng nhắc nhẹ |
| **Hint** (rewarded, M2-06) | sau xem ad: highlight nước đi (§5 A6) | ding gợi ý |
| **Extra tube** (rewarded, M2-06) | ống mới drop-in (§5 A7) | đồng tiền/ấm |
| **Undo** (M2-05) | khối chất lỏng đi ngược về ống cũ (tween ngược §5 A1), move-count giảm | glug ngược trầm |
| **Restart** (M2-05) | board fade `dur.base` → về board gốc, move-count = 0 | reload swish |
| **Save/load lỗi** (M2-08) | im lặng, fallback mặc định, ghi console | mutes |
| **Bấm nút** | `dur.fast` scale 0.96 (design-system §6) | click ngắn |

> Nguyên tắc: tình huống lỗi = không mất tiến trình (nước đi xuất / chọn ống). Luôn có **2 kênh** (visual + sfx) cho mọi phản hồi quan trọng (accessibility §7).

---

## 7. ACCESSIBILITY

- **Tương phản:** chữ trên nền tối dùng `color.surface` #FFF (≥ 13:1 trên nền 0B0B1E — vượt AA). Chữ trên panel (surface sáng) dùng `color.text.primary` #3A2E39 (theo design-system §7). **HUD luôn có `color.text.stroke`** (viền đặc `rgba(0,0,0,0.55)`) để đọc trên vùng galaxy biến đổi.
- **Chất lỏng đừng phụ thuộc màu duy nhất:** mỗi `nz.liquid.*` có **độ sáng khác biệt** + **glow độ khác biệt**; thêm **pattern mảnh trên sourface** cho 2 màu cùng họ khi bắt buộc (vd `nz.liquid.blue` + `nz.liquid.violet` cùng level → kẻ sọc 45° mờ trên 1 trong 2). Level generator **tự động tránh** cặp màu quá giống (check delta-E > 30) — theo SPEC §4.3.
- **Không phụ thuộc âm thanh:** mọi sfx đều có visual tương đương (§6). Có nút `audio-toggle` HUD.
- **Trạng thái ống chọn / lỗi** truyền 2 kênh: màu (accent/danger) + hình (ring glow / rung) — không riêng màu.
- **Kích thước chạm** ≥ 44×44; **chữ tương tác ≥ 18px** (design-system §2/§1.2).
- Khán giả 13+ — không nội dung gớm/đáng sợ; neon chỉ là nghệ thuật.

---

## 8. UX CHECKLIST

- ☐ **Người mới ≤ 3 tap tới hành động chính:** Tap ▶ Chơi (1) → (tutorial) tap ống A chọn (2) → tap ống B đổ (3). Level 1 có TutorialBanner ngắn "Chọn & đổ màu" 3s.
- ☐ **Màu chất lỏng nhìn 1 chút là phân biệt** (§7 delta-E guard) — không yêu cầu đọc HEX.
- ☐ **Đổ trực quan:** nước đi bay theo cung rõ ràng + level 2 ống tăng/giảm đồng bộ (§5 A1) — người chơi thấy điều gì xảy ra mà không cần đọc.
- ☐ **Chọn nguồn giữ lại khi đổ sai** (không mất chọn) → sửa sai tức thì.
- ☐ **Không trừng phạt:** không timer, không mất mạng; undo/restart rẻ và sẵn (M2-05).
- ☐ **Không kẹt âm thầm:** tooltip kẹt tự hiện (M2-03), hint rewarded gợi ý chủ động.
- ☐ **Board luôn sinh giải được** (M2-04) — người chơi không gặp ngõ cụt bất công.
- ☐ **Move-count + level rõ ràng** ở HUD; clear popup báo thành tích (moves/★best).
- ☐ **Responsive** không méo/cắt, board giữ dùng được mọi aspect (9:16 chính, 16:9/1:1 bọc).
- ☐ **Cảm giác neon "đang sống":** glow pulse ống chọn + sao nhấp nháy + ripple khi đổ — polish hiện đại, khác apps nước cũ.

---

## 9. THAM CHIẾU LOGIC / BR → SPEC

| Yêu cầu visual ở file này | BR / nguồn |
|---------------------------|-----------|
| Ống capacity 4 level đầu, đổ chuỗi cùng màu đỉnh | SPEC §4.1 |
| Board sinh giải được | SPEC §4.2 / M2-04 |
| Đổ chỉ khi đích trống or cùng màu; lỗi→rung+danger | SPEC §4.1 / M2-01 |
| Thắng = ống 1 màu/trống → clear + confetti + next | SPEC §4.1 / M2-02 |
| Undo/Restart/Hint/Extra-tube + data-testid | SPEC §5, §6 / M2-05, M2-06 |
| Interstitial giữa level (không level đầu) | SPEC §6 / M2-07 |
| saveData best/current level + fallback im lặng | SPEC §6 / M2-08 |
| Responsive + touch+mouse + pause/mute + 13+ | SPEC §6 / M2-11 |
| Token UI chrome type/spacing/radius/shadow/motion/z | DESIGN-SYSTEM §1, §2, §3 |
| btn/panel/HUD/banner/spinner core | DESIGN-SYSTEM §3 |
| Art-theme override được phép (nền, primary, art) | DESIGN-SYSTEM §1.0 |

---

*File này = source of truth VISUAL M2 (NEON GALAXY). Logic/luật/BR → đọc SPEC M2. UI chrome → DESIGN-SYSTEM. Agent code theo các token HEX + bảng trên, không tự bịa màu/glow khác.*