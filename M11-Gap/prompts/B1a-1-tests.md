Bạn là dev viết test cho game TypeScript. Đọc các file sau (đọc hết trước khi viết):
- /data/youtube-playables/M11-Gap/specs/1-paper-crease/SPEC.md  (mục 6: PC-02/PC-03/PC-04, mục 5.4)
- /data/youtube-playables/M11-Gap/specs/1-paper-crease/TEST-CASES.md  (nhóm A "GEN" + case 10.000 đề)
- /data/youtube-playables/M11-Gap/docs/STRUCTURE.md  (ranh giới + pattern + cổng kiểm)
- /data/youtube-playables/M11-Gap/game/src/logic/*.ts  (khung hợp đồng: types, rational, foldRules, generator, validator)

NHIỆM VỤ: viết BỘ TEST cho batch B1a (lõi hình học + sinh đề + validator).
- Chỉ tạo file test trong /data/youtube-playables/M11-Gap/game/tests/logic/ — CẤM sửa bất kỳ file nào trong src/ (để test đỏ đúng nghĩa TDD).
- Chạy được bằng: cd /data/youtube-playables/M11-Gap/game && npm run test:logic

RÀNG BUỘC:
- Test PHẢI ĐỎ vì src chưa implement (hàm đang throw NOT_IMPLEMENTED) — không được viết test kiểu tự thoả mãn (expect(true)) hay bỏ qua case khó.
- Dùng số liệu CHÂN LÝ từ bản Python cũ đã verify (/data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py) làm assert:
  gấp H,V + đục 1 lỗ NGOÀI nếp ⇒ 4 lỗ · lỗ trên nếp ⇒ 2 lỗ · lỗ ở tâm ⇒ 1 lỗ · gấp H,V,H lỗ chung ⇒ 8 lỗ · H,V,H lỗ ở tâm ⇒ 3 lỗ.
- Bắt buộc có case "đếm bằng máy": sinh 10.000 đề liên tiếp (levelIndex 0..9999, seed cố định) ⇒ MỌI đề validateSpec ok, đúng 1 đáp án trong 4, 4 phương án phân biệt, khoảng cách nhỏ nhất ≥ ngưỡng (đọc ngưỡng trong validator/TEST-CASES, không tự bịa).
- Case determinism: cùng (seed, levelIndex) gọi 2 lần ⇒ deep-equal; đổi levelIndex ⇒ đề khác.
- Case `rational`: so khớp chính xác (1/3 + 1/6 == 1/2), `key()` ổn định, không dùng float.
- Mỗi `it()` ghi rõ trong tên case nó phủ rule nào (PC-02/PC-03/PC-04).
- KHÔNG commit/push, KHÔNG chạy build.

BÁO CÁO CUỐI (ngắn, bằng số): danh sách file test đã tạo · tổng số case · output thật của `npm run test:logic` (phải là RED, lý do NOT_IMPLEMENTED) · bảng case → rule PC-xx.
