# FIX ROUND 1 — M5 "Peel!" prototype (27/08, từ ảnh anh Tuyền chụp)

Bệnh: prototype trông như flashcard học từ vựng, không như game gọt vỏ. Nguyên nhân = lệch spec §1/§3.

| # | Quan sát trên ảnh | Vi phạm spec | Sửa |
|---|---|---|---|
| 1 | Quả trơn, không thấy rãnh | §1.2 yêu cầu 3 rãnh highlight | Vẽ 3 đường dashed sáng chia đều quanh quả, luôn hiển thị; rãnh đang tuốt → glow + vỏ hé vài px |
| 2 | Không có dao, chỉ 1 chấm trắng cô đơn | §1.2 "que highlight" | Cursor con dao (tam giác bạc + cán) xoay theo hướng vuốt; bỏ chấm trắng |
| 3 | (chưa xác nhận) ribbon không bong khi vuốt | §1.2 + §3 | Vỏ phải bong NGAY khi vuốt dọc rãnh, hai mặt hai tông, curl spring, vụn bay — không chờ đủ vòng |
| 4 | Cam 3D photoreal | "placeholder color block" | Ellipse 2 tông phẳng, bỏ texture |
| 5 | "CAM" to giữa dưới quả | text là label dev | Cỡ 40%, opacity 50%, sát mép quả |
| 6 | QUẢ 1 + STREAK x2 | §2: streak +1/PERFECT/quả | Streak chỉ tăng khi quả hoàn thành PERFECT; thêm vitest case nhất quán |
| 7 | Người chơi không biết làm gì | (thiếu trong spec — bổ sung) | Hint lần đầu: mũi tên cong "vuốt theo rãnh", ẩn sau quả 1 |

Lệnh paste cho coding agent (khối nguyên khối dưới):

---

SỬA PROTOTYPE M5-Peel (game ở `M5-Peel/game/`, code theo `M5-Peel/specs/1-peel/SPEC.md`). Đọc bảng bệnh án `M5-Peel/specs/1-peel/FIX-ROUND-1.md` rồi sửa ĐÚNG 7 mục, không thêm gì khác, không commit/push:
1. Vẽ 3 RÃNH trên bề mặt quả (đường dashed sáng chia đều quanh quả, luôn hiển thị); rãnh đang được tuốt → glow + vỏ hé vài px.
2. CON DAO theo ngón (tam giác bạc + cán tối, xoay theo hướng vuốt). Bỏ chấm trắng cô đơn hiện tại.
3. Vỏ phải bong NGAY khi vuốt dọc rãnh (không chờ đủ vòng): ribbon 2 mặt (ngoài đậm/trong nhạt), curl spring, vụn bay; vuốt tới đâu vỏ hiện tới đó.
4. PLACEHOLDER HOÁ: bỏ texture 3D photoreal → ellipse 2 tông màu phẳng + highlight nhỏ.
5. Chữ tên quả: cỡ 40%, opacity 50%, sát mép dưới quả (nó là label, không phải UI chính).
6. STREAK chỉ +1 khi hoàn thành quả PERFECT — QUẢ N và STREAK nhất quán (quả 1 không thể streak 2). Logic thuần trong src/logic + vitest case này.
7. HINT lần đầu: mũi tên cong "vuốt theo rãnh" mờ trên quả, ẩn sau quả 1.
Gate: typecheck 0 lỗi · vitest pass · build sạch · báo đúng 1 lệnh chạy local.

---

Ghi chú quy trình: round fix này vẫn thuộc stage 1 (fun gate CHƯA verify). Nếu sau fix anh vẫn thấy chán/kỳ → fun gate FAIL, kết luận ghi vào STATUS.md, concept vào kho.
