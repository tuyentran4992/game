# ART-PASS — M1 "Cuu Meo - Bee Dodge" (27/08)

> Chuẩn nguồn: `docs/DESIGN-SYSTEM.md` §4 PREMIUM CASUAL. M1 build từ thời chuẩn cũ "flat pastel" → chưa qua Art QA gate §4.5. File này = bệnh án + toa thuốc để coding agent nâng cấp TRƯỚC KHI upload Playgama/Mediacube.
> Bối cảnh rủi ro: Playgama đã có `Cat-Ball: Dodge` (mèo né đồ rơi) + 3 game "draw line cứu mèo khỏi ong" → mình không trùng cơ chế, nhưng nếu art + thumbnail nghiệp dư thì dễ bị ăn "substantially similar" như bài học M3 (reject không nộp lại được).

## 🔴 BỆNH 0 — CHÍ TỬ: thumbnail là màn hình GAME OVER
`build/metadata/thumbnail_1x1.png` (và nhiều khả năng cả 5x7/16x9 — agent phải kiểm tra) là **screenshot Game Over**: hộp trắng + chữ đỏ + nút Retry. Không mèo, không ong, không lane. Thumbnail không bán được chủ đề = 0.5s lướt là trôi, và nền tảng đánh tụt CTR.
**Toa:** làm KEY ART MỚI theo §4.2 DESIGN-SYSTEM:
- Bố cục: mèo (biểu cảm sợ/hét hài) chiếm ≥55% chiều cao, 1-2 con ong đang lao có vệt speed, 3 lane mờ phía dưới gợi cơ chế, KHÔNG chữ (platform tự đè).
- Neo màu IP: cam mèo + vàng mật ong nền ấm → thumbnail có "màu nhận diện" riêng.
- Export 3 ratio 1x1 / 5x7 / 16x9, test 240px còn đọc "mèo né ong" = đạt.
- Prompt WAN 2.7 tham khảo: `cute orange tabby cat scared face looking at angry bee swooping at it, three running lanes below, candy 3D look, soft gradient shading, glossy highlight, thick cartoon outline darker than fill, warm honey-gold gradient background, centered composition, no text`

## 🟠 BỆNH 1 — sprite mèo/ong/cá: illustration đẹp nhưng "mềm", chưa candy
Soi `cat_idle.png`: airbrush gradient mềm (không phải 3-tone block sắc), THÂN không gloss specular, viền mảnh và thiếu ở vùng trắng (bụng/mõm), bóng đổ xám thuần lệch hue, không rim light, không bounce light. Đặt lên nền màu sẽ "chìm" khi thu nhỏ.
**Toa — regenné toàn bộ actor qua template §4.4** (giữ pose thiết kế hiện tại, đổi render):
- Danh sách asset: `cat_idle, bee_wasp, fish_item, fish_coin`, 3 skin `cat_tuxedo, cat_royal, cat_astro`.
- Mọi sprite phải đạt bộ 5: **3-tone block crisp** (sáng/giữa/tối sắc cạnh, không tan) + **gloss vệt trắng α0.6 góc 45° trên đỉnh đầu/má** + **outline 4px hue-matched đậm** (cam→`#8C3E05`, ong đen→nâu đậm, KHÔNG #000) + **rim light** mảnh viền trên-đối diện gloss + **bóng đổ tint hue** (cam-nâu ấm, không xám).
- Bo tròn các lọn lông nhọn (toy-like), thêm contact shadow giữa chi chồng (chân giơ vs thân).
- Mắt "gummy": gradient dọc + bounce sáng đáy mắt.
- Nền trơn khi gen (phẳng 1 màu xanh lá) để pipeline cắt nền không phá ảnh.

## 🟡 BỆNH 2 — nền palette các level flat 2 dải
`bg_pal_morning/sunset/night` + tokens.ts: gradient sky→grass phẳng, không depth.
**Toa:** giữ palette per-level nhưng thêm: vignette α≤0.10, cỏ có dải đậm nhạt 2 tông + 3-4 bụi tròn candy (bo, có gloss nhỏ), vạch lane `color.lane` tăng alpha lên đọc được 3 lane ngay cả khi squint.

## 🟡 BỆNH 3 — JUICE chưa đạt §4.3
-bee trúng mèo: hiện chỉ flash đỏ — thêm squash mèo (scaleY 0.85→1.1→1, `dur.pop`), micro-shake ≤4px, particle **vàng mật ong + trắng** (không đỏ mặc định).
- Qua lane an toàn/level-up: floating text "+1"/"LEVEL UP" bay lên fade (`type.h2` + stroke), confetti level-up màu palette level đó.
- Input đổi lane: mèo nghiêng thân 8-10° theo hướng di chuyển + 2 vệt bụi chân (chống cảm giác "trượt băng").
- Anticipation ong: ong xuất hiện có 1 beat scale 0.9→1 trước khi lao.

## ⚪ BỆNH 4 — HUD/nút
Nút Retry/Play đã có bóng nhưng flat fill. Áp §4.1: `color.primary.grad` + viền dưới `primaryDark` 6px + gloss vệt trên 1/3 nút + scale press 0.96 (`dur.fast`). Panel GameOver: thêm gradient trắng→`surfaceDim` rất nhẹ cho "dày".

## GATE NGHIỆM THU (art QA §4.5, em soi trước khi anh bấm upload)
1. Thumbnail mới 240px đọc ra "mèo né ong" trong 0.5s?
2. Nghiêng mắt screenshot gameplay: mèo+ong tách khỏi nền?
3. ≤3 hue chiếm sóng mỗi level palette?
4. Cat/bee/fish/nút đủ bộ gradient-block + gloss + viền hue + bóng tint?
5. Particle/floating text đúng màu chủ thể (mật ong, không đỏ-mặc-định)?
6. (Kỹ thuật) `pnpm -C game typecheck && pnpm -C game test && pnpm -C game build` sạch; bundle vẫn <5MB (WebP ≤100KB/asset).

## BLOCK PASTE CHO CODING AGENT
```
Đọc M1-Rescue-Dodge/specs/1-cuu-meo/ART-PASS.md + docs/DESIGN-SYSTEM.md §4 (PREMIUM CASUAL).
Làm đúng 5 mục theo thứ tự ưu tiên:
0) Thumbnail key art MỚI cho build/metadata (1x1/5x7/16x9) — mèo biểu cảm + ong lao + 3 lane, không chữ, không dùng screenshot Game Over.
1) Regenerate sprite cat_idle/bee_wasp/fish_item/fish_coin + 3 skin cat_* theo bộ 5: 3-tone block crisp, gloss α0.6 góc 45°, outline 4px hue-matched (không đen thuần), rim light, bóng đổ tint hue (prompt template §4.4, giữ pose cũ).
2) Nền per-level: vignette α0.10 + cỏ 2 tông + bụi candy + lane alpha tăng.
3) Juice: squash mèo khi trúng, micro-shake ≤4px, particle mật ong+trắng, floating text +1/LEVEL UP, mèo nghiêng thân khi đổi lane + bụi chân, anticipation ong.
4) Nút HUD: gradient + viền dưới 6px + gloss top-third + press scale 0.96.
Gate: typecheck+vitest+build sạch, bundle <5MB, WebP ≤100KB/asset. KHÔNG đổi logic/cân bằng độ khó — chỉ art + juice.
```
