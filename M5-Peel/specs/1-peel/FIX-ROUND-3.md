# FIX ROUND 3 — M5 "Peel!" (27/08, owner review screenshot lúc đang gọt)

Round 2 ĐẠT core: vỏ bong thành dải 2 mặt, dao bám đầu dải, ruột lộ theo nét cắt, bỏ vòng
progress UI, chữ CAM nhỏ mờ. CÒN 2 lỗi visual + 2 điểm cần soi thêm. Sửa đúng phạm vi,
KHÔNG refactor logic/config ngoài liệt kê, KHÔNG commit/push.

## 1. RIBBON VỎ ĐUÔI THẲNG ĐƠ như thanh nhựa → phải rủ + xoăn có trọng lực
Hiện tại: các đốt chain nằm thẳng tắp, không rủ, không curl — trông như thanh nhựa cam
gắn vào quả (owner chấm: kỳ nhất). Fix:
- Mỗi đốt chịu gravity, moment tăng dần theo khoảng cách tới head (đốt gần ngón đứng
  yên, đốt cuối rủ xuống).
- Rest angle curl dần về phía mặt cùi (trắng): dải tự xoăn thành cuộn khi buông — bán
  kính cuộn ~40% radius quả.
- Spring stiffness thấp + damping cao → ribbon trễ (lag) sau dao một nhịp, có độ võng
  hình chữ S nhẹ; không rigid chain.
- Detach (đủ vòng / rach): cả dải rơi xoay theo trọng lực, lăn một đoạn rồi fade ra
  mép dưới.
- Va chạm: ribbon không xuyên quả; head luôn tiếp tuyến mặt cầu tại điểm cắt.

## 2. Bỏ bàn tay cartoon — giữ duy nhất con dao
Tay 2D phẳng dán đè lên quả giả-3D, lơ lửng không khớp mặt cong → cảm giác sticker ghép.
XÓA asset bàn tay, chỉ để con dao (lưỡi bạc + cán) bám đầu dải vỏ, lưỡi tiếp tuyến mặt
quả, xoay mượt theo hướng vuốt. KHÔNG thay bằng tay khác, không emoji.

## 3. Soi thêm (kiểm tra, không thấy lỗi thì báo OK — đừng sửa bừa)
- STREAK đang hiện "0" khi đang giữa nét gọt: spec là streak chỉ đổi khi QUA QUẢ. Nếu
  agent đang reset giữa chừng → sửa lại; nếu chỉ là giá trị khởi điểm đúng thì để.
- Trên rãnh còn 1 vòng tròn trắng (đích?). Đầu rãnh chỉ cần 1 chấm nhỏ + mũi tên cong
  gợi ý (biến sau quả 1); không cần target ring.
- Rãnh nét đứt phía SAU (chưa gọt) vẫn phải hiện; phần đã gọt thì mask xóa luôn cả
  vạch rãnh trên vỏ (đừng để nét đứt trôi nổi trên vùng ruột).

## Gate
typecheck 0 lỗi · vitest pass (giữ case mask/ribbon đã có) · build sạch · 1 lệnh chạy.

## Ghi chú stage 2 (không làm bây giờ)
Owner từng duyệt "ảnh thật"; prototype đang dùng khối cầu vec-tơ vì mask tròn khớp 100%.
Chấp nhận cho fun gate — đổi ảnh thật (căn mask theo alpha, không phải hình tròn) là
việc của specs/2-peel/ cùng art chính thức.
