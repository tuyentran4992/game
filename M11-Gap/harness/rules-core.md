# LUẬT PHIÊN — Paper Crease (M11-Gap). Đọc hết trước khi làm gì.

## Môi trường ĐÃ DỰNG SẴN (KHÔNG cần dò, KHÔNG cần cài gì)
- Thư mục làm việc: `/data/youtube-playables/M11-Gap/game` (node v22, TypeScript strict, vitest 2.1.9 đã cấu hình trong `vitest.config.ts`).
- Test đặt tại `tests/logic/*.test.ts`, import **tương đối**: `../../src/logic/<file>`, helper chung ở `./helpers`.
- Code nghiệp vụ thuần ở `src/logic/`. `tsconfig` bật `noUnusedLocals` + `noUnusedParameters` ⇒ biến/tham số không dùng là LỖI.
- Lệnh cổng kiểm (chỉ 2 lệnh này, KHÔNG tự nghĩ lệnh khác):
  `cd /data/youtube-playables/M11-Gap/game && npm run typecheck && npm run test:logic`
- Chạy 1 file test: `npx vitest run tests/logic/<file>.test.ts`

## CẤM (làm là hỏng phiên)
1. **CẤM dò tooling**: không viết file `probe*`, không `node --input-type=module`, không thử `ts-node`/`tsx`, không `npm install`, không đọc `node_modules`. Môi trường đã sẵn — cứ viết code rồi chạy lệnh cổng ở trên.
2. **CẤM đọc lan man**: chỉ đọc file trong danh sách "File được phép" của prompt + file bạn phải sửa. Không quét cả cây thư mục, không đọc `specs/` trừ khi prompt chỉ định.
3. **CẤM đổi hợp đồng hàm** (tên, tham số, kiểu trả về) đã có trong `src/logic/`. Test là hợp đồng.
4. **CẤM `Math.random`, `Date.now`, `performance.now`** trong `src/logic/`. Mọi ngẫu nhiên đi qua seed (`seed = hash(gameId + levelIndex)`), hàm phải THUẦN (cùng input ⇒ cùng output).
5. **CẤM số thực dấu phẩy động cho toạ độ**: dùng `Rat` (bigint n/d) qua `rational.ts`.
6. **CẤM** commit/push, cấm sửa file ngoài phạm vi prompt, cấm tạo `src/utils.ts`/`helpers` chung trong `src/`.
7. **CẤM dán log dài**: mọi lệnh phải lọc, ví dụ `| tail -20`; chỉ dán dòng lỗi.

## QUY ƯỚC CODE (giữ gọn, sạch)
- 1 file = 1 trách nhiệm. ≥3 nhánh rẽ ⇒ **bảng tra dữ liệu**, không `if/else` dây.
- Cấu hình/hằng số là DỮ LIỆU (mảng/record), không hardcode trong hàm.
- Hàm thuần, không tham số ngầm; lỗi kiểm ở tầng validator.
- Muốn thêm 1 loại mới (vd 1 `FoldKind`) thì chỉ được sửa BẢNG DỮ LIỆU + test, không rải nhánh khắp nơi.

## CÁCH BÁO CÁO (bắt buộc)
- Mỗi việc: `file:dòng` + 1 câu cách làm.
- Dán output THẬT của lệnh cổng kiểm (không tóm tắt thay).
- Việc nào không làm được: nói thẳng "KHÔNG LÀM ĐƯỢC" + lý do. Cấm bịa.
- Trả lời tiếng Việt, ngắn, không khen ngợi, không mô tả quy trình.
