Bạn là dev TypeScript. **VÒNG FIX A** cho batch B1a. Sửa đúng 4 nhóm dưới, KHÔNG làm gì khác.

Luật phiên + gói ngữ cảnh (hợp đồng hàm, chân lý hình học, lệnh) đã nằm trong system prompt — đọc trước, KHÔNG cần mở file SPEC/DOC.

## A1. `chainFor` CẤM nuốt cấu hình âm thầm (review F-1, 3/3 phiên báo)
Hiện `generator.ts:113-119` dùng `?? CHAIN_ROWS[0]` ⇒ `foldCount` 4/5 (và `FoldKind` lạ) bị biến âm thầm thành 1 nếp/`'H'`.
- Bảng tra thiếu khoá phải **NÉM LỖI rõ ràng** (`throw new Error("chainFor: foldCount=4 không có trong bảng (xem CHAIN_ROWS)")`), KHÔNG fallback.
- `FOLD_KINDS` (`generator.ts:496`) và `LINE_AXIS` (`foldRules.ts:225`, đang `Partial`) phải phủ **toàn bộ** `FoldKind` — nếu thiếu thì lỗi biên dịch hoặc throw, không nuốt.
- `levelConfigFor` đang đọc `folds` từ cfg rồi **vứt**, chỉ dùng `folds.length`. Phải **tôn trọng chuỗi `folds`** cfg khai; nếu cfg không khai thì mới suy từ bảng. Ghi 1 dòng comment nêu rõ luật này.
- Thêm test: `foldCount` 0/4/5 và `folds` khai sai ⇒ **ném lỗi** (không trả đề).

## A2. validator phải ràng buộc `action` ↔ lỗ (review F-2)
Hiện `validator.ts:73-74`: `sourcesOf = Math.max(1, ...)` ⇒ đề "4 lỗ nhưng 0 điểm đục" hoặc punch rỗng vẫn `ok=true`.
- Thêm rule PC-03: **số lỗ phải khớp `action`** — `punch{n}` ⇒ số điểm đục = `n`; `cut` ⇒ lỗ phải đến từ vùng cắt (theo SPEC §7.5 mới).
- Bỏ `Math.max(1, ...)`: punch rỗng ⇒ `ok=false`.
- Thêm 2 test: punch rỗng ⇒ false; số lỗ ≠ số điểm đục ⇒ false.

## A3. Không lộ mảng nội bộ ra ngoài (review F-4, đã tái hiện `'V,V'` → `'H,H'`)
`generator.ts:116` đưa `CHAIN_ROWS`/cache thẳng vào `LevelSpec.folds` ⇒ người gọi `spec.folds.sort/push` là đổi đề của cùng seed+index (phá PC-02).
- Trả **bản sao đông cứng** (`Object.freeze([...folds])`) — cả trong spec, cả trong cache trước khi trả.
- Thêm test: `spec.folds` là frozen (ghi vào ⇒ `TypeError` ở strict mode) và `spec.folds` không phải chính mảng trong `CHAIN_ROWS`.

## A4. `shareCode` phải có test + chặn input bẩn (review F-8)
- `shareCode(levelIndex, score)` hiện chưa có test và sinh code hợp lệ cho `NaN`/số âm (vd `GAP-JDP5F-NaN`).
- Chặn input: `levelIndex`/`score` phải là số nguyên hữu hạn ≥ 0 ⇒ ném lỗi nếu không.
- Test: 3 case (bình thường, NaN, âm) + ổn định (gọi 100 lần cùng input ⇒ cùng code).

## BÀI TEST KHÔNG ĐƯỢC TỰ THAM CHIẾU (review F-3 — áp cho các test bạn THÊM ở vòng này)
Test bạn thêm phải assert bằng **giá trị/bảng chân lý độc lập** (hardcode số đúng, hoặc công thức viết tay), KHÔNG được lấy chính hàm trong `src/` làm oracle rồi so với chính nó.

## RÀNG BUỘC
- Chỉ sửa file trong `game/src/logic/` + `game/tests/logic/`. KHÔNG sửa SPEC/docs, KHÔNG đổi chữ ký hàm công khai, KHÔNG commit/push.
- Giữ pattern: ≥3 nhánh ⇒ bảng tra; không `Math.random`; `--max-turns` của bạn là 70 nên **đừng dò tooling, đừng đọc lan man**.
- Trước khi báo xong BẮT BUỘC chạy và dán output thật:
  `cd /data/youtube-playables/M11-Gap/game && npm run typecheck && npm run test:logic`

BÁO CÁO (ngắn): mỗi nhóm A1-A4 → file:dòng + 1 câu cách sửa · số test trước/sau · output 2 lệnh · điều gì bạn KHÔNG làm được (nếu có).
