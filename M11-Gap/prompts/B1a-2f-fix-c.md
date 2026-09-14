Bạn là dev TypeScript. **VÒNG FIX C** cho batch B1a. 3 việc, THEO ĐÚNG THỨ TỰ (C1 nặng nhất).

Luật phiên + hợp đồng + SPEC §7.5 đã ở system prompt — đọc trước, KHÔNG mở SPEC/DOC, KHÔNG dò tooling.

## C1 (LÀM TRƯỚC — BUG TREO VÔ HẠN, review F2): `gcd` không dừng với `Rat` không hợp lệ
Bằng chứng đo được: 23 case đề xấu ⇒ **3 case TREO VÔ HẠN** (timeout 5s): toạ độ `NaN`, toạ độ `Infinity`, `Rat` dựng từ string. Nguyên nhân: `src/logic/rational.ts:18-27` (`gcd`) lặp mãi khi `n`/`d` không phải bigint hợp lệ.
YÊU CẦU:
- Mọi điểm vào `rational.ts` (`rat`, `add/sub/mul/div`, `eq/cmp`, `toNumber`, `key`...) phải **kiểm kiểu + tính hữu hạn**: `typeof n === 'bigint'` (hoặc số nguyên hữu hạn khi nhận `number`), `d !== 0`; sai ⇒ **ném `Error` rõ ràng** (không treo, không trả Rat rác).
- `gcd` phải **dừng trong mọi trường hợp** kể cả input rác (bảo vệ bằng kiểm dữ liệu ở tầng vào, không phải vòng lặp vá).
- Test: NaN/Infinity/string/`d=0`/số thực 1.5 ⇒ ném lỗi nhanh (< 50ms, assert bằng cách đo thời gian), KHÔNG treo; và 1 test chứng minh `gcd`-qua-`rat` chặn input rác trước khi vào vòng lặp.

## C2 (BUG TREO #2 — review A8): thiếu guard `foldCount` làm bùng nổ thời gian
`generator.ts:104-107` (`BOUNDS`) chỉ guard `levelIndex`/`punchCount`, KHÔNG guard `foldCount`/độ dài `cfg.folds`. Đo thật: `foldCount` 8/10/12 ⇒ **183/291/1435 ms** và sai số lỗ.
YÊU CẦU: guard `foldCount` (dải hợp lệ theo `CHAIN_ROWS` + độ dài `folds`) và **ném lỗi rõ ràng** với giá trị ngoài dải; thêm test đo thời gian (assert mọi giá trị ngoài dải ném lỗi < 50ms thay vì chạy 1,4 giây rồi trả đề sai).

## C3 (review F6): hiện thực **"CẮT GÓC là VÙNG"** theo SPEC §7.5
Code hiện tại trả `holes: unfoldPoints(folds, ONE, [corner])` — **1 ĐIỂM**; `size` tính rồi vứt. Oracle `g01_fold_sim.py:55-83` cắt **vùng tam giác** rồi đếm **cụm** tổn thương. TEST-CASES TC-GEN-11 đã cấm "lỗ tròn".
- Vùng cắt = tam giác vuông tại góc packet, 2 cạnh = `size`; `CUT_SIZES = {1/16, 1/8, 1/4}` × **cạnh NGẮN** packet (bảng dữ liệu, cấm < 1/16).
- Đáp án đề `cut` = **tập ô raster 16×16 bị vùng phủ sau khi mở bung** (sinh từ tập điểm trên vùng, kiểu oracle: `(i,j)` với `i+j ≤ n`), KHÔNG dùng `unfoldPoints` cho 1 điểm.
- So với 3 ô nhiễu bằng **bitmap + hamming ≥ MIN_RASTER_DISTANCE**; nếu 2 cỡ khác nhau ra cùng bitmap ⇒ đề HỎNG (thử lại/ném lỗi, cấm trả đề).
- Phân loại cụm theo oracle: BOTH chiều > 3×`size` ⇒ `full-hole-ish`, ngược lại `edge-notch` — dùng sinh nhiễu.
- Chương 4+: 1-2 nhát cắt, mỗi nhát 1 góc khác nhau.
- **Được phép sửa test cũ của đề `cut`** cho khớp §7.5 (SPEC mới hơn test) — ghi rõ trong báo cáo. Test mới bắt buộc: cùng seed `cut` vs `punch` khác **bitmap**; cỡ 1/16 vs 1/4 khác bitmap; số ô bị phủ TĂNG theo cỡ; số vị trí lỗ = số **cụm** khớp oracle ở ≥6 ca (HV, HVH, HHV, V, D, D+H).

## C4 (review F8): bỏ 2 chỗ oracle TỰ THAM CHIẾU còn sót
`tests/logic/chain-config.test.ts:213` (so `x.folds` với `levelSpec(...).folds` — src so src) và `tests/logic/fold-unfold.test.ts:224-229`. Thay bằng giá trị/bảng chân lý **viết tay trong test** (hoặc so với `g01_fold_sim.py`).

## KHÔNG LÀM ở vòng này
KHÔNG tách file, KHÔNG đổi tên hằng, KHÔNG xoá API chết, KHÔNG đụng `gate-allow.json` (để vòng D).

## RÀNG BUỘC
- Chỉ `game/src/logic/**` + `game/tests/logic/**`. KHÔNG sửa SPEC/docs, KHÔNG commit/push, KHÔNG đổi chữ ký hàm công khai.
- Chạy `npm run gate` ĐÚNG 1 LẦN ở cuối. Sắp hết lượt ⇒ (1) typecheck xanh → (2) test xanh → (3) báo cáo.

BÁO CÁO: mỗi mục C1..C4 → file:dòng + 1 câu · test nào sửa/thêm · output `npm run gate` · việc không làm được.
