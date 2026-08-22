# QA-FIXES — M1 Game "Cứu Mèo" (đợt hiển thị/âm thanh)

> File này do PM (Hermes) QA bằng **browser thật + vision** ghi lại. DEV (Claude) đọc và sửa. Đúng vai: Hermes=QA, bạn=Dev.
> Nguồn: SPEC.md, DESIGN-SPEC.md, docs/DESIGN-SYSTEM.md. Màu/nhịp dùng token (color.primary, dur.*...).

## RÀNG BUỘC CỨNG
- Đọc SPEC.md + DESIGN-SPEC.md + docs/DESIGN-SYSTEM.md trước khi sửa.
- KHÔNG đổi cơ chế gameplay (score, difficulty, combo, level, best record, Playables SDK).
- KHÔNG commit/push. KHÔNG gọi mạng ngoài (Playables cấm).
- Chạy `npm test` + `npm run build` trong `game/` pass rồi mới báo xong.
- Trả lời tiếng Việt, báo kết quả bằng SỐ LIỆU (test pass, build OK, bundle size).

## CÁC FIX (làm từng đợt, không gộp)

### ĐỢT 1 — MÀN START (mức 🔴)
- **F1. Nút "Chơi" render màu ĐEN** (browser thấy black rounded button, text trắng). Theo DESIGN-SPEC §3.1 `btn-primary`: fill phải `color.primary` cam `#FF9F1C` + viền dưới `color.primary.dark` `#E8820F` 6px + text `type.display` trắng. Tìm nơi create nút (StartScene/ui) đang set màu sai (nghi đang dùng màu tối/mặc định) → sửa đúng token. Verify: vision thấy nút cam.
- **F2. Đáy màn Start TRỐNG/đen (thiếu cỏ xanh).** Theo DESIGN-SPEC §4.1: khung dưới có dải cỏ `color` `#5ED07A` (~38% đáy) + vạch lane. Kiểm tra drawBackground/grass ở StartScene — đang chỉ vẽ sky gradient, không vẽ cỏ. Bổ sung vẽ cỏ xanh đáy + nếu có vạch lane.

### ĐỢT 2 — ÂM THANH PLACEHOLDER (mức 🟡, audio lỗi nhưng không chặn chạy)
- **F3. `bgm_main.mp3` + `sfx_dodge.mp3` trong dist/raw chỉ 417B (file không phải mp3 hợp lệ)** → Phaser `EncodingError: Unable to decode audio data` reject ở boot. Chưa có asset thật. Yêu cầu: **bỏ preload 2 audio này** (hoặc tắt audio chạy mặc định/chưa phát đến khi có asset thật) để boot KHÔNG còn EncodingError. Ghi rõ chỗ cần bật lại khi có audio thật. (Audio thật sẽ gắn ở bước asset sau.)

### ĐỢT 3 — TYPE CHECK SẠCH (mức 🟢, không block build — esbuild)
- **F4. `tsconfig.json`** bổ sung compilerOptions: `"target":"ES2020","lib":["ES2020","DOM"],"esModuleInterop":true` để hết TS errors: `esModuleInterop`, `Promise in ES5`, `Property 'scale'/'add'/'cameras'/'input'/'tweens'/'sound'/'time' does not exist on type 'GameplayScene'` (nguyên nhân nghi: scene không extends `Phaser.Scene` đúng type hoặc mất lib). Kiểm tra `class GameplayScene extends Phaser.Scene` đúng; nếu thiếu khai báo type → sửa.
- KHÔNG bắt buộc mọi error về 0 nếu swibage sai, nhưng các error `Property ... does not exist on type` phải hết.

### ĐỢT 4 — SPRITE MỚI (verify, 🟢)
- **V1. Kiểm tra** mèo (`cat_idle.png` 360px) và ong (`bee_wasp.png` 192px) giờ đã có trong `game/public/raw/` (vite copy → dist/raw) — không cần sửa gì trừ khi sprite hiển thị méo/oversize trong scene. Chỉ verify + đảm bảo tỉ lệ hiển thị hợp lý (mèo ~200-260px, ong ~80-120px tùy scene).

## TIÊU CHÍ XONG
- F1+F2: mở browser Start → nút "Chơi" MÀU CAM + đáy có cỏ xanh.
- F3: boot không còn `EncodingError` audio.
- F4: `npx tsc --noEmit` hết các lỗi `Property ... does not exist on type` (không yêu cầu 0 tuyệt đối nếu khác nguồn).
- `npm test` + `npm run build` pass.