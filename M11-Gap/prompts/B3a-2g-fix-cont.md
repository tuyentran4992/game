Bạn là dev Phaser 3 + TypeScript. **TIẾP TỤC VÒNG SỬA B3a** — phiên trước bị NGẮT giữa chừng (hết tiến trình ở lượt 85/110), nên hãy:
1. **Rà trạng thái hiện tại trước** (`cd /data/youtube-playables/M11-Gap/game && npm run gate` và `node tools/gate-smell.mjs`) — xem việc nào đã xong, việc nào còn dở/hỏng giữa đường.
2. **Hoàn tất 4 nhóm** (đọc đầy đủ `prompts/B3a-2f-fix.md` — đó là yêu cầu gốc, gồm: F1 vẽ ĐỦ lỗ + `MAX_HOLES` suy từ `2^số nếp` + test 120 màn chứng minh 4 ô không trùng; F2 xoá test rỗng `expect(true).toBe(true)` + `console.log`; F3 tách `PlayScene.ts` 477 dòng về trần 350; F4 gom khối 6 dòng trùng giữa components và giữa `playgamaAdapter` ↔ `ytgameAdapter`).
3. **Sửa mọi thứ đang đỏ/dở** do bị ngắt (file viết nửa vời, test mới chưa xong, import gãy).
4. Chạy `npm run gate` **duy nhất 1 lần ở cuối** và **phải PASS (0 vi phạm gate-smell)** rồi dán output thật.
**CẤM mở browser/Playwright/CDP/vite preview — chỉ kiểm ở tầng code.** Chỉ sửa `game/src/**`, `game/tests/**`, `game/package.json`. KHÔNG commit/push.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck xanh → (2) test xanh → (3) gate PASS → (4) báo cáo ngắn.
BÁO CÁO: file:dòng từng nhóm · việc đã xong trước khi bị ngắt vs việc bạn làm nốt · output `npm run gate`.
