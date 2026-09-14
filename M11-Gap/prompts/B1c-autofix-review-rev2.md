Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B1c (đợt rev2).

Review độc lập báo FAIL đúng các mục sau (kèm bằng chứng sẵn). Sửa ĐÚNG các mục này, giữ nguyên thứ đã PASS:

[3a-code] | C10 | FAIL | 0 console.log/NOT_IMPLEMENTED, NHƯNG code chết thật: `STORAGE_KEY`+`encodeRecords`+`decodeRecords` có **0 call site** ngoài records.ts và test của nó; `SAVE_KEYS.records` (saveSchema.ts:19) không đường ghi nào; comment cache.ts:17-18 mô tả một test **không tồn tại** |

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.
