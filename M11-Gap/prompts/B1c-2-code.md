Bạn là dev TypeScript — **1 tác giả duy nhất** của batch B1c: làm XANH bộ test B1c (economy · save · records · telemetry · i18n).

Hợp đồng B1c (chữ ký khung, field SaveV1, khoá storage, luật migrate/cứu hộ, event list, copy PC-19, bẫy đã biết) đã ở system prompt. Đọc tiếp đúng: `game/tests/logic/{economy,save,records,telemetry,i18n}.test.ts` (đích phải đạt) + `game/src/logic/types.ts` + `tests/logic/helpers.ts`. KHÔNG mở specs/, KHÔNG quét cây thư mục, KHÔNG dò tooling.

## File được phép
- TẠO: `game/src/logic/economy.ts` · `save.ts` · `records.ts` · `telemetry.ts` · `i18n.ts` (mỗi file header `// Pattern:` theo STRUCTURE: Registry+data · Memento+migration · Memento · Ring buffer · Registry).
- TẠO config dữ liệu: `game/config/ink.json` · `skins.json` · `album.json` (giá/hệ số lấy đúng bảng PLACEHOLDER trong pack — ghi chú `⚠️ PLACEHOLDER` trong file).
- SỬA: `game/tests/logic/*.test.ts` của B1c **chỉ khi test assert SAI hợp đồng pack** ⇒ sửa tối thiểu + giải trình từng dòng trong báo cáo. CẤM sửa test để khớp code tồi.

## CẤM (làm là hỏng phiên)
- CẤM đổi hợp đồng đã đóng băng: `rational/foldRules/generator/validator/types` + `tests/logic/helpers.ts` + 5 file test B1c (trừ ngoại lệ trên). Test là hợp đồng — **cấm xoá/bỏ `it()`**, cấm `skip`/`todo`.
- CẤM `Math.random|Date.now|performance.now|new Date|fetch|window|document` trong `src/logic` — timestamp/date là THAM SỐ do caller bơm (§8 pack).
- CẤM import chiều ngược: logic không đụng `platform/*`; mọi đọc/ghi storage qua interface `KV` tham số.
- CẤM if/else ≥3 nhánh — bảng tra/registry. CẤM tạo `src/utils.ts` chung. Mỗi file ≤250 dòng (gate G1).
- CẤM bịa số neo: ngưỡng dung lượng (100KB), trần (14/6/5/365), mốc streak (3/5/8) lấy từ pack; không thêm benchmark mới.

## Hành vi cốt lõi phải đúng (test sẽ bắt, nhắc lại để không code hờ)
- `parseSave`/migrate/`validateEvent`: dữ liệu bẩn ⇒ **trả kết quả có kiểu, không ném**; lỗi lập trình ⇒ ném rõ.
- Cứu hộ §4: main→good→fresh, fresh vẫn đọc `m11.wardrobe` cho skin/album/huy hiệu.
- Ghi save: `rev`+1, round-trip parse OK rồi mới đụng KV, sau đó copy mirror; `rev` storage cao hơn ⇒ `take-storage`.
- `inkAward`/`applyPurchase` hàm THUẦN nhận bảng qua tham số — không tự đọc file.
- Ring buffer: immutable push, byte-cap cứng, timestamp đơn điệu.
- `t()`: fallback có chủ đích + `missing`, không ném.

## CỔNG
Chạy `npm run gate` **ĐÚNG 1 LẦN ở cuối** (`cd /data/youtube-playables/M11-Gap/game && npm run gate`) — đừng typecheck/vitest lặp lai rãi. Đỏ ⇒ sửa rồi chạy lại từng vòng, không chạy phòng khi.
Nếu gate-smell bắt oan file dictionary dữ liệu: KHÔNG sửa `tools/`; tách/giữ cấu trúc hợp lý và báo cáo để Hermes xử lý.

## THANG ƯU TIÊN khi sắp hết lượt (bắt buộc theo thứ tự)
1. typecheck XANH (đủ chữ ký cho test import được).
2. save.test + economy.test XANH (PC-16/11 là xương sống).
3. records.test XANH.
4. telemetry.test XANH.
5. i18n.test XANH.
6. config JSON + dọn smell (G2/G3).
Dừng ở đâu cũng phải để repo ở trạng thái gate chạy được, không code nửa chừng không compile.

## BÁO CÁO (cuối phiên, ngắn)
- Bảng file tạo/sửa + 1 câu trách nhiệm mỗi file.
- Output `npm run gate` DÁN THẬT (không tóm tắt) + số test trước/sau.
- Bảng PC-11/12/15/16/19 → hàm nào thực thi.
- Mọi chỗ lệch hợp đồng pack hoặc test ⇒ nêu + lý do. Việc không làm được ⇒ "KHÔNG LÀM ĐƯỢC" + lý do. Cấm bịa.
- KHÔNG commit/push.
