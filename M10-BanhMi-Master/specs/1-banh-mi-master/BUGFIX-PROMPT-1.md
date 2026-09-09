# BUGFIX 1 MACH — M10 Banh Mi Master (boss chơi tay preview, 2 lỗi UX — lệnh 09/09)

Repo: /data/youtube-playables/M10-BanhMi-Master/game (code đã xong 101/101 test, sim pass).
SỬA ĐÚNG 2 BUG DƯỚI ĐÂY. KHÔNG refactor linh tinh. KHÔNG phá test hiện có.

## BUG 1 — Nút PLAY nhấn không phản hồi liền (boss: "nhấn ko phản hồi liền")
Điều tra root cause trong TitleScene.ts + widgets.button + main.ts:
- Khung bấm (container.setInteractive hitArea Rectangle tâm (-w/2,-h/2)) có thể lệch so với hình vẽ (g vẽ offset -3/+6): kiểm tra vùng nhận pointer có đúng bằng nút thấy không.
- Thêm PRESS STATE tức thì: on pointerdown scale nút 0.94 (10ms), on pointerup/pointerout trả 1 — người dùng PHẢI thấy nút lún khi chạm, kể cả khi GameScene.create tốn thời gian.
- scene.start('GameScene') + launch('HudScene') đồng bộ trong pointerdown: đo — nếu create nặng, chuyển nhẹ: play fade-out 80ms rồi start (transition đủ để não nhận 'đã bấm', không delay thêm).
- Kiểm tra audio unlock() KHÔNG block (AudioContext suspended trên mobile): unlock phải non-blocking.
- VERIFY CODE: thêm 1 unit test (vitest, KHÔNG browser) cho press-state helper nếu tách ra widget.

## BUG 2 — Khung text khách yêu cầu (order bubble) không đọc được
Root cause nghi vấn: font 21px trên thế giới 720×1280, Scale.FIT về iPhone ~390px = chữ ~11px — KHÔNG ĐỌC ĐƯỢC.
- Phóng chữ trong bubble: tên nguyên liệu ≥ 30px, nhãn 'ORDER!' ≥ 32px; TÊN HIỂN THỊ lấy tiếng Việt nếu có (data ingredients thêm displayName Vi: 'Pâté gan', 'Mayo', 'Tương ớt', 'Thịt nướng', 'Gà xé', 'Chả lụa', 'Dưa leo', 'Đồ chua', 'Rau mùi', 'Ớt lát').
- Kích cỡ khay: tên dưới icon 17px → ≥ 24px displayName Vi (nhãn ngắn).
- Kiểm tra tương phản: chữ ink #3A2E39 trên nền trắng 0.97 OK — GIỮ, nhưng bỏ strokeThickness 0 nếu làm chữ mờ trên nền highlight vàng; đảm bảo không bị tint.
- Compat: bong bóng cao động bubbleH(n) — nếu chữ to hơn làm tràn, tăng rowH/pad trong layout.ts (NGUỒN DUY NHẤT — không hardcode chỗ khác), cập nhật registerTestid theo size mới.
- VERIFY CODE: vitest test cho bubbleH(n) mới phải >= cỡ cũ; không đổi API.

## BẮT BUỘC SAU KHI SỬA (in số thật vào log cuối)
1. `node node_modules/typescript/bin/tsc --noEmit` = 0 lỗi
2. `node node_modules/vitest/vitest.mjs run` = pass 100% (số cao hơn hoặc bằng 101 vì thêm test press-state)
3. `node node_modules/vite/bin/vite.js build` = thành công, dist < 4MB
4. TB-05: không file nào > 300 dòng (wc -l các file src sửa)
5. KHÔNG browser test, KHÔNG playwright. KHÔNG commit/push git.

## QUY TRÌNH
TDD giữ nguyên: test cũ phải pass; test mới viết trước khi sửa code của nó.
File sửa dự kiến: src/scenes/TitleScene.ts, src/ui/widgets.ts, src/ui/bubble.ts, src/ui/layout.ts, src/ui/tray.ts, src/data/ingredients.ts (+ test).
Kết thúc: in "FIX SUMMARY: bug1 <root cause + fix> | bug2 <fix> | tsc=X | tests=Y/Z | build=ok | maxfile=N dòng".
