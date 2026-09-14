# VÒNG SỬA LAYOUT — camera CỘT DỌC 720×1420 (chủ dự án đã CHỐT phương án A)

> **CẢNH BÁO TRẠNG THÁI:** đã có MỘT PHIÊN TRƯỚC làm việc này và **bị dừng giữa đường** (không phải lỗi của bạn). Dấu vết có thể còn: `src/main.ts` đã đổi sang `const DESIGN = CAMERA;`, đã có `tests/logic/layout.test.ts`. **Hãy ĐỌC trạng thái hiện tại trước**, rồi hoàn tất hoặc hoàn tác cho NHẤT QUÁN — đừng giả định file còn nguyên như mô tả bên dưới, và đừng tạo file thứ hai trùng chức năng.

## Sự thật đã đo (không cần điều tra lại, đây là bằng chứng Playwright + đọc code)
- `src/main.ts:92` đặt `DESIGN = { width: 1920, height: 1080 }` (camera NGANG) + `Scale.FIT`. **SAI với mockup**: `specs/1-paper-crease/DESIGN-SPEC.md` §4 vẽ theo **cột dọc 720** với mốc y tới **1420**, và §2 ghi rõ "Mobile-first playfield COLUMN … desktop hiển thị y hệt mobile, 2 bên là nền giấy + vignette".
- Hệ quả đo được: tờ giấy **453,6×453,6** (mockup 480×480) · ô đáp án **334,8×172,8** (mockup 240×**264** — phải CAO hơn rộng) · **HUD sao (x 841,2→1078,8) CHỒNG hũ Mực (x 952,8→1093,2) = 126 đơn vị** · trên điện thoại 480×900, FIT cho canvas **480×270** (game bé như con tem).
- Mọi scene đã gọi `layoutOf(cam.width, cam.height)` rồi dùng `l.<tên ô>` — nên sửa `layout.ts` là sửa cả 8 scene.

## V1 — Camera dọc
`src/main.ts`: `DESIGN = { width: 720, height: 1420 }`, giữ `Scale.FIT` + `CENTER_BOTH`. Thêm nền NGOÀI cột (2 dải letterbox trên desktop) = màu giấy + vignette nhẹ, đặt trong `index.html`/theme (KHÔNG nhét CSS tuỳ tiện rải rác trong scene).

## V2 — `src/render/layout.ts`: bảng số = SỐ THIẾT KẾ (đơn vị 720×1420), không còn tỷ lệ theo chiều cao
Giữ NGUYÊN tên các trường trong `type Layout` (`field, portrait, level, stars, ink, sound, menu, sheet, options, hint, undo, undoAd, retry, unfold, play, shop`) để 8 scene không phải đổi cấu trúc. `s = h / 1420` (độ dày nét). Số chốt (**nguồn sự thật duy nhất**, lấy từ §4.1):
- cột `field` = x 0..720 (đầy) · `portrait` = 720 rộng giữa camera
- HUD hàng 1 (y **16**, cao **64**): `level` (16,16,300,64) · `sound` (560,16,64,64) · `menu` (640,16,64,64)
- HUD hàng 2 (y **88**, cao **64**): `stars` (16,88,240,64) · `ink` (560,88,144,64)  ← **phải hết chồng nhau**
- `sheet`: (120,170,480,480) · vùng banner sai (60,690,600,60)
- `options` 2×2: mỗi ô **240×264**, gap **24** ⇒ (108,700) (372,700) (108,988) (372,988)
- hàng nút (y **1312**, cao **72**): `hint` (108,1312,240,72) · `undo` (372,1312,240,72); `undoAd`/`retry`/`unfold` dùng đúng ô tương ứng như cũ
- Title §4.2: sheet 560×560 (80,180) · chữ Paper Crease · `play` (240,980,240,88) · `shop` (240,1096,240,72)
- Nếu scene khác cần thêm ô (map 5×3 ô 168, album 4 cột ô 200, shop 2×4 skin 260×300) thì THÊM trường mới vào `Layout` bằng số mockup §4.3/§4.5 — không nhân tỷ lệ lẻ trong scene.

