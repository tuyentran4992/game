Bạn là dev viết test cho game TypeScript — batch B1b, NỬA B: tiến trình + sao (`progression`).
Luật phiên + gói ngữ cảnh B1b (hợp đồng `progression` mục 3, bảng §6.1 mục 4, bẫy mục 5) đã nằm trong system prompt — bám ĐÚNG nguyên văn chữ ký trong đó, không tự đổi tên/kiểu.

## Phạm vi NỬA B — chỉ 2 file test này
| File tạo mới | Phủ case TEST-CASES |
|---|---|
| `game/tests/logic/stars.test.ts` | TC-STR-01 (`win(true,false)===3`), TC-STR-02 (`win(true,true)===2`), TC-STR-03 (`win(false,·)===1` kể cả kèm hint), TC-STR-08 (`markSkip` ⇒ '0', `sumStars` không tăng), bảng §3.3 stars.json đúng 4 dòng logic đã phủ hết |
| `game/tests/logic/progression.test.ts` | TC-PRG-01 (8 dòng `CAMPAIGN`, `chapter*15===120`, không trùng/rỗng), TC-PRG-02 (`newFoldVocab` 8 chương đôi một khác, đúng 1 từ vựng/chương), TC-PRG-03 (2 chương kề không cùng lộ 2 luật tại 1 màn — suy từ `revealLevel`), TC-PRG-04 (`timerEnabled` false ch1-6, true ch7-8), TC-PRG-05 (fixture stars 11/12/15 ⇒ ch2 khoá/mở/mở — KHÔNG bắt full sao), TC-PRG-06 (12 sao thật + 3 skip vẫn mở), TC-PRG-07 (mất sao chơi lại ⇒ `isChapterUnlocked` vẫn true qua `bestLevel` — chống softlock), TC-PRG-08 (`paperThemeOf` 8 chương đủ 8 id, cùng chương ⇒ cùng id), TC-STR-05 (hàm thuần `freeHintAvailable`: n+1 false, n+2 true) |

Số case mục tiêu: **18–26 `it()`**, mỗi `it()` ghi rule PC-xx trong tên.

## QUY TẮC (vi phạm = viết lại)
- CHỈ được tạo/đọc: 2 file test của bạn. KHÔNG đụng `tests/logic/helpers.ts`, KHÔNG đụng file test nửa A (chạy song song — 2 con không được sửa chung file nào). Fixture `stars` chuỗi dựng tay bằng `('1'.repeat(n) + '0'.repeat(120-n))` hoặc vòng for trong file của bạn.
- CẤM sửa `src/`. CẤM try/catch quanh import, CẤM `it.skip`/`it.todo` — đỏ vì module chưa tồn tại là ĐÚNG.
- **Cấm lấy hàm trong `src/` làm oracle**: bảng §6.1 chép TÂY SANG file test dạng const (vd `TABLE_6_1: [chapter, vocabId, reveal, layers, timer][]`) rồi đối chiếu `CAMPAIGN` vào bảng đó; kỳ vọng `win` là 1/2/3 hardcode, không dẫn xuất từ công thức trong src.
- Assert giá trị cụ thể (số sao, chuỗi stars trước/sau `applyResult`, boolean mở khoá), không `toBeDefined` suông. `applyResult` phải test cả tính **ghi đè** (3★ → 1★ ⇒ còn 1, không giữ max) và chiều dài chuỗi không đổi.
- Input bẩn có ca riêng: `chapterOf(0|-7|1.5|121|NaN)`, `sumStars(stars ngắn/dài/ký tự 'x')`, `isChapterUnlocked(chapter 9)` ⇒ NÉM LỖI rõ (hợp đồng mục 3 pack), không trả bừa.

## LỆNH
- Chạy từng file: `cd /data/youtube-playables/M11-Gap/game && npx vitest run tests/logic/stars.test.ts` (tương tự file progression).
- Chứng minh RED là BẮT BUỘC trước khi báo xong.

## NGÂN SÁCH & BÁO CÁO
≤90 lượt. Sắp hết ⇒ ưu tiên: file progression phủ TC-PRG đủ → file stars → chạy 2 lệnh vitest.
BÁO CÁO CUỐI (ngắn, bằng số): 2 file đã tạo · tổng `it()` · bảng `case → TC-PRG/TC-STR/PC` · output THẬT 2 lệnh vitest (phải đỏ vì module chưa có) · điểm nghi ngờ về hợp đồng (nếu có, ghi rõ "kiến nghị", không tự sửa pack).
