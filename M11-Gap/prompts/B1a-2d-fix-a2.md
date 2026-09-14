Bạn là dev TypeScript. **VÒNG DỌN A2** — việc rất nhỏ, làm nhanh, ĐỪNG đọc lan man (môi trường + hợp đồng đã nằm trong system prompt).

Trạng thái: vòng fix trước đã sửa code xong nhưng **typecheck còn đỏ** vì 2 biến khai báo không dùng:
```
tests/logic/validator-action.test.ts(12,30): error TS6133: 'FIX_D2' is declared but its value is never read.
tests/logic/validator-action.test.ts(12,38): error TS6133: 'FIX_D3' is declared but its value is never read.
```
(tiện thể soi luôn `share-code.test.ts` và `chain-config.test.ts` xem còn biến/hàm không dùng nào không)

Việc:
1. Xoá 2 hằng không dùng (hoặc DÙNG chúng nếu bản thân test cần — nếu vậy phải là assert thật, không phải `void`). Tuyệt đối **không** để lại biến thừa.
2. Chạy và dán output thật:
   `cd /data/youtube-playables/M11-Gap/game && npm run gate`
   (`npm run gate` = typecheck + test:logic + **gate-smell** kiểm lặp/smell cơ học; nếu gate-smell báo vi phạm THẬT thì sửa, còn mục "NỢ ĐÃ KHAI" thì bỏ qua — đó là nợ đã đăng ký ở vòng C/B)
3. Nếu test cũ đỏ vì thay đổi của vòng A (hợp đồng mới: `chainFor` ném lỗi, validator bắt action↔lỗ, `folds` frozen), hãy sửa **test cho khớp hợp đồng mới** — nhưng chỉ khi hợp đồng mới đúng theo gói ngữ cảnh.

QUY TẮC ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH, (2) test XANH, (3) báo cáo ngắn. Đừng đọc thêm file ngoài 3 file test + src/logic.
KHÔNG sửa SPEC/docs, KHÔNG commit/push, không đổi chữ ký hàm công khai.

BÁO CÁO: file:dòng đã sửa · output `npm run gate` (dán thật) · đếm test xanh/tổng.
