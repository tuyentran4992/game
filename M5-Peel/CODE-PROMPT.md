# Prompt code M5 "Peel!" — fun-gate prototype (paste vào Claude Code)

```
TẠO PROTOTYPE FUN-GATE "PEEL!" — chơi được trong hôm nay, art placeholder TUYỆT ĐỐI.
Repo gốc: /data/youtube-playables. Tạo thư mục MỚI M5-Peel/game/ (Vite + TS + pnpm).
KHÔNG sửa file nào khác của repo. KHÔNG commit/push.

Bối cảnh: prototype ASMR gọt vỏ — đọc M5-Peel/README.md để hiểu mechanic.
Fun-gate prototype, KHÔNG phải game chính thức — mọi thứ khác scope README là sai hướng.

Yêu cầu:
- pnpm create vite (vanilla-ts), cài phaser@4.2.1 (đúng version factory dùng).
- Canvas 9:16 responsive (Scale.FIT), nền tối, giữa màn hình 1 QUẢ dạng ellipse/cầu vẽ
  programmatic (gradient + highlight bóng, không cần asset). 3 quả lần lượt: táo đỏ, xoài
  vàng, dưa hấu xanh (khác kích thước).
- CƠ CHẾ CHÍNH: pointer xuống & kéo → 1 "vết dao" chạy quanh bề mặt quả. Quả chia ~64 slice
  vỏ theo góc; slice nào lưỡi dao đi qua trong bán kính hợp lệ (đủ sát mép vỏ ngoài) → slice
  đó BONG ra: vẽ dải ribbon 2 tam giác/slice, phần đã peel hiển thị RUỘT (màu sáng bóng hơn
  + 1 vòng highlight). Nhấc tay giữa chừng khi còn peel dở ≥1 góc liên tục → RÁCH: dừng
  ribbon, flash đỏ nhẹ, mất streak.
- Peel xong vòng (≥90% slices) → "PERFECT PEEL": dải ribbon văng ra xoáy tròn (20 segment,
  spring tự viết, không lib), +200đ × streak, particle nước nhỏ, sound trắng có envelope
  (WebAudio synth, không asset). Điểm theo % vỏ đã peel.
- HUD: điểm, streak hiện tại, đồng hồ 60s. Hết giờ → overlay tổng kết (điểm + số perfect)
  + nút Restart. Không menu, không save, không SDK.
- Cảm giác phải MƯỢT: vết dao nội suy giữa các pointer event (đừng rời rạc), ribbon cuộn
  bằng cách xoay segment dần.
- Kết thúc 1 quả → quả kế tự spawn (luân phiên 3 quả).
Gate: pnpm dev chạy, chơi thử 60s không lỗi console, typecheck 0 lỗi.
BÁO LẠI: đường dẫn + lệnh chạy + những gì đã cắt xén so với README.
```
