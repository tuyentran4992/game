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

---

> **PHẢN HỒI TỪ ANH Tuyền test thật trên máy (2026-08-22) — thêm 2 đợt mới:**

### ĐỢT 5 — HƯỚNG MẶT NHÂN VẬT (F5, 🔴)
- **F5. Mèo đang nhìn NGƯỢC hướng khi chơi.** Xác định: ong bay tới mèo từ **bên phải** (spawn phải → bay qua trái). Yêu cầu: mèo phải **quay mặt về phía ong (bên phải)**. Kiểm tra GameplayScene — flip ngang sprite mèo (sceneScaleX ±) sao cho mặt mèo hướng về phía ong đang bay tới. (Ở StartScene mặt mèo nhìn về người xem/nút — giữ hợp lý.) Xác định hướng spawn ong trong code trước khi flip (đừng đoán).
  - ✅ ĐÃ SỬA (2026-08-22, DEV): `Gameplay.ts` — ong spawn tại `x = width + 60` (bên phải) và dịch `x -= speed*dt` (bay trái) → mèo phải quay mặt phải. Phân tích sprite `cat_idle.png` (360×305): khối lượng vùng đầu/râu nằm cột 28–177 (nửa trái) → sprite mặc định quay TRÁI. Thêm `this.cat.setFlipX(true)` để mèo quay mặt phải về phía ong. StartScene giữ nguyên (theo spec). Đồng thời đảo dấu rotate trong tween đổi lane (`-(next-prev)*0.26`) để hướng nghiêng -15°/+15° (§5.3) vẫn đúng sau khi lật flipX.

### ĐỢT 6 — MÀN GAME OVER CSS XẤU (F6-F7, 🔴 — anh đánh giá từ ảnh thật)
- **F6. "Tiếp tục (xem ad)" bị CẮT CỤT chữ** (chân chữ T/p/t đè lên mép dưới khung). Sửa panel GameOver: tăng chiều cao + padding đủ chứa title + 2 nut mà KHÔNG có chữ đè viền/dính mép.
  - ✅ ĐÃ SỬA (2026-08-22, DEV): `GameOver.ts` — viết lại bố cục panel trong 1 container, nội dung xếp theo con trỏ y với padding `sp[8]` (32px) mỗi cạnh; nút "Tiếp tục" đặt dưới nút "Chơi lại" cách `sp[4]` (16px), đủ khoảng đệm đáy → chữ không còn đè viền. Ghost button dùng `type.h2` (28px) + width 320 để "Tiếp tục (xem ad)" vừa width không tràn.
- **F7. Làm màn Game Over chuẩn DESIGN-SPEC** để đẹp hơn:
  - Panel theo §3.3: radius `radius.lg` (32), fill `color.surface`, border `color.primary` 4px, padding `space-6` (32), shadow `shadow.panel`, xuất hiện slide-up `dur.slow`.
  - Nút "Chơi lại" = `btn-primary` chuẩn §3.1: fill `color.primary` + viền dưới `color.primary.dark` 6px, text `type.display` trắng, shadow `shadow.btn` (nút hiện tại nếu đúng rồi thì giữ).
  - "Tiếp tục (xem ad)" = `btn-ghost` RÕ RÀNG (§3.1): nền `color.surface` + viền `color.primary` 4px + chữ `color.text.primary`, cao ~56-60px, căn giữa dưới nút Chơi lại, đủ padding, KHÔNG phải chữ trần chìm.
  - Title "GAME OVER": font `type.h1`, màu cân đối (không chói — dùng `color.danger` hoặc `color.text.primary` có bóng nhẹ hợp nền).
  - Giữ data-testid `retry-btn`, `continue-btn`, `final-score`, `best-score`.
  - Nếu nền 2 mảng màu phẳng nhìn sơ sài: thêm chút chi tiết rẻ tiền (vd vạch lane đứt như §2.3, vài bụi cỏ/chấm trang trí) không phức tạp hóa.

---

> **PHẢN HỒI MỚI TỪ ANH Tuyền (2026-08-22) — Đợt 7-8:**

### ĐỢT 7 — BỎ GẠCH CHÂN NÚT (F8, 🔴)
- **F8. Nút "Tiếp tục (xem ad)" bị GẠCH CHÂN (gạch đít) dưới chữ** (đường gạch cam cong). Anh không thích. Bỏ hẳn underline/gạch chân ở MỌI nút (btn-primary, btn-ghost). Kiểm tra `drawButton`/`drawPanel` trong ui.ts — đừng vẽ underline dưới text nút.

### ĐỢT 8 — GẮN ÂM THANH THẬT (F9, 🔴 — anh báo "chưa có âm thanh")
- **F9. Hiện game CÂM (audio placeholder đã bỏ).** Đã sinh file mp3 THẬT trong `game/public/raw/` + `assets/raw/`: `sfx_dodge.mp3, sfx_score.mp3, sfx_combo.mp3, sfx_hit.mp3, sfx_levelup.mp3, sfx_click.mp3, sfx_gameover.mp3, bgm_main.mp3`. Yêu cầu:
  - Trong `main.ts` BootScene.preload: **bỏ comment 2 dòng** `this.load.audio('bgm_main', 'bgm_main.mp3')` + `this.load.audio('sfx_dodge', 'sfx_dodge.mp3')`, VÀ thêm load các sfx còn lại (`sfx_score`, `sfx_combo`, `sfx_hit`, `sfx_levelup`, `sfx_click`, `sfx_gameover`). baseURL `'./raw/'` đã đúng.
  - Wire `this.sound.play(...)` đúng sự kiện (volume nhỏ, ~0.3-0.4):
    - né ong thành công → `sfx_dodge`
    - được điểm (+1) → `sfx_score` (mỗi lần né)
    - combo +5 → `sfx_combo`
    - chạm ong / va chạm → `sfx_hit`
    - level up (đổi cảnh) → `sfx_levelup`
    - bấm nút (Start/Chơi lại/Tiếp tục/ghost) → `sfx_click`
    - hiện màn game over → `sfx_gameover`
  - **BGM**: phát `bgm_main` loop (setLoop true) khi vào Gameplay (hoặc Start) — dừng/silence ở game over; tôn trọng mute (sdk.isAudioEnabled / sdk onAudioEnabledChange đã có).
  - Đảm bảo KHÔNG còn `EncodingError` (mp3 thật decode được). Boot không vì audio mà fail.
- Điều kiện xong: `npm test` pass, `npm run build` OK, `npx tsc --noEmit` không lỗi mới.
  - ✅ ĐÃ SỬA (2026-08-22, DEV): `GameOver.ts` + `ui.ts` — panel vẽ bằng token (`color.surface`, `color.primary` 4px, `shadow.panel`, `radius.lg`); slide-up 48px → 0 với `dur.slow` + `cubic.out`. Title `type.h1` `color.danger` + `setShadow` bóng nhẹ (`color.shadow`). Nút "Chơi lại" = `drawButton` (btn-primary, đã đúng §3.1). Nút "Tiếp tục" = `drawButton` variant `ghost` (surface + viền primary 4px + chữ `color.textPrimary`), `textType: type.h2`, width 320. Giữ data-testid retry-btn/continue-btn/final-score/best-score. Thêm `drawDecor`: bụi cỏ tam giác dọc mép cỏ + vạch lane đứt (§2.3) làm chi tiết nền. `drawButton` mở rộng nhận `textType` (mặc định `type.display`), không break caller cũ.