Bạn là dev TypeScript. Sửa **1 VÒNG FIX** cho batch B1a. Đây là 6 vấn đề đã xác định CỤ THỂ (không cần đi tìm thêm):

## A. 2 lỗi TYPECHECK (tsconfig bật noUnusedLocals/noUnusedParameters)
1. `src/logic/foldRules.ts(167,10)`: biến `straightFolds` khai báo nhưng không dùng.
2. `src/logic/validator.ts(80,4)`: tham số `spec` khai báo nhưng không dùng (nếu hàm cần spec theo hợp đồng thì DÙNG nó — xem mục B4, đừng chỉ xoá).

## B. 4 lỗi TEST (đuôi đỏ — phải làm CODE xanh, KHÔNG sửa test trừ mục B5)
Chạy `npx vitest run tests/logic` để tái hiện. Lệnh: `cd /data/youtube-playables/M11-Gap/game`

3. `generator.test.ts:249` — "cfg nào ra đề nấy": 6 màn vi phạm (man 100/102/105/108/111 số điểm đục ≠ `punchCount=2`) ⇒ `levelSpec` **không tôn trọng `punchCount`** từ cfg. Sửa để số điểm đục luôn đúng cfg (PC-01: cấu hình là DỮ LIỆU).
4. `generator.test.ts:293` — đề chương 7+ (`punchCount: 2`) phải có **2 điểm đục** và ≥2 vị trí lỗ khi mở; hiện chỉ 1. Cùng gốc với (3).
5. `validator.test.ts:175` — `validateSpec(wrongIndexSpec())` phải trả `ok=false` khi **`correctIndex` trỏ sai ô** (spec: "đáp án không được xáo random"). Hiện trả `true` ⇒ validator THIẾU kiểm tra `correctIndex` khớp ô có lỗ trùng `answerHoles` (PC-03). Thêm kiểm tra đó + thông điệp lỗi khớp regex `RE_ANSWER` đang dùng trong test.
6. `fold-unfold.test.ts:216` — `unfoldHolesWithCount(['H','V','H'], tâm)` phải trả 3 vị trí với `layers = 2 + 4 + 2` (tổng 8) theo trục toạ độ chuẩn; hiện `byPos.get('0,1/2')` là `undefined` ⇒ hoặc hàm trả toạ độ theo quy ước KHÁC, hoặc thiếu trường `layers`. Đối chiếu `g01_fold_sim.py` (nguồn chân lý) rồi sửa code cho khớp: toạ độ lỗ theo tờ ĐÃ MỞ, gốc (0,0) = góc dưới-trái, `layers` = số lớp chồng tại vị trí đó.

## B5. 1 TEST viết SAI (được phép sửa, phải kèm lý do trong báo cáo)
7. `rational.test.ts:64`: test cho `a = 1/2^53`, `b = 1/(2^53+1)` rồi assert `cmp(a,b) === -1`. Toán học CHÍNH XÁC cho kết quả ngược lại: mẫu nhỏ hơn ⇒ giá trị LỚN hơn ⇒ `cmp(a,b)` phải `+1`. **Sửa TEST** thành `+1` (giữ nguyên tinh thần "phân số khác nhau ở hàng 2^-53 phải thấy khác nhau" — tức `eq=false` giữ nguyên), và ghi rõ lý do trong báo cáo. KHÔNG sửa `rational.ts` cho ca này.

## RÀNG BUỘC
- Chỉ sửa file trong `game/src/logic/` (và 1 dòng test ở `tests/logic/rational.test.ts` cho mục 7). KHÔNG đụng file khác, KHÔNG đổi hợp đồng hàm, KHÔNG commit/push.
- Giữ đúng pattern trong `docs/STRUCTURE.md`; không thêm `if/else` ≥3 nhánh; không dùng `Math.random`.
- Trước khi báo xong BẮT BUỘC chạy và dán output thật:
  `cd /data/youtube-playables/M11-Gap/game && npm run typecheck && npm run test:logic`
  (phải 0 lỗi typecheck + 127/127 test xanh hoặc nhiều hơn nếu bạn thêm case)

BÁO CÁO: mỗi mục 1-7 → file:dòng đã sửa + 1 câu cách sửa · output typecheck + test:logic · ca nào bạn thấy test sai nhưng KHÔNG sửa (kèm lý do).
