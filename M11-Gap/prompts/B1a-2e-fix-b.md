Bạn là dev TypeScript. **VÒNG FIX B** cho batch B1a. 3 việc, theo ĐÚNG thứ tự ưu tiên dưới đây.

Luật phiên + gói ngữ cảnh (hợp đồng hàm, chân lý hình học, SPEC §7.5, quy ước test) đã nằm trong system prompt — đọc trước, KHÔNG mở file SPEC/DOC, KHÔNG dò tooling.

## B1 (ƯU TIÊN 1 — LỖI THẬT, review F1): `levelSpec` KHÔNG tôn trọng `cfg.punchCount`
Bằng chứng đo được: fuzz 6.000 đề ⇒ **338/6000 (5,6%)** sai `cfg.punchCount`; quét định hướng chain `HV/HVH/HHV` + `punchCount` 3-4 ⇒ **thiếu 200/200 seed**, luôn chỉ ra 2 nguồn đục; với bảng chương thật 8×15 ⇒ **25/120 màn sinh ít điểm đục hơn config khai** (vd level 92 cfg punchCount=3 ⇒ chỉ 1 nguồn). Chỗ nghi: `generator.ts:267` (first-fit `punchPoints`) và `generator.ts:461` `Math.max(1, cfg.punchCount)`.
YÊU CẦU: số điểm đục phải ĐÚNG BẰNG `cfg.punchCount`. Nếu hình học của chain không cho phép đủ số điểm (hết ô hợp lệ) thì **NÉM LỖI rõ ràng** (kèm chain + punchCount) chứ KHÔNG âm thầm bớt. Thêm test: (a) quét 120 màn của bảng chương thật ⇒ mọi màn có đúng `cfg.punchCount` điểm đục; (b) 200 seed × chain HV/HVH/HHV × punchCount 3-4 ⇒ không màn nào thiếu.

## B2 (ƯU TIÊN 2 — review F2 "2 chỗ hở"): chặn input bẩn ở `levelSpec` + `validateSpec({})`
- `levelSpec(seed, levelIndex, cfg)` hiện KHÔNG kiểm `levelIndex` (NaN/0/-7/1e6/1.5 đều sinh đề) và KHÔNG kiểm `punchCount` (0/-5/99). Phải kiểm như `levelConfigFor` (số nguyên, trong dải; punchCount ≥ 1) và **ném lỗi rõ ràng**.
- `validateSpec({})` / spec thiếu field ⇒ hiện **ném TypeError**; phải trả `{ ok: false, errors: [...] }` với thông điệp nêu field thiếu (validator KHÔNG được ném).
- Test: mỗi input bẩn 1 case, assert `toThrow`/`ok === false` cụ thể.

## B3 (ƯU TIÊN 3 — review F8): bỏ oracle TỰ THAM CHIẾU trong test
- `tests/logic/validator.test.ts:38-42` đang tính `minPairDistance` bằng đúng `bitmapOf`+`hamming` mà rule PC-04 dùng ⇒ lỗi ở 2 phía không bị phát hiện. Thay bằng **công thức khoảng cách viết tay trong test** (đếm ô lệch theo toạ độ, tự viết).
- `tests/logic/generator-10000.test.ts` không được lấy `validateSpec.ok` làm cổng DUY NHẤT: thêm kiểm tra độc lập (tự đếm ô raster của đáp án bằng công thức riêng + đối chiếu số lỗ với bảng chân lý hình học cho ≥20 seed).

## KHÔNG LÀM ở vòng này (để vòng sau)
- KHÔNG hiện thực SPEC §7.5 (cắt góc thành vùng) — vòng sau.
- KHÔNG tách file/tái cấu trúc `generator.ts`, KHÔNG đổi tên hằng, KHÔNG xoá API chưa dùng — vòng sau.

## RÀNG BUỘC + THANG ƯU TIÊN
- Chỉ sửa `game/src/logic/**` + `game/tests/logic/**`. KHÔNG sửa SPEC/docs, KHÔNG đổi chữ ký hàm công khai, KHÔNG commit/push.
- **Chạy `npm run gate` ĐÚNG 1 LẦN ở cuối** (đừng tự chạy typecheck/vitest lặp lại nhiều lần để tiết kiệm thời gian). Nếu gate đỏ thì sửa rồi chạy lại.
- Sắp hết lượt ⇒ thứ tự bắt buộc: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.

BÁO CÁO: mỗi mục B1/B2/B3 → file:dòng + 1 câu cách sửa · số test trước/sau · output `npm run gate` (dán thật) · việc không làm được (nếu có).
