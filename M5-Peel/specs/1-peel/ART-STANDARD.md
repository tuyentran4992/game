# ART-STANDARD — M5 "Peel!" (từ DESIGN-SYSTEM §4, bản áp dụng riêng)

> Source of truth: `docs/DESIGN-SYSTEM.md` §4 PREMIUM CASUAL (nâng chuẩn 27/08, benchmark 195 game Playgama Trending). File này chỉ dịch chuẩn đó sang ngôn ngữ của M5. Coding agent PHẢI đọc trước khi vẽ/tweak bất kỳ sprite nào.

## 1. Tinh thần
Game đối thủ trending thắng vì **thumbnail 0.5 giây + art candy 3D giả lập**. Peel có concept riêng (không game peel nào trong trending) → art càng phải sắc để thumb tự bán chính nó. Quả cam phải "muốn cắn", dải vỏ phải "muốn bóc thật".

## 2. Bộ quả cam (chủ thể số 1)
- Thể tích: gradient cam 3 tông (#FFB25E → #FF8A1F → #E86A0F, sáng trên-trái), **gloss highlight** vệt trắng α0.6 bo góc 45° ở 1/4 trên-trái quả, viền dưới tối 18% (viền vỏ dầy), bóng đổ mềm tiếp đất (`shadow.char`).
- Vỏ: outline 4px `#8C3E05` (hue gốc ×0.35), KHÔNG đen thuần.
- Ruột lộ khi gọt: matte cream #FFE9C9 + vân tép rất nhẹ (α≤0.15), KHÔNG trắng bệch kiểu sơn.
- Mặt cắt mép vỏ: highlight 1px sáng + shadow trong 2px → cảm giác dày 3D (fix round 5).

## 3. Dải vỏ ribbon
- 2 mặt đúng thật: ngoài cam bóng (như quả), trong cam-pale mờ hơn 25%.
- Viền mép sắc, curl lòng máng C (không tròn O).
- Đuôi ribbon cùng gradient + gloss, không flat.

## 4. Nền & HUD
- Nền gradient 2 lớp (kem→cam nhạt) + vignette α0.10; dao/knife có đủ 4 món (gradient, gloss, viền, bóng).
- HUD dùng component §3 DESIGN-SYSTEM nhưng nút áp §4.1 (gradient + viền dưới + gloss).
- Particle vỏ: 2 tông cam (#FF8A1F/#FFB25E) — CẤM trắng/xám mặc định.
- Floating text PERFECT PEEL: `type.display` + stroke + pop + bay lên fade.

## 5. Thumbnail key art (nộp platform)
- 1 quả cam đang được dải vỏ xoắn bay lên, occupies ≥55% chiều cao, không chữ.
- Prompt gen (WAN 2.7): `orange being peeled in a spiral, candy 3D look, soft gradient shading, glossy highlight, thick cartoon outline darker than fill, cream gradient background, centered composition, no text`
- QA thumb: export 240px rộng → còn đọc "peel" trong 0.5s?

## 6. Art QA gate (§4.5 dịch cho M5)
1. Thumb 240px đọc ra "peel"? 
2. Nghiêng mắt: cam tách khỏi nền ngay?
3. ≤3 hue chiếm sóng (cam / kem / 1 accent)?
4. Cam + ribbon + dao + nút: đủ gradient-gloss-viền-bóng?
5. Particle + floating text màu cam, không trắng?
→ Sai bất kỳ = chưa được build pack/nộp.