## V3 — TEST CỨNG (bắt buộc, thuần số, không phaser): `tests/logic/layout.test.ts`
Viết test khẳng định đúng các điều sau (đây là lưới an toàn cho lỗi "méo mó" vừa rồi):
1. mọi ô nằm trong cột (x 0..720, y 0..1420) và HUD/nút cách mép ≥ **16**
2. **không hai ô nào chồng nhau** trong các nhóm {level, stars, ink, sound, menu}, {4 options}, {hint, undo, retry, unfold} — chồng >0 ⇒ ĐỎ (bài học: bug HUD chồng 126 đơn vị lọt qua mọi review vì chỉ kiểm chuỗi trong file)
3. số mockup: `sheet` 480×480 · mỗi option 240×264 · `sound`/`menu` 64×64 · lưới options **đối xứng qua trục x=360**
4. mọi vùng chạm ≥ **44×44**
5. `layoutOf(720,1420)` và `layoutOf(w,h)` với w/h lệch (vd 1200×1600) đều cho cùng bố cục tỉ lệ theo cột (nếu bạn chọn thiết kế "camera cố định" thì test ghi rõ camera cố định 720×1420)

## V4 — Scene
Chỉ sửa scene khi nó tự cộng/trừ số lẻ để đặt vị trí (đưa số về `layout.ts`). Giữ nguyên lời gọi `layoutOf(cam.width, cam.height)`.

## V5 — Cổng & giới hạn
- `npm run gate` phải XANH (typecheck + test + gate-smell). Test cũ nào khẳng định tỷ lệ CŨ thì sửa theo số mới và **ghi rõ trong báo cáo**.
- Được sửa: `src/main.ts`, `src/render/layout.ts`, `src/render/scenes/**`, `src/render/components/**`, `index.html`, `tests/logic/layout.test.ts`, test cũ liên quan layout. **CẤM** `src/logic/**`, `specs/**`, `harness/**`. KHÔNG commit/push. **CẤM mở browser/Playwright/`vite preview`** (Hermes sẽ tự chụp browser để nghiệm thu).


## V6 — 5 LỖI NHÌN THẤY TRONG ẢNH CHỤP THẬT (bắt buộc sửa luôn, đây là lỗi của bản hiện tại)
1. **Nhãn 1-2-3-4 TRÔI RA NGOÀI card**, nằm chồng lên viền/khe giữa 2 card ⇒ đưa nhãn vào **góc trong** mỗi card (padding ≥ 12), không đè viền.
2. **Chấm lỗ mực nằm TRÊN VIỀN card** (vẽ tràn ra mép) ⇒ chấm phải nằm trong vùng an toàn của card (padding ≥ 12 mọi phía).
3. **Chữ "Hint" nằm NGOÀI/nằm dưới hộp nút** ⇒ nhãn phải nằm TRONG nút, canh giữa, không tràn.
4. **Đáy tờ giấy ĐÂM vào hàng ô đáp án** (khoảng cách ≈ 0) ⇒ khe giữa tờ giấy và hàng ô đầu ≥ **24**; `sheet` bottom (170+480=650) so với `options` top 700 ⇒ khe 50 ⇒ phải kiểm và giữ ≥24 sau khi áp số mới.
5. **Số tiền tệ ("0") nằm đè vòng sao thứ 3 của cụm HUD** ⇒ hũ Mực và cụm sao **không được chồng** (đã có ở V3.2) và số phải nằm trong hộp `ink` (560,88,144,64).
Thêm 2 test nữa vào `layout.test.ts`: (a) nhãn/chấm phải nằm trong card với padding ≥12 (nếu logic vẽ dùng chung một hàm `innerRect(box, 12)` thì test hàm đó); (b) khe dọc giữa `sheet` và `options[0..1]` ≥ 24, khe ngang giữa 2 card ≥ 16.

## BÁO CÁO (ngắn, có bằng chứng)
1. diff `main.ts` + `layout.ts` (file:dòng) · 2. output `npx vitest run tests/logic/layout.test.ts` · 3. output `npm run gate` · 4. danh sách test cũ đã sửa số + lý do · 5. việc không làm được.
