# FIX ROUND 5 — M5 "Peel!" (file chính thức, gộp block paste chat + video playtest #2 cùng ngày)

Phần round chat đã áp dụng: cluster 3 chấm biến mất ✅, ribbon có vồng có đuôi ✅, PERFECT
PEEL + detach + rơi ✅, STREAK tính đúng quả ✅ (nhưng xem mục 6).

Video #2 (11.8s, localhost) owner hỏi 3 điều — cả 3 đều là bug, trả lời bằng 3 mục dưới.
Sửa đúng 6 mục, không refactor logic/config, không commit/push:

## 1. RIBBON NEO SAI GỐC (nặng nhất — lỗi "dao với vỏ không khớp")
Hiện trạng: dải vỏ được neo ở MÉP TRÊN MÀN HÌNH (chạy off-screen), căng như dây chun cắt
ngang quả; head dao ở (575,662) nhưng đuôi ribbon ở (510,755) — lệch ~90px. Đuôi ribbon
kết thúc bằng 1 khung lục giác cam lạ hoắc (quad chain tự giao nhau khi path vòng).
Fix:
- ribbon là chain sinh DỌC THEO PATH ĐÃ VUỐT: đốt cuối (head) = đúng điểm cắt hiện tại
  (= vị trí pointer thật frame đó, 0 delay), các đốt trước nằm lần ngược theo path.
- KHÔNG neo đầu ribbon vào mép màn hình hay điểm cố định nào. Khi dải vượt quá ~1.2 vòng
  chu vi, phần thừa mới được detach dần (rơi + lăn) — không kéo căng lên trời.
- Siết thứ tự quad: không cho chain tự giao (limit góc giữa 2 đốt ≤ 25°); xóa mọi debug
  outline/fill thừa (khung lục giác kia là debug draw, nếu bật).

## 2. LỚP XÁM XOÁY GIỮA QUẢ (chính là "màu đen đen" anh hỏi)
Hướng dẫn/guide path đang được vẽ như 1 sprite xám trong SUỐT đè lên quả (hình vân tay
xoáy), không bị xóa khi gọt → ruột lúc nào cũng "bẩn".
Fix: guide phải nằm TRÊN LAYER VỎ (cùng mask xóa theo peel) hoặc vẽ nét đứt mảnh
opacity ≤ 0.35 trực tiếp lên vỏ, KHÔNG có lớp phủ xám riêng. Xóa hẳn sprite overlay xám.

## 3. VÒNG ĐỎ + MŨI TÊN HINT (chính là "màu đỏ" anh hỏi)
Đúng là hint điểm đầu rãnh + hướng vuốt, nhưng màu đỏ vermilion nhìn như cảnh báo lỗi.
Fix: đổi sang TRẮNG ẤM opacity 0.6 (chấm 6px + mũi tên cong nhỏ), chỉ hiện ở QUẢ 1,
vừa bắt đầu nét cắt đầu tiên thì fade 0.3s biến mất. Bỏ hẳn nếu còn thấy sau quả 1.

## 4. MÉP VỎ DỌC ĐƯỜNG GỌT VẪN PHẲNG 2D (mục 1 round chat, chưa đạt)
Ranh giới ruột/vỏ chỉ là viền tối 1-2px → vẫn đọc là "sơn cream đè lên", không phải
"vỏ dày đang bị nhấc". Fix: dải mép vỏ dày 3-4px màu vỏ ĐẬM hơn chạy dọc 2 bên đường
gọt + highlight trắng mảnh trên mép + shadow nhẹ 2px đổ xuống ruột (offset theo hướng
light trên-trái). Kèm: ruột màu kem phải SÁNG/đục hơn nền vỏ một chút nữa để tương phản.

## 5. PARTICLES VẪN TRẮNG/XÁM
Vụn bay phải màu VỎ (cam #E0761C + cam đậm 1 tông), không phải trắng/xám (đang như bọt).

## 6. SOI STREAK GIỮA NÉT
Frame giữa video có lúc STREAK nhảy khi chưa thấy PERFECT PEEL giữa màn. STREAK chỉ
được đổi tại thời điểm 1 vòng KHÉP kín thành công. Nếu code đã đúng (nhãn chỉ lag render)
thì ghi rõ "OK, không sửa".

## Gate
typecheck 0 · vitest pass (thêm case: head ribbon == pointer position mỗi frame khi
đang cắt; chain không tự giao trên path tròn) · build sạch · 1 lệnh chạy.
