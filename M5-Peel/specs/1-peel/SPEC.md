# SPEC Stage 1 — M5 "Peel!" · FUN GATE (duy nhất 1 giai đoạn này)

> Slug: `peel` · Vite + TS + Phaser 4.x + matter · 9:16 portrait · 1 tay cái
> **Stage 1 = prototype placeholder ≤1 ngày, mục tiêu duy nhất: chứng minh mechanic "tuốt" vui.**
> Anh verify OK → mở `specs/2-peel/` (spec đầy đủ 5 file để build bản chính thức). Fail → folder đóng băng, không code tiếp.
> KHÔNG làm gì ngoài scope file này — mọi thứ "game thật" (menu, save, SDK, progression, art, nộp nền tảng) thuộc stage 2, chưa viết.

## 1. Mechanic cần chứng minh (toàn bộ stage 1)
1. Quả giữa màn (3 kiểu luân phiên: cam / dưa hấu / xoài — DUYỆT 27/08: dùng ẢNH THẬT góc nghiêng, không color-block).
2. Que highlight 3 rãnh đều quanh quả; chỉa vào rãnh → vỏ bong thành **dải ribbon liền** cuộn theo chuyển động tay.
3. Đứt tiêu chuẩn: rời rãnh >150ms hoặc đảo chiều → ribbon dừng, flash đỏ, streak = 0.
4. ≥90% chu vi liền = **PERFECT PEEL** (+combo, pop chữ, rung 2px, vụn vỏ). 60–89% = GOOD.
5. Xong quả → quả mới spawn luôn (không màn hình kết thúc).

## 2. Số khởi điểm (chỉnh qua file config, không hardcode trong logic)
| Tham số | Giá đầu |
|---|---|
| Rãnh/đường liền | 3 · ngưỡng PERFECT ≥90% · GOOD 60–89% · disconnect >150ms |
| Tốc độ tối thiểu | 25°/frame · ribbon mesh 64 slice, peel 9px/frame |
| Combo | +1/PERFECT · reset khi disconnect (chỉ hiển thị, chưa tính điểm) |

## 3. Feel — phần KHÔNG được cắt (mechanic chưa vui thì cả stage fail)
- Tiếng "soàn soạt" pitch biến thiên theo tốc độ tuốt; "pop" khi đủ vòng; im lặng nền (ASMR là chính).
- Ribbon curl rời rãnh bằng spring tự viết; particle vụn + tia sáng tại điểm kết.
- Chữ PERFECT PEEL pop-scale 1.4→1; combo counter góc phải.

## 4. HUD prototype
Chỉ: streak góc phải + "quả N" góc trái. Không menu, không pause, không save, không SDK.

## 5. Gate kỹ thuật trước khi mời anh chơi
`pnpm typecheck` = 0 lỗi · vitest cho logic peel (liền/disconnect/%/streak) pass · `pnpm build` sạch · chạy local được bằng 1 lệnh.

## 6. Tiêu chí fun gate (anh Tuyền quyết, không phải agent)
1. Lần đầu tuốt liền 1 quả phải thốt "ồ" vì dải peel liền.
2. Muốn chơi lại ngay để đạt streak cao hơn.
3. Không lỗi mesh/vật lý phá ảo giác "đang gọt thật".
→ Anh report **PASS/FAIL**. PASS = em viết `specs/2-peel/`. FAIL = đóng băng, concept vào kho.

## 7. Chống clone (ghi nhớ cho stage 2, chưa cần làm gì ở stage 1)
Động từ "gọt vỏ theo bề mặt" chưa có trên Playgama (kiểm 27/08). Khác Fruit Ninja ở core verb. Trước khi nộp bất kỳ đâu ở stage 2: kiểm catalog lại, ghi `docs/SUBMISSIONS.md`.
