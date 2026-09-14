Bạn là dev TypeScript — tác giả DUY NHẤT của batch B1b. Test đã viết xong (4 file, đang ĐỎ). Việc của bạn: code cho tới khi cổng xanh, rồi báo cáo.

File ĐƯỢC PHÉP tạo — đúng 2 file này, không hơn:
- `game/src/logic/levelState.ts` (Pattern: State machine) — theo hợp đồng mục 2 của pack.
- `game/src/logic/progression.ts` (Pattern: Registry) — theo hợp đồng mục 3 + bảng §6.1 mục 4 của pack.
Test 4 file trong `game/tests/logic/` là HỢP ĐỒNG đã chốt — CẤM sửa test để nó xanh. Nếu 1 test mâu thuẫn pack ⇒ theo PACK, ghi vào báo cáo.
CẤM đổi chữ ký đã công bố trong pack (tên, tham số, kiểu trả về, tên phase, tên field `LevelState`/`ChapterRow`). CẤM sửa `src/logic/` cũ, helpers, `tools/`, `game/config/` (B1c), specs/.
CẤM `Math.random`/`Date.now`/`performance.now`/`console.log`/`any`/`@ts-ignore`/DOM — gate-smell G4 bắt. Cấm tạo `src/utils.ts`.
Mỗi file ≤250 dòng. Không thêm file nào vào `tools/gate-allow.json` — nợ B1a đã tính sau.
Đồ thị chuyển phase + bảng `explainKey` + `CAMPAIGN` là DỮ LIỆU dạng const (TRANSITIONS, LEVEL_PHASES, bảng §6.1). `levelState` không import `progression` và ngược lại. `inkEarned: 0`.

## QUY TẮC CODE
- Chữ ký hàm PHẢI khớp nguyên văn pack mục 2 và 3. Test đỏ vì sai tên ⇒ giữ tên pack, ghi rõ trong báo cáo.
- CẤM đổi hợp đồng trong test để code khớp: nếu tin 1 test SAI, KHÔNG sửa nó — ghi vào mục "ĐIỂM XUNG ĐỘT" của báo cáo, implement theo pack.
- 1 file = 1 trách nhiệm. `TRANSITIONS` và `CAMPAIGN` và bảng `explainKey` là DỮ LIỆU const (registry), không if/else ≥3 nhánh theo loại. `levelState` không import `progression`, `progression` không import `levelState`.
- CẤM import `generator.ts`/`foldRules.ts`/`platform/*`/Phaser/DOM vào 2 file mới. Chỉ được import từ `types.ts` (+ `rational.ts` cho `pointKey` khi tính missing/extra holes).
- Không mutate input state; mỗi hàm trả object mới. Không side-effect ngoài tham số.
- CẤM dò tooling: không `npm install`, không đọc `node_modules`, không probe file, không thử runner khác. Không đọc file ngoài danh sách trên.

## TRÌNH TỰ BẮT BUỘC
1. Đọc 4 file test + `types.ts` + `rational.ts` + `helpers.ts` (chỉ đọc, không sửa).
2. Viết `levelState.ts` → chạy `npx vitest run tests/logic/level-state.test.ts tests/logic/hint-undo.test.ts`, sửa tới khi 2 file xanh.
3. Viết `progression.ts` → chạy `npx vitest run tests/logic/stars.test.ts tests/logic/progression.test.ts`, sửa tới khi xanh.
4. **CHẠY `cd /data/youtube-playables/M11-Gap/game && npm run gate` ĐÚNG 1 LẦN ở cuối** (không lặp gate nhiều lần; không tự chạy typecheck/test riêng lẻ nữa). Gate đỏ ⇒ sửa rồi chạy lại, tối đa 2 lần.

## THANG ƯU TIÊN KHI SẮP HẾT LƯỢT
(1) `typecheck` xanh → (2) `test:logic` xanh (levelState trước, progression sau) → (3) `gate-smell` không lỗi MỚI (dán output thật) → (4) báo cáo. Không kịp thì báo cáo trung thực, ghi rõ phần dở — CẤM nói "xong" khi cổng chưa xanh.

## BÁO CÁO CUỐI (tiếng Việt, ngắn)
- Mỗi file: đường dẫn + số dòng + `file:dòng` cho `TRANSITIONS`, `CAMPAIGN`, `resultOf`, `isChapterUnlocked`.
- Output THẬT của `npm run gate` (dán nguyên khối kết thúc, không tóm tắt) + số test pass/fail.
- ĐIỂM XUNG ĐỘT giữa test và pack (nếu có): file:dòng của test + 1 câu.
- Việc KHÔNG làm được: nói thẳng + lý do. Cấm bịa.
