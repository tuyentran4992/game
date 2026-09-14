Bạn là REVIEWER ĐỘC LẬP cho batch B3b — TẤN CÔNG/STRESS. **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Luật phiên + checklist F1-F8 + gói ngữ cảnh B3b đã nằm trong system prompt — đọc trước.
Đọc thêm đúng: `game/src/render/scenes/{Map,Score,Shop,Album,End}Scene.ts`, `game/src/render/components/{MapNode,SkinCard,BadgeIcon}.ts`, `game/src/render/viewmodel/mapModel.ts`.

Dựng bằng chứng thật: `cd /data/youtube-playables/M11-Gap/game && npm run build:standalone && npx vite preview --port 4314 &`. Có browser (playwright/puppeteer) ⇒ bắn thật; không có ⇒ phân tích tĩnh + gọi `mapModel` thuần qua node trong /tmp và ghi **KHÔNG KIỂM CHỨNG ĐƯỢC** kèm lý do — cấm đoán mò PASS.

**6 kịch bản stress của batch tiến trình:**
- **T1 — spam nút Map/Shop**: click đúp liên tục `testid-map-node-*`, `testid-shop-skin-*`, `testid-scorecard-next` <50ms/cú. Kỳ vọng: không scene double-push (không 2 MapScene chồng nhau — kiểm `scene.isActive` sau khi spam), không mua 2 lần 1 skin (idempotent — TC-INC-04), không trừ Mực 2 lần.
- **T2 — mua skin sát ranh Mực**: đủ 1 Mực ⇒ mua OK; thiếu 1 ⇒ nút disabled/không đổi state (E2E S-02, TC-INC-02); spam mua khi thiếu ⇒ `ink` không âm (đọc registry save/log).
- **T3 — resize giữa Map/Score**: 1080×1920 → 2560×1080 → 1080×1080 ngay khi panel score ĐANG animate sao (400ms). Kỳ vọng: không vỡ layout, sao/tổng không nhân đôi, tab cuộn ngang không mất node (R-01/R-04), rect testid cập nhật.
- **T4 — reload đúng lúc nguy cấp**: F5 (a) giữa tween score, (b) ngay sau khi economy trả mua-thành-công chưa vẽ xong, (c) ở EndScene. Kỳ vọng: 0 lỗi console; S-01 đúng màn "Continue — Level n"; skin đã mua VẪN sở hữu (wardrobe); end screen reload về Title hợp lệ, không kẹt loop (G-04).
- **T5 — Save hỏng**: ghi rác JSON vào key save (profile devtools `m11.save`='{bad' — nếu không có browser thì chạy fixture §2.3 DM trong /tmp qua mapModel/save API thật). Kỳ vọng: về màn 1, skin giữ nguyên, không crash, console không spam (S-03/PC-16).
- **T6 — Save debug không lẫn**: chơi qua `?debug=1&level=110` rồi reload KHÔNG debug ⇒ current_level/title không nhảy sai (debug không ghi save thật — SPEC:190); Master: cờ master ⇒ `testid-btn-hint` biến mất trong Play (G-02).

Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`. Dán số đo thật (ink trước/sau, số scene chạy, ms giữa cú click).
Tin nhắn CUỐI: bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Ngắn nhất có thể. ≤25 lượt; thiếu giờ ⇒ T1-T4 trước.
