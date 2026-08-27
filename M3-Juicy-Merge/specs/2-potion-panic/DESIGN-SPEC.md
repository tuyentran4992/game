# M3v2 "Potion Panic" — DESIGN SPEC (visual)

> **Tầng 2 (per-module).** UI chrome dùng token từ `docs/DESIGN-SYSTEM.md` — file này CHỈ liệt kê token module dùng + **art-theme override** (quy tắc phân tầng của factory). KHÔNG tự bịa component core.
> Agent code bám số cụ thể. Anh Tuyền review TRƯỚC khi code.

---

## 1. DESIGN TOKENS (tham chiếu + override art-theme)

**Tham chiếu `docs/DESIGN-SYSTEM.md`** cho: type scale, spacing 4px grid, radius, shadow, motion durations, z-index, component core (Button/Modal/ScoreText/HUD pill, Particle — từ @game/core nếu hợp).

**Art-theme override POTION PANIC** (thay bảng Kawaii v1; KHÔNG dùng lại HEX v1):

| Token semantic (module) | HEX | Dùng |
|---|---|---|
| `pp.bg.deep` | `#120B23` | nền chung (đêm phù thủy) |
| `pp.bg.zone1` | `#1B1235` gradient → `#2A1B4E` | màn 1-10 (tầng hầm) |
| `pp.bg.zone2` | `#0F2A2A` → `#134436` | màn 11-20 (rừng độc) |
| `pp.bg.zone3` | `#2A1010` → `#4A1B0F` | màn 21-30 (lò cổ) |
| `pp.primary` | `#B44CFF` | nút chính, highlight |
| `pp.accent` | `#3DFF9E` | điểm/merge thành công (lục huỳnh quang) |
| `pp.warn` | `#FF8A3D` | danger line, heat 70+ |
| `pp.danger` | `#FF3D5A` | brew 100, fail |
| `pp.fire` | `#FF5A2D` (lõi `#FFD24A`) | nhánh Fire |
| `pp.water` | `#2DB8FF` (lõi `#A8EEFF`) | nhánh Water |
| `pp.earth` | `#5AD14A` (lõi `#D9FF7A`) | nhánh Earth |
| `pp.stone` | `#FFD76A` cầu vồng phủ | Philosopher's Stone |
| `pp.cauldron` | đồng `#8A5A2B` viền `#C98F45`, lòng `#0B0716` | nồi |
| `pp.surface` | `#241A3D` alpha .92 | panel HUD |
| `pp.text` / `pp.textDim` | `#F2EAFF` / `#9B8CC0` | chữ |

⚠ Pitfall factory: không icon trắng-trên-trắng — orb/kệ vẽ bằng màu theme, glow bằng `pp.accent`/element color.

## 2. LAYOUT GRID & BREAKPOINTS

- World thiết kế **portrait 720×1280** (9:16), Scale.FIT pillarbox desktop; aspect hỗ trợ 9:32→32:9 letterbox giữa, KHÔNG khóa orientation.
- Vùng an toàn: trên 120px (HUD), dưới 96px (thumb zone queue/pickup).
- Breakpoints: <480 co HUD pill còn icon+1 số; queue 3 orb ≥96px; 720-1080 chuẩn; >1080 pillarbox.

## 3. COMPONENTS

**PP-Button** = core Button + gradient `pp.primary`→`#7A2ED6`, radius 18, shadow btn 8px, chữ 22-24px bold `#FFF`, CẤM underline artifact (pitfall v1), tap scale .96→1 (120ms).
**Goal chip** (`goal-chip`): pill `pp.surface`, cao 44, icon mục tiêu 28 + chữ 18 `pp.text`; tick `pp.accent` khi đạt.
**Drop counter**: `DROPS 12/24` chữ 16, đếm nhấp nháy đỏ 300ms khi ≤3 còn lại.
**Orb** (`orb-<el>-<tier>`): circle, radius tier: 26/38/54/76px. Cấu trúc vẽ (programmatic Graphics, pattern M4 — KHÔNG PNG nếu chọn đường nhanh; hoặc WAN sprite phẳng theo §6): nhân lõi sáng (lõi HEX) → thân (element HEX) → vòng gương 30° trắng alpha .35 → sủi bọt 2-3 hạt nhỏ lên liên tục (motion loop 2s) → **viền heat**: lerp màu thân → `pp.warn` @70 → `pp.danger` @100 + pulse 2Hz khi ≥85.
**Heat ring** (`heat-bar-<orbId>`): cung tròn quanh orb từ 12h theo chiều kim, độ dày 4, màu heat; ẩn khi heat=0 (không white-on-white).
**Queue picker** (`element-picker`): hàng ngang 3 hũ rune dưới màn; hũ đang active viền `pp.accent` 3px + nâng 8px; chạm/rẽ ngang để đổi.
**Stir charges** (`stir-charges`): 3 chấm xoáy-tròn góc phải dưới, dùng → mờ 30%, hồi: xoay đầy 30s (conic tween).
**Order shelf** (`order-shelf`): giá gỗ đồng trên HUD, thẻ order 64×64, fulfilled → bay 400ms ease-out + sparkle.
**Brew FX**: flash trắng 60ms, rung camera 300ms (amp 12px decay), 24 particle lửa/xanh theo element, vòng xung kích scale 0→140px 350ms.
**Volatile merge FX**: vòng lục + text "VOLATILE +24" 900ms rise-fade.
**Stone fusion**: 3 orb hút về tâm xoáy 700ms → flash `pp.stone` → "PHILOSOPHER'S STONE +150" modal 1.5s không chặn input.
**Modal** = core Modal + viền gradient pp.primary; nút Continue/Retry ≥96px.

