# VÒNG ĐÁNH BÓNG LAYOUT 2 (camera dọc 720×1420 đã CHẠY ĐÚNG — chỉ còn phần nhìn)

## Trạng thái đã đạt (KHÔNG được làm hỏng)
- Camera dọc 720×1420 OK; số đo khớp mockup: ô đáp án **240×264**, tờ giấy **480**, sao ↔ Mực **hết chồng** (đã đo bằng Playwright + test `layout.test.ts` 42 case xanh).
- Cổng còn **1 vi phạm thật**: G3 = giá trị `12` khai 2 nơi (`GATE_STARS` ở `src/logic/progression.ts` + `SAFE_PAD` ở `src/render/layout.ts`).

## Việc 1 — Nền 2 BÊN cột phải ra "nền giấy + vignette" (đang là 2 dải xám xấu)
Ảnh chụp thật ở desktop: 2 bên cột là gradient xám-be có **vệt sáng chéo bất đối xứng**, mép cột cắt cứng ⇒ trông như ảnh bị thu nhỏ.
- Làm: nền ngoài = **texture giấy** (dùng lại asset giấy sẵn có, KHÔNG tạo asset mới nếu không cần) + **vignette radial ĐỐI XỨNG** (tối dần đều 4 góc), mép cột có bóng nhẹ để cột "nổi lên" như tờ giấy trên bàn.
- Trên **điện thoại 480×900**: hiện còn 2 dải xám ~12px mỗi bên (canvas 456 rộng). Phải **kín bề ngang** (Scale.ENVELOP/cover hoặc nền ngoài liền mạch cùng tông giấy để không lộ "dải") — không được để lộ dải khác màu.

## Việc 2 — Canh trục trong cột
- Nhãn **"MÀN 23/120"** và hàng sao hiện **lệch trái** so với trục cột; nút **Hint** đứng lẻ một mình lệch trái.
- Làm: mọi phần tử HUD thẳng trục theo mockup §4.1; khi hàng nút chỉ có 1 nút hiện (Hint/Undo/Retry/Unfold loại trừ nhau) thì **canh giữa cột** (hoặc giữ đúng 2 khe như mockup) để không phá trục.

## Việc 3 — Chấm trong ô đáp án KHÔNG được chạm/đè viền
Ảnh thật: chấm navy **đè lên inner frame** (card 1,2,3) và **2 chấm chồng nhau** ở card 4; padding không đều giữa các card.
- Làm: vẽ chấm trong **vùng an toàn** `innerRect(card, 12)`; khoảng cách tối thiểu giữa 2 chấm ≥ 6; nếu pattern nhiều chấm thì **thu bán kính chấm** để vẫn nằm trong vùng an toàn (không được vẽ tràn).
- Thêm test: mọi chấm của mọi pattern nằm trong `innerRect(card,12)` trên **toàn bộ 120 màn** (dùng generator sẵn có), và 2 chấm bất kỳ cách nhau ≥6.

## Việc 4 — Gộp hằng số 12 (G3) + registry QA
- `12` ở 2 file: chọn **1 nguồn sự thật** (hằng `SAFE_PAD` xuất từ `layout.ts`, nơi khác import; nếu `GATE_STARS` là luật nghiệp vụ khác thì đổi tên/giá trị cho khác nghĩa và ghi rõ vì sao).
- **Registry QA còn rect cũ của màn trước**: khi vào màn chơi, rect `testid-title-*` / `loading-bar` vẫn nằm trong registry ⇒ mọi phép kiểm chồng lấn bị nhiễu. Làm: **xoá testid của scene cũ khi scene shutdown** (một cửa, ví dụ `clearTestidsOf(scope)`), và test: sau khi vào PlayScene, registry **không còn** id của TitleScene.

## Cổng & giới hạn
- `npm run gate` phải XANH (G1 nợ đã khai được phép; G3 phải hết).
- Được sửa: `src/render/**`, `src/ui/**`, `src/main.ts`, `index.html`, `tests/logic/layout.test.ts`, `src/logic/progression.ts` (chỉ hằng số). CẤM `specs/**`, `harness/**`. KHÔNG commit/push. **CẤM browser/Playwright/vite preview** (Hermes tự chụp để nghiệm thu).
- BÁO CÁO: file:dòng cho từng việc · output `vitest run tests/logic/layout.test.ts` · output `npm run gate` · việc không làm được.
