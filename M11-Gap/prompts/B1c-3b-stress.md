Bạn là REVIEWER ĐỘC LẬP cho batch B1c — TẤN CÔNG/FUZZ (economy · save · records · telemetry · i18n). **CẤM SỬA FILE TRONG REPO** (nháp + script fuzz trong /tmp thì được).

Luật phiên + checklist + lệnh + ĐỊNH DẠNG OUTPUT đã nằm trong system prompt (gói review) — **đọc phần đó trước, KHÔNG cần mở file checklist nào**.
Đọc thêm đúng: `game/src/logic/{economy,save,records,telemetry,i18n}.ts` và `game/tests/logic/{economy,save,records,telemetry,i18n}.test.ts` (không đọc specs/, không quét cây thư mục).
KHÔNG copy test của tác giả làm bằng chứng — tự viết script fuzz trong /tmp (vitest runfile trỏ /tmp được, hoặc `npx tsx`-style import qua `npx vitest run --root`... nếu bí, compile nhanh bằng cách copy 5 file src sang /tmp rồi chạy node với `tsc` — miễn không đụng repo) và dán output THẬT.

Chấm **F1..F8** theo đòn tấn công B1c:
- F1 fuzz save: ≥2.000 chuỗi JSON ngẫu nhiên/nửa-vết-cắt (`JSON.stringify(saveV1).slice(0,k)` mọi k chia hết cho 17) đưa vào `parseSave`/`rescueLoad` ⇒ 0 lần ném ra ngoài, kết quả luôn có kiểu xác định.
- F2 JSON bẩn có chủ đích: field sai kiểu (`ink:"abc"`, `stars:123`, `version:{}`), key lạ, mảng thừa phần tử, prototype pollution (`"__proto__"`) ⇒ không crash, field lạ giữ nguyên hoặc bỏ CÓ CHỦ ĐÍCH theo §4 pack.
- F3 migrate từ version cũ: tự dựng fixture v0 thiếu 6 field mới ⇒ sau migrate đủ default + `skins_owned`/`album_items`/`badges` còn NGUYÊN; chuỗi migrate idempotent (chạy 2 lần = 1 lần).
- F4 quota/KV chết: KV `throw` mọi lệnh, KV trả `false`, KV xóa sạch giữa phiên (whiteout) ⇒ game-loop mô phỏng 2 màn không exception, state RAM không mất (TC-SAV-07/TC-NET-04 nhưng bằng Ca của BẠN, không phải ca của tác giả).
- F5 i18n thiếu key: `t()` với 500 key random + key rỗng + placeholder thiếu param (`Continue — Level {n}` không truyền `n`) ⇒ không ném, không trả `undefined`, không trả chuỗi chứa `{n}` trần mà không khai báo missing.
- F6 ring-buffer: 50.000 event kích thước lẫn lộn (có event 5KB) ⇒ cap ≤100KB cứng, không mất event mới, timestamp đơn điệu; đo byte bằng TextEncoder.
- F7 hiệu năng: serialize+parse save worst-case (đo ms, làm ≤4 lần/phiên game — nếu >50ms/roundtrip ⇒ báo động kèm số); `inkAward`/`applyPurchase` 100.000 vòng.
- F8 test tự-làm-oracle: chỉ ra `it()` nào trong 5 file test B1c assert bằng cách gọi lại chính hàm src (vd so 2 lần `serializeSave` với nhau) thay vì constant viết tay ⇒ liệt kê file:dòng.

Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`.
- Tin nhắn CUỐI PHẢI là bảng kết luận + mọi ca làm implementation sai/chết kèm repro tối thiểu (input → output thật vs mong đợi) + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Không tìm thấy lỗi ⇒ ghi rõ ĐÃ THỬ những gì.
- Xong trong ≤25 lượt. Thiếu thời gian ⇒ F1/F3/F4 trước, ghi rõ mục bỏ dở.
