Bạn là dev viết test cho game TypeScript — batch B1b, NỬA A: máy trạng thái màn (`levelState`).
Luật phiên + gói ngữ cảnh B1b (hợp đồng `levelState` mục 2, bảng §6.1 mục 4, bẫy mục 5) đã nằm trong system prompt — bám ĐÚNG nguyên văn chữ ký trong đó, không tự đổi tên/kiểu.

## Phạm vi NỬA A — chỉ 2 file test này
| File tạo mới | Phủ case TEST-CASES |
|---|---|
| `game/tests/logic/level-state.test.ts` | TC-SES-01 (tập phase đúng 6, không win-screen, `correct`→`next`), TC-SES-02 (sai→`retry` về `ready` cùng spec), TC-SES-03 + TC-ERR-06 (bấm thừa bị buffer: `taps` không đổi, không nhân thưởng), TC-SES-04 (`makeNext` gọi ĐÚNG 1 lần, `nextSpec` có sẵn ở `correct`), TC-SES-05 (`advanceClock` không đổi phase, không phạt), TC-SES-06 (màn = breakpoint: mọi state suy lại được từ cùng chuỗi action — determinism) |
| `game/tests/logic/hint-undo.test.ts` | TC-STR-04 (hint max 1/màn, lần 2 no-op state không đổi), TC-STR-06 (`peekFold` trả đúng 1 foldIndex, không lộ đáp án, null khi chưa bật hint), TC-STR-07 (undo ≤1/màn, lần 2 từ chối, chỉ đi từ `wrong`), TC-ERR-13 (tổ hợp hint+undo không phá `firstTry`) |

Số case mục tiêu: **18–26 `it()`**, mỗi `it()` ghi rule PC-xx trong tên.

## QUY TẮC (vi phạm = viết lại)
- CHỈ được tạo/đọc: 2 file test của bạn + `tests/logic/helpers.ts` (dựng `LevelSpec` giả bằng `goodSpec()`/`mkSpec()` — có sẵn, KHÔNG sửa helpers, KHÔNG tạo helper file mới). CẤM đọc file khác, CẤM đọc specs/, CẤM quét cây thư mục.
- CẤM sửa `src/` (test phải đỏ đúng nghĩa TDD). CẤM import `levelState.ts` bằng try/catch, CẤM `it.skip`/`it.todo` — đỏ vì module chưa tồn tại là ĐÚNG.
- **Cấm lấy hàm trong `src/` làm oracle**: mọi kỳ vọng là hằng số/bảng viết tay trong test (vd danh sách phase hardcode `['loading','ready','answered','correct','wrong','next']`, không dẫn xuất từ `LEVEL_PHASES`). Được phép import TYPE của `levelState` (`import type` bị xoá lúc chạy ⇒ vẫn đỏ khi module thiếu — chấp nhận, code sẽ tạo module).
- Assert giá trị cụ thể sau mỗi bước chuyển (phase + `taps` + `misses` + `hintUsed` + `undoUsed` + `elapsedMs` + `lastWrong` khi relevan), không `toBeDefined` suông.
- Input bẩn phải có ca riêng: `tap(state, -1|4|NaN)`, `advanceClock(-5)`, `retry`/`resolve`/`nextLevel`/`useUndo` gọi sai phase ⇒ theo hợp đồng mục 2 pack (ném lỗi rõ HOẶC no-op nguyên trạng — đúng ô nào ghi rõ trong tên case).
- `explainKey` chỉ được assert là ID nằm trong bảng 4 giá trị mục 2 pack (PC-19 — không phải chuỗi hiển thị).

## LỆNH
- Chạy từng file: `cd /data/youtube-playables/M11-Gap/game && npx vitest run tests/logic/level-state.test.ts` (tương tự file hint-undo).
- Chứng minh RED là BẮT BUỘC trước khi báo xong.

## NGÂN SÁCH & BÁO CÁO
≤90 lượt. Sắp hết ⇒ ưu tiên: file level-state đủ case → file hint-undo đủ case → chạy 2 lệnh vitest.
BÁO CÁO CUỐI (ngắn, bằng số): 2 file đã tạo · tổng `it()` · bảng `case → TC-SES/TC-STR/PC` · output THẬT 2 lệnh vitest (phải đỏ vì module chưa có) · điểm nghi ngờ về hợp đồng (nếu có, ghi rõ "kiến nghị", không tự sửa pack).
