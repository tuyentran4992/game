Bạn là dev TypeScript. **VÒNG SỬA HẸP F** — cổng đỏ vì **DI CHỨNG CỦA THÍ NGHIỆM "4→5 phương án" CHƯA ĐƯỢC HOÀN TÁC**. Sửa cho xanh, KHÔNG làm gì khác.

## GỐC ĐÃ TÌM RA (không cần điều tra lại)
`game/src/logic/validator.ts:31` đang là `export const OPTION_COUNT = 5;` **nhưng chính comment ngay trên (dòng 12) ghi**: `OPTION_COUNT = 4 ← SPEC.md §1.4 mục 3; đây là NGUỒN, generator import ngược lại`.
⇒ Ai đó (vòng trước) đổi 4→5 để ĐO phép thử mở rộng rồi **quên hoàn tác**, và có thể đã sửa cả test cho khớp giá trị 5.

## LUẬT ĐÚNG (SPEC PC-04 + SPEC §1.4 mục 3)
**Đúng 4 phương án/đề**; `correctIndex` trỏ ô có tập lỗ bằng `answerHoles`; 3 ô nhiễu phân biệt. `OPTION_COUNT` là **nguồn duy nhất**, các nơi khác import (`distractors.ts:29`, `generator.ts:74`).

## VIỆC
1. `validator.ts:31`: đưa `OPTION_COUNT` về **4**.
2. **Rà và hoàn tác MỌI di chứng của thí nghiệm 4→5**: grep `5` cạnh `option|phương án|OPTION` trong `game/src/**` và `game/tests/**` ⇒ chỗ nào đang giả định 5 phải về 4. Các test đỏ hiện tại:
   - `tests/logic/validator-action.test.ts`: "đề phải có đủ 5 phương án, thấy 4" (3 ca)
   - `tests/logic/generator.test.ts`: "hình dạng đề hợp lệ (120 vi phạm: man N co 5 phuong an)" + "correctIndex phải trỏ đúng ô khớp simulator (18 vi phạm)"
   - `tests/logic/chain-config.test.ts`: "D4/F-2 · cfg đủ field và folds:undefined vẫn sinh đề bình thường: expected 5 to be 4"
   - `tests/logic/validator.test.ts`: "đề tốt ⇒ ok = true, errors rỗng: expected [Array(1)] to deeply equal []"
3. Nếu `generator.ts:74` (`stream(...).int(OPTION_COUNT)`) làm `correctIndex` vượt 3 sau khi về 4 thì sửa cho đúng (correctIndex ∈ 0..3, trỏ đúng ô khớp `answerHoles`).
4. Dọn `game/tools/gate-allow.json`: nếu gate-smell không còn báo G1 cho `generator.ts`/`foldRules.ts` (hai file đã nhỏ) và G3 (OPTIONS) đã hết ⇒ để file rỗng `{}`.

## RÀNG BUỘC
- Chỉ `game/src/**`, `game/tests/**`, `game/tools/gate-allow.json`. KHÔNG sửa SPEC, KHÔNG tách file, KHÔNG commit/push, KHÔNG đọc lan man.
- Chạy `npm run gate` **đúng 1 lần** ở cuối, dán output thật. Sắp hết lượt ⇒ ưu tiên typecheck xanh → test xanh → báo cáo.

BÁO CÁO: danh sách file:dòng đã hoàn tác · số test đỏ trước/sau · output `npm run gate` · còn gì chưa làm được.
