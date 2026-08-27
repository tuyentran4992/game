# SPEC Stage 1 — M6 "Crumple King" · FUN GATE (duy nhất 1 giai đoạn này)

> Slug: `crumple-king` · Vite + TS + Phaser 4.x + matter-js (point constraints) · 9:16 portrait · 1 tay cái
> **Stage 1 = prototype placeholder ≤1 ngày, mục tiêu duy nhất: chứng minh cặp mechanic "bóp → ném" vui.**
> Anh verify OK → mở `specs/2-crumple-king/` (spec đầy đủ 5 file để build bản chính thức). Fail → folder đóng băng.
> KHÔNG làm gì ngoài scope file này — mọi thứ "game thật" thuộc stage 2, chưa viết.

## 1. Mechanic cần chứng minh (toàn bộ stage 1)
1. Tờ giấy A4 phẳng spawn giữa màn (rectangle trắng + 12 nếp nhăn ngẫu nhiên).
2. Kéo 2 góc chụm vào giữa (2 ngón hoặc drag góc) → mesh co + wrinkle dày lên, **4 mức**: phẳng (100% area) → nhăn (65%) → vón (40%) → tròn chặt (25%).
3. Mỗi lần lên mức: tiếng "rắc" + vụn bay + rung nhẹ.
4. Đủ chặt → thả tay = **flick ném**: vector = tốc độ kéo cuối (clamp vmax) → giấy bay, wobble trên không, **nảy theo mức nhàu** (chặt = đàn hồi hơn: restitution 0.1→0.35).
5. Sọt giấy tĩnh góc dưới-phải: trúng → +100 hiển thị, sọt rung, tờ mới rơi xuống; trượt → giấy nằm sàn, kéo thả vào sọt để dọn, rồi tờ mới.

## 2. Số khởi điểm (chỉnh qua config, không hardcode trong logic)
| Tham số | Giá đầu |
|---|---|
| Area 4 mức | 100/65/40/25% · flick cần velocity >2px/frame |
| Sọt | ngang 22% · cao 18% màn hình (prototype cố định, chưa di động) |
| restitution | 0.1 (phẳng) → 0.35 (chặt) |

## 3. Feel — phần KHÔNG được cắt
- Âm bóp giấy ràn rật pitch-variance theo tốc độ kéo; "rắc" lên mức; "rột" khi trúng sọt.
- Giấy bay méo thật (wrinkle dao động), chạm sàn/cạnh nảy đúng chất giấy.
- Cú ném TRÚNG ĐẦU TIÊN phải đã — đó là toàn bộ lý do tồn tại của stage 1.

## 4. HUD prototype
Chỉ: "NÉM!" nhấp nháy khi đủ chặt + số tờ đã ném góc trái. Không menu, không save, không SDK.

## 5. Gate kỹ thuật trước khi mời anh chơi
`pnpm typecheck` = 0 lỗi · vitest logic pass (velocity→vector đúng hướng, area→mức, vào sọt→hit) · `pnpm build` sạch · 1 lệnh chạy local.

## 6. Tiêu chí fun gate (anh Tuyền quyết)
1. Cú ném đầu trúng sọt phải "đã".
2. Bóp thấy giấy NHÀU thật (mesh co + tiếng), không phải vuông teo lại.
3. Muốn thử: chặt hơn có ném xa hơn không.
→ Anh report **PASS/FAIL**. PASS = em viết `specs/2-crumple-king/`. FAIL = đóng băng, concept vào kho.

## 7. Chống clone (ghi nhớ cho stage 2, chưa làm gì ở stage 1)
Chưa game nào "biến dạng vật thể rồi ném chính nó" (kiểm catalog 27/08). Trước khi nộp ở stage 2: kiểm lại catalog + ghi `docs/SUBMISSIONS.md`.
