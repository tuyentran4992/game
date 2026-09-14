Bạn là REVIEWER ĐỘC LẬP cho batch B3b — CODE ĐÚNG/SAI. **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Luật phiên + checklist C1-C12 + gói ngữ cảnh B3b đã nằm trong system prompt — đọc phần đó trước, KHÔNG cần mở file nào thêm.
Đọc thêm đúng: `game/src/render/**` (5 scene + 3 component + viewmodel B3b), `game/tests/logic/view-b3b-*.test.ts`, `game/src/main.ts` (không đọc specs/, không quét cây thư mục).

Chấm **C1..C12** (test xanh THẬT = `npm run gate`; purity = viewmodel/components 0 import phaser) + **5 mục riêng của batch tiến trình, bắt buộc chấm:**
- **C-R1 — scene có tính lại nghiệp vụ không**: quét `Map/Score/Shop/Album/End` + `viewmodel/mapModel.ts`: mọi giá trị `locked`, tổng sao, `ink` sau mua, album ≤14/badge ≤6, `master_unlocked` phải ĐẾN TỪ hàm logic trả về; phát hiện scene tự so `stars.length >= 12`, tự `ink - price`, tự cap `.slice(0,14)` ⇒ FAIL kèm file:dòng.
- **C-R2 — text hardcode không**: display-string ngoài whitelist (testid/hex/key asset/số format) phải bọc `t(`; copy nộp đúng pack §3 ("You unfolded all 120" v.v.). 1 chuỗi lọt ⇒ FAIL (PC-19).
- **C-R3 — testid đủ không**: 14 tên pack §5 (tính cả 8 tab chương + node từng màn sinh bằng template) phải có trong `registerTestid(`; rect ≥44px; `testid-set-*` hoạt động thật (mute ≡ nút HUD — một nguồn sự thật, PC-P-03).
- **C-R4 — bố cục khớp số DS**: tab 200×72, node 168×168 sao 32px, panel 480×560, skin 260×300, album 200×200, badge ⌀96, viền equipped `#1F6FEB` 4px. Sai số không ghi chú duyệt ⇒ FAIL.
- **C-R5 — interstitial đúng chỗ**: `grep -rn showInterstitial src/render` ⇒ chỉ ScoreScene, và sau callback tween thưởng (PC-14); rewarded continue không có ở batch này (game-over flow đã thuộc Play/B2).
- **C-R6 — end khai báo đủ**: `testid-end-total-stars` khớp dữ liệu logic (không format rỗng), Master mở thật (dispatch), reload từ end không kẹt loop (tìm nhánh về Title — E2E G-04).

Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`. Chạy lệnh thật rồi dán số (không tóm tắt thay output).
Tin nhắn CUỐI của bạn PHẢI là bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Ngắn nhất có thể.
Xong trong ≤25 lượt; thiếu thời gian ⇒ C-R1..C-R6 + C1 trước, ghi rõ mục bỏ dở.
