# FIX ROUND 2 — M5 "Peel!" (27/08, từ ảnh anh Tuyền: vẫn "kì kì")

Bối cảnh: owner CHỌN ảnh thật thay color-block (duyệt 27/08, override round 1 mục 4). Ảnh hiện tại:
- Ảnh cam top-down lộ múi → đọc thành "cam đã bổ".
- Đường gọt nan quạt từ tâm = "bổ", không phải "gọt vỏ" (vỏ bong theo vòng quanh quả).
- Vỏ không bong thật: chỉ patch màu nhạt + vòng progress 8-10 ô trôi nổi + nhíp đứng riêng → feel debug overlay.
- Gốc kỹ thuật: bản hiện tại là ảnh 2D + overlay hình học, không có lớp peel nào để bóc.

## Kỹ thuật thay thế: MASK + RIBBON (không cần 3D mesh, ≤1 ngày Phaser)
1. Ảnh cam NGUYÊN QUẢ nhìn NGHIÊNG (không lộ múi, thấy cuống/lồi). 2 lớp chồng khít: vỏ (ảnh gốc) và ruột (cùng ảnh, hue-shift nhạt + matte bằng filter). Lớp vỏ bị XÓA DẦN bằng GraphicsMask chạy theo ngón — vuốt tới đâu ruột hiện tới đó.
2. Đường gọt là VÒNG XÍCH ĐẠO (ellipse ngang quanh quả, phối cảnh dẹt), KHÔNG phải nan quạt từ tâm. 3 rãnh = 3 ellipse (trên/giữa/dưới), dashed mờ.
3. Ribbon vỏ: chuỗi ~20 quad nhỏ texture vỏ (mặt trong = cùi trắng), đầu dính vào ngón, các đoạn sau curl dần xuống bằng spring giảm chấn; mỗi đoạn sinh khi mask xóa tới. Đủ vòng: ribbon văng rơi + lăn ra mép màn.
4. Công cụ = con dao nhỏ (lưỡi bạc, cán gỗ) bám ngón, mũi dao đúng điểm mask. Bỏ nhíp.
5. XÓA vòng progress UI. Progress = lượng vỏ còn trên quả (tự hiển thị). Giữ đúng 2 text: QUẢ N, STREAK.
6. Chữ "CAM": nhỏ, opacity thấp (này label phụ, không phải trung tâm).

## Paste cho coding agent
---
SỬA PROTOTYPE M5-Peel (code ở `M5-Peel/game/`). Đọc `M5-Peel/specs/1-peel/FIX-ROUND-2.md` rồi làm ĐÚNG 6 mục §"Kỹ thuật thay thế", không refactor ngoài phạm vi, không commit/push:
1. Đổi sprite sang ảnh cam nguyên quả GÓC NGHIÊNG (CC0, không lộ múi). 2 lớp vỏ/ruột chồng khít (ruột = hue-shift nhạt matte); implement ERASE-VIA-MASK: GraphicsMask xóa lớp vỏ theo stroke ngón (mỗi stroke để lại vệt mask vĩnh viễn).
2. Đường gọt = 3 ellipse xích đạo quanh quả (phối cảnh dẹt, dashed mờ) — xóa toàn bộ path nan quạt từ tâm hiện tại.
3. Ribbon vỏ = chain 20 quad texture vỏ mặt ngoài/cùi trắng mặt trong, head bám ngón + spring curl, sinh theo mask đã xóa; hoàn thành vòng → ribbon detach rơi + lăn ra màn.
4. Cursor = con dao (lưỡi bạc cán gỗ) xoay theo hướng vuốt; XÓA nhíp.
5. XÓA vòng progress block cam trôi nổi; progress thể hiện bằng lượng vỏ còn lại. HUD chỉ còn QUẢ N + STREAK.
6. Chữ CAM: 40% cỡ, opacity 0.5, sát mép quả.
Không đổi số logic trong src/config. Gate: typecheck 0 · vitest pass (thêm case: mask area tăng đơn điệu khi vuốt, ribbon length == mask length) · build sạch · 1 lệnh chạy.
---

Ghi chú: technique mask+ribbon là chuẩn của thể loại ASMR-peel 2D (không cần three.js). Nếu round này vẫn kỳ → cân nhắc verdict: hoặc đổi ảnh + góc máy, hoặc FAIL concept (fun gate là anh quyết).
