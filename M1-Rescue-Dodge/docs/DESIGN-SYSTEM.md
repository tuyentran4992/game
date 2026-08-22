# DESIGN-SYSTEM — Token hệ thống (YouTube Playables Games · M1)

> **Quy ước đặt tên:** mọi token truy cập bằng **dấu chấm** theo namespace (ví dụ `color.primary`, `type.display`, `sp.4`, `radius.md`, `shadow.btn`, `dur.pop`, `z.40`). Token ở đây là **nguồn sự thật cho UI chrome** (typography, spacing, radius, shadow, motion, semantic, surface/text). Art-theme riêng từng game override `color.*` theme tại DESIGN-SPEC.md của game đó — KHÔNG tự bịa lại token hệ thống.
> **Mức áp dụng:** M1 "Cứu Mèo" + mọi game Playables về sau. Token CẤM hardcode HEX lộn xộn ngoài token.

---

## 0. Quy tắc art-theme override
- Mỗi game có DESIGN-SPEC riêng ghi đè `color.bg.*`, `color.grass`, `color.lane`, `color.primary`, `color.accent`… cho thế giới nghệ thuật của game.
- Token **semantic** (`color.success` / `color.danger` / `color.warning`), `color.surface`, `color.text.*` GIỮ NGUYÊN từ hệ thống (không đổi theo game/level) — đảm bảo contrast AA §7 mọi nền.
- Mọi component tham chiếu token, KHÔNG hex trực tiếp.

---

## 1. TOKEN

### 1.1 Color (semantic + surface/text — KHÔNG đổi theo game/level)
| Token | HEX | Công dụng |
|-------|-----|-----------|
| `color.surface` | `#FFFFFF` | Nền panel / hộp thoại |
| `color.surface.dim` | `#9ED8FF` | Panel semi-transparent (tutorial) |
| `color.text.primary` | `#3A2E39` | Chữ trên nền sáng |
| `color.text.onaccent` | `#FFFFFF` | Chữ trên nền cam/primary |
| `color.text.onprimary` | `#FFFFFF` | Chữ trên nút primary |
| `color.success` | `#2ECC71` | +điểm, vòng sáng né |
| `color.danger` | `#E74C3C` | Va chạm, game over |
| `color.warning` | `#FFC048` | Kỷ lục mới |
| `color.overlay` | `#000000` (alpha 0.55) | Tối hậu cảnh khi panel mở |
| `color.shadow` | `#000000` (alpha 0.25) | Đổ bóng chung |

> Art-theme `color.primary` / `color.accent` / `color.bg.*` / `color.grass` / `color.lane` được định nghĩa tại `DESIGN-SPEC.md` §1.1 của từng game (gồm multi-palette theo level).

### 1.2 Type
| Token | Size | Weight | Line-height |
|-------|------|--------|-------------|
| `type.display` | 44px | 900 | 1.1 |
| `type.h1` | 36px | 800 | 1.15 |
| `type.h2` | 28px | 800 | 1.2 |
| `type.body` | 24px | 700 | 1.3 |
| `type.small` | 18px | 600 | 1.3 |
| `type.score` | 30px | 800 | 1.0 |

Font: system sans-serif (KHÔNG nhúng font — giữ bundle nhỏ). Tối thiểu size ≥ 18px.

### 1.3 Spacing (4px grid)
| Token | Giá trị |
|-------|---------|
| `sp.1` | 4px |
| `sp.2` | 8px |
| `sp.3` | 12px |
| `sp.4` | 16px |
| `sp.6` | 24px |
| `sp.8` | 32px |

### 1.4 Radius
| Token | Giá trị |
|-------|---------|
| `radius.sm` | 12px |
| `radius.md` | 20px |
| `radius.lg` | 32px |
| `radius.full` | ½ chiều cao (pill) |

### 1.5 Shadow (dx, dy, blur, alpha)
| Token | dx | dy | blur | alpha |
|-------|-----|-----|------|-------|
| `shadow.btn` | 0 | 6px | 12px | 0.30 |
| `shadow.panel` | 0 | 10px | 24px | 0.35 |
| `shadow.char` | 0 | 4px | 8px | 0.25 |

### 1.6 Motion (duration)
| Token | Giá trị |
|-------|---------|
| `dur.fast` | 80ms |
| `dur.tn` | 120ms |
| `dur.scene` | 300ms |
| `dur.pop` | 320ms |
| `dur.level` | 380ms |
| `dur.hold` | 1000ms |
| `dur.slow` | 1500ms |
| `dur.banner` | 1600ms |
| `dur.spinner` | 900ms |

> Easing tên chuẩn Phaser: `quad` / `cubic` / `cubic.inout` / `elastic.out` / `back.out` / `sine.inout` / `linear`.

### 1.7 Z-index (thứ tự vẽ canvas)
| Token | Giá trị |
|-------|---------|
| `z.bg` | 0 |
| `z.actor` | 10 |
| `z.hud` | 20 |
| `z.tutorial` | 30 |
| `z.overlay` | 40 |
| `z.panel` | 50 |

---

## 2. Component core (tham chiếu token)
- **Nút primary** (`btn-primary`): pill `radius.lg`, fill `color.primary`, viền `color.primary.dark`, text `type.display` `color.text.onaccent`, `shadow.btn`.
- **Nút ghost** (`btn-ghost`): surface FFF, viền `color.primary`, text `color.text.primary`.
- **Panel**: `radius.lg`, `color.surface`, border `color.primary`, `shadow.panel`.
- **HUD badge**: `radius.full`, `color.primary`, text `type.score` `color.text.onaccent`.
- **Spinner**: 48px, `color.primary` phần quay, `dur.spinner` linear.

---

*Token hệ thống = nguồn sự thật UI chrome. Art-theme từng game tại DESIGN-SPEC.md của game đó.*
