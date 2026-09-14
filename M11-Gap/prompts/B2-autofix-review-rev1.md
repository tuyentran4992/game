Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B2 (đợt rev1).

Review độc lập báo FAIL đúng các mục sau (kèm bằng chứng sẵn). Sửa ĐÚNG các mục này, giữ nguyên thứ đã PASS:

[3a-code] | C9 | FAIL | input xấu đo thật: `?level=abc/-9/0/1.5/1e6`, `?seed=zz`, `?level=999…`(19 số), seed 5000 ký tự, `&&&`, `%xx` hỏng → **0 exception, 0 NaN**, fuzz 6000 chuỗi: `throw=0 levelOutOfRange=0 nonDeterministic=0`. NHƯNG 2 crash thật còn sống: (a) bridge partial → TypeError (dòng C6 PC-20); (b) `platformRegistry.resolve('toString')` trả **hàm của Object.prototype** thay vì default adapter (đo `typeof resolve('toString') === "function"`, `resolve('__proto__') !== resolve('standalone')`) — do index bằng ngoặc vuông src/platform/index.ts:42-43 không guard prototype |
[3a-code] | C10 | FAIL | mục (b) ở C9 là "crash im lặng" kiểu mới: resolve tên lạ trả object rác chứ không rơi về dòng mặc định của bảng, đúng trường hợp index.ts:6 tự tuyên bố "không crash" |

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.
