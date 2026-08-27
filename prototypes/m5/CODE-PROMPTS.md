# Prompt code 2 prototype fun-gate (paste từng cái vào Claude Code)

## PROMPT A — "Peel!" (làm trước)

```
TẠO PROTOTYPE FUN-GATE "PEEL!" — chơi được trong hôm nay, art placeholder TUYỆT ĐỐI.
Repo gốc: /data/youtube-playables. Tạo thư mục MỚI prototypes/m5/peel/ (Vite + TS + pnpm).
KHÔNG sửa file nào khác của repo. KHÔNG commit/push.

Bối cảnh: prototype ASMR gọt vỏ — đọc prototypes/m5/README.md "Concept A" để hiểu mechanic.
Đây là fun-gate prototype, KHÔNG phải game chính thức — mọi thứ khác README scope là sai hướng.

Yêu cầu:
- pnpm create vite (vanilla-ts), cài phaser@4.2.1 (đúng version factory dùng).
- Canvas 9:16 responsive (Scale.FIT), nền tối, giữa màn hình 1 QUẢ dạng ellipse/cầu vẽ
  programmatic (gradient + highlight bóng, không cần asset). 3 quả lần lượt: táo đỏ, xoài
  vàng, dưa hấu xanh (khác kích thước).
- CƠ CHẾ CHÍNH: pointer xuống & kéo → 1 "vết dao" chạy quanh bề mặt quả. Quả chia ~64 slice
  vỏ theo góc; slice nào lưỡi dao đi qua trong bán kính hợp lệ (đủ sát mép vỏ ngoài) → slice
  đó BONG ra: vẽ dải ribbon 2 tam giác/slice, phần đã peel hiển thị Ruột (màu sáng bóng hơn
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

## PROMPT B — "Crumple King"

```
TẠO PROTOTYPE FUN-GATE "CRUMPLE KING" — chơi được trong hôm nay, art placeholder.
Repo gốc: /data/youtube-playables. Tạo thư mục MỚI prototypes/m5/crumple/ (Vite + TS + pnpm).
KHÔNG sửa file nào khác, KHÔNG commit/push.

Bối cảnh: prototype bóp giấy & ném — đọc prototypes/m5/README.md "Concept B".

Yêu cầu:
- pnpm create vite (vanilla-ts), cài phaser@4.2.1 + matter-js.
- 1 tờ giấy ở giữa: MESH grid 5×7 point bodies + constraints (nhìn như tấm trắng có nếp gấp
  vẽ line). Pointer CHỤM 2 góc bất kỳ kéo lại gần (hoặc tap 2 điểm góc rồi kéo) → khi 2 điểm
  đủ gần, THÈM ràng buộc kéo chúng sát nhau (giấy "nếp" nhỏ lại, phình mặt). Lặp lại: mesh
  co dần 4 cấp: phẳng → bán crumple → viên. Mỗi cấp bóp: âm ràn rật (synth), viên méo
  (wobble) khi va chạm — đổi restitution theo cấp.
- Đủ viên (cấp cuối): kéo-thả ném = impulse theo véc-tơ kéo. Sọt giấy bên phải trên bàn,
  xa dần sau mỗi quả trúng. Sọt = tĩnh, mở trên. Trúng: +100×combo, tiếng "rột" đã tai,
  viên tự spawn cái mới phẳng để bóp tiếp (combo giữ). Trượt: combo về 0.
- HUD: điểm, combo, timer 60s → overlay tổng kết + Restart. Không menu/save/SDK.
Gate: pnpm dev không lỗi console, bóp→ném→trúng/tuột phản hồi rõ. 
BÁO LẠI: đường dẫn + lệnh chạy + điều đã cắt xén.
```
