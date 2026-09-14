Bạn là dev TypeScript. **VÒNG FIX E** cho batch B1a: **DỌN CẤU TRÚC** (thuần refactor — KHÔNG đổi hành vi nghiệp vụ). Review kiến trúc độc lập báo FAIL các mục dưới; sửa ĐÚNG các mục này, giữ nguyên thứ đã PASS.

LUẬT SẮT: sau MỖI bước nhỏ, `npx tsc --noEmit` phải sạch và test không được giảm dưới **200 case xanh**. Cuối cùng chạy `npm run gate` ĐÚNG 1 LẦN. Hợp đồng hàm công khai giữ nguyên tên + chữ ký (test là hợp đồng).

## E1 — TÁCH FILE (mục A2; `generator.ts` = 958 dòng, ≥7 trách nhiệm)
Tách thành các module ≤ **250 dòng** (ngưỡng gate-smell G1), giữ import 1 chiều, không vòng:
- `chainTable.ts` — `CHAIN_ROWS` + `chainFor`/`declaredChain`/guard chuỗi nếp (hiện ~97-265)
- `gen/punch.ts` (hoặc `punchPoints.ts`) — đặt điểm đục (296-397)
- `gen/cutRegion.ts` — vùng cắt + cụm (400-550)
- `distractors.ts` — registry ô nhiễu + dựng ô nhiễu (554-768)
- `shareCode.ts` — mã chia sẻ (770+)
- `chapters.ts` — parser/đối chiếu bảng chương
- `generator.ts` — chỉ còn điều phối `levelSpec` + gắn kết
Cũng tách `foldRules.ts` nếu > 250 dòng (ví dụ `foldGeometry.ts` cho hàm hình học thuần). Cập nhật `M11-Gap/docs/STRUCTURE.md` cho khớp cây file (được phép sửa đúng file này).

## E2 — MỘT NGUỒN cho mỗi sự thật (mục A9 — đang là NỢ khai báo G3)
- `OPTIONS = 4` (generator) vs `OPTION_COUNT = 4` (validator) ⇒ giữ **một nguồn duy nhất**, nơi khác import.
- `RASTER_CELL = rat(1,16)` (foldRules) vs `RASTER_GRID = 16` (validator) ⇒ **một nguồn**, cái kia suy ra (`rat(1, RASTER_GRID)`), không khai song song.
- Sau khi xong: **làm rỗng `game/tools/gate-allow.json`** (nợ phải trả hết; file rỗng hoặc `{}` là đúng).

## E3 — Magic number trong hàm ⇒ bảng/const CÓ TÊN (mục A8)
`% 3 === 0` (:252), `% 3 === 2 || rng.int(3) === 0` (:780), hệ số rải `*101` (:616), `v*17+3` (:694), `i*23+5` (:723), `Math.min(3, …)` (:630, :677), và các ngưỡng tương tự trong nhóm cut/nhiễu. Gom thành const có tên + comment 1 dòng ý nghĩa (nhịp dạy luật, số ô nhiễu tối đa, hệ số trộn PRNG...). KHÔNG đổi giá trị ⇒ không đổi hành vi.

## E4 — API/field CHẾT (mục A6): xoá hoặc chứng minh có người dùng
`FoldRule.reflect` (foldRules.ts:47), `Layer.map` + `Layer.slice` (:138-170), `packetCorner` (nếu 0 call site trong `src`), `validator.cellKeyOf` (nếu vẫn 0 consumer). Mỗi cái: **xoá**, hoặc thêm 1 consumer THẬT trong src. Không được để API mồ côi mà chỉ test gọi.

## E5 — Phép thử MỞ RỘNG phải đạt (mục A5, A15)
Hiện `foldRules.ts:254-257` khẳng định sai: widen `FoldKind` +'Z' mà tsc vẫn sạch, 200 test vẫn xanh dù `FOLD_RULES` **không có dòng Z**.
- Làm registry **phủ toàn bộ `FoldKind` theo kiểu compiler ép được** (`Record<FoldKind, FoldRule>` + `satisfies`), để thiếu dòng ⇒ lỗi biên dịch.
- Thêm test khẳng định: `Object.keys(FOLD_RULES)` phủ hết `FOLD_KIND_ALL` (không so danh sách hardcode).
- **Đích đo (phải đạt)**: (a) thêm 1 `FoldKind` mới ⇒ chỉ sửa **≤2 file** (1 file bảng dữ liệu + `types.ts`); (b) đổi số phương án 4→5 ⇒ chỉ sửa **1 file** (sau E2 số này chỉ còn 1 nguồn). Ghi vào báo cáo số file phải sửa cho mỗi phép thử (đo thật, không phỏng đoán).

## E6 — Bộ nhớ đệm & tham chiếu nội bộ (mục A10)
- 6 `Map` module-level không trần (generator.ts:270-272, 390, 433, 456) ⇒ thêm **trần kích thước** (LRU/xoá cũ; ví dụ hằng `CACHE_MAX` có tên) hoặc bỏ cache nếu vô dụng.
- 3 chỗ **trả nguyên tham chiếu vùng đệm** (:295, :438, :468 — `cutCandidates` là export công khai) ⇒ trả **bản sao/đông cứng** để người gọi không sửa được trạng thái nội bộ.
- Test bắt buộc: (a) người gọi `push/sort` vào mảng trả về ⇒ gọi lại cùng tham số cho kết quả Y HỆT (chống ăn mòn trạng thái); (b) cache có trần: gọi > trần lần ⇒ kích thước map không vượt trần (được phép export getter nhỏ để test đo).

## E7 — Test không KHOÁ chi tiết nội bộ (mục A14)
`fold-rules.test.ts:22,42-43,107,114` (dùng `reflect`, `typeof L.map === 'function'`, tính bằng `L.map`) và `chain-config.test.ts` (chép tay bảng `CHAIN_ROWS`) ⇒ sửa thành test **hành vi** (kết quả sinh đề, phép thử mở rộng), không dùng API nội bộ làm đường tính.

## E8 — Báo cáo nợ
Cuối vòng: `gate-allow.json` rỗng; ghi vào báo cáo mục nào từng là nợ và đã trả bằng cách nào.

## RÀNG BUỘC
- Chỉ `game/src/**` + `game/tests/**` + `game/tools/gate-allow.json` + `M11-Gap/docs/STRUCTURE.md`. KHÔNG sửa SPEC, KHÔNG commit/push.
- KHÔNG đọc lan man (hợp đồng + lệnh + quy ước đã ở system prompt).
- Sắp hết lượt ⇒ (1) typecheck xanh → (2) test xanh → (3) báo cáo.

BÁO CÁO: mỗi mục E1..E8 → file:dòng + 1 câu · cây file sau khi tách (kèm số dòng) · số file phải sửa cho 2 phép thử ở E5 · output `npm run gate` · nợ còn lại (nếu có).