## 4. SCREEN-BY-SCREEN MOCKUP

``` Start (720×1280)
┌───────────────────────────┐
│   ☾ POTION PANIC ☾        │  logo 64px, chữ display gradient fire→stone,
│      [nồi sủi bọt động]    │  3 orb Fire/Water/Earth bay vòng quanh (tween)
│                           │
│      ▶ PLAY  (280×72)     │  start-btn → adventure (Saga map)
│    ADVENTURE  DAILY       │  adventure-btn / daily-btn
│    ENDLESS   ⚙            │  endless-btn / settings (lang globe + mute)
└───────────────────────────┘
```
``` Adventure map: lưới 30 node (stage-<n>) 6×5, sao vàng dưới node,
   node khóa mờ 40%; nút back 44px.
```
``` Gameplay
┌───────────────────────────┐
│ [goal-chip        ★★☆]    │  orders-label cạnh
│ [DROPS 12/24]   [STIR ●●○]│  drop-count / stir-charges
│ ┌───────────────────────┐ │
│ │  ╭ ╍ ╎ miệng nồi ╎ ╍ ╮ │ │  danger line = viền miệng pot
│ │ │   ~~nồi đồng~~    │ │ │  cauldron, trong lòng tối,
│ │ │  (orbs + heat)     │ │ │  2 thành cong + đáy tròn
│ │ └─────────────────────│ │
│ └───────────────────────┘ │
│ SCORE 148  BEST 902       │
│  [🜂🜄🜃 queue]  next:[🜄🜃🜂] │  element-picker, orb ghost theo pointer
└───────────────────────────┘
```
``` Game Over (stage fail): modal "BREWED OVER" + goal còn thiếu + RETRY/QUIT
  Stage clear: "BREW SUCCESS!" + sao rơi lần lượt 350ms + reward powerup icon +
  NEXT / REPLAY
  Endless over: score/best/record-popup + CONTINUE (rewarded, ≤1) + RETRY
```

## 5. ANIMATION & TRANSITION

- Orb rơi: physics thật; merge: scale-punch 1→1.25→1 (180ms) + 8 particles element.
- Heat pulse ≥85: 2Hz; brew: §3 Brew FX; stir: gợn xoáy 250ms + −heat float text.
- Scene transition fade 250ms. Loading nồi đầy 12 orb icon.
- Respect mute ngay cả trong transition.

## 6. ART DIRECTION — 2 đường (chọn 1 trước code)

- **A. 100% programmatic (pattern M4 — EM KHUYÊN):** Graphics API vẽ orb/nồi/nền như §3 → bundle nhẹ, không 404, không rủi ro WAN; aesthetic "neon elixir" hợp Glow. Không cần bước asset.
- **B. WAN sprites:** 12 orb + 3 queue rune + nồi + 3 nền (≈19 ảnh) prompt "flat 2D game icon, <element> liquid orb glowing, dark neon apothecary palette, isolated on pure white background, NO text" → khử nền + resize <512KB. Đẹp hơn nhưng chi phí + vẫn phải khác hẳn kawaii v1.
- Audio: motif mới bằng synth (gen_audio.py kiểu M4 hoặc file thật): drop=plop thủy tinh, merge=chime, heat tick, brew=boom+crackle, stir=whirl, order=bell, stone=fanfare, BGM dark-carnival 128bpm. **URL phải có đuôi .mp3** (pitfall).

## 7. FEEDBACK & ERROR STATES

- Hết charge Stir: chấm đỏ nhấp + toast "STIR COOLDOWN".
- Order sai: shake thẻ order 200ms.
- Save fail: im lặng + console (PP-07).
- Boundary UI: mọi nút tested ở 320px rộng.

## 8. UX CHECKLIST (gate anh Tuyền review trước code)

- ☐ ≤3 tap từ Start tới gameplay. ☐ Hàng đợi 3 element không quá nhỏ (≥96px). ☐ Heat đọc được trong 1s nhìn (viền+pulse). ☐ Nổ không gây "chết oan": có telegraph 70+. ☐ Không còn từ/cảnh trái cây nào của v1 (quét asset + string). ☐ Không chữ "Suika"/"Juicy"/"Merge" trong build. ☐ Mobile 9:16 chơi 1-thumb. ☐ Nút không underline artifact, không white-on-white. ☐ Contrast ≥4.5. ☐ Âm ngừng khi minimize.

## 9. TÀI LIỆU KHÔNG THUỘC DESIGN

Luật BR → SPEC §4, §6. Schema data → DATA-MODEL. Test → TEST-CASES/E2E-TESTS.
