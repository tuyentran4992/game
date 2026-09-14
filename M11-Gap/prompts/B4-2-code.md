Bạn là dev Phaser 3 + TypeScript. Batch **B4 — ART & JUICE**: ghép asset ĐÃ SINH SẴN vào game và thêm hiệu ứng/âm thanh. Gói ngữ cảnh B4 nằm trong system prompt — đọc kỹ, KHÔNG tự vẽ asset, KHÔNG đọc lan man.

## Việc
1. **Theme registry (pure)**: `src/render/theme/paperTheme.ts` — `Record<skinId, {assetKey, tint}>` cho **8 skin** + map `albumId` (14) + `badgeId` (6), dữ liệu lấy từ `assets/manifest.json`. **Không import Phaser** trong file này (phải test được bằng vitest node).
2. **Nạp asset**: preload trong BootScene theo **manifest** (sinh danh sách từ `manifest.json` bằng script, KHÔNG gõ tay từng dòng lệch được) + `sfx-manifest.json` cho âm thanh. Thiếu file ⇒ báo lỗi rõ (cấm fallback im lặng).
3. **Âm thanh**: module `src/render/audio/sfx.ts` — phát SFX theo BẢNG map (hành động → tên file): gấp `fold`, mở lớp `unfold`, đục lỗ `punch`, đúng `correct`, sai `wrong`, sao `star`, bấm `click`, đếm/mua `counter`. Có công tắc tắt tiếng + unlock theo gesture + dừng khi mất focus (PC-17).
4. **Juice** (đúng số trong gói): mở bung từng lớp 140ms/so le 110ms; pop ô đáp án 250ms/so le 60ms; giải thích ≥700ms; rung nhẹ khi sai; particle vàng `#F5B301` khi nhận sao; tờ giấy "thở" 1,2s yoyo khi idle ≥5s ở Title. Mọi rung/particle dùng **RNG có seed**.
5. **Áp theme**: màn chơi dùng skin đang equip (từ save), Shop hiển thị 8 preview theo theme, Album 14 mẫu (chưa mở = silhouette xám), huy hiệu 6.
6. **Đo**: sau khi build, in danh sách asset thực tế trong `dist/` + tổng KB (cấm thêm asset ngoài danh sách).

## PHẠM VI FILE (chỉ trong M11-Gap)
- Được tạo/sửa: `game/src/render/**`, `game/src/main.ts`, `game/index.html` (nếu cần preload), `game/scripts/gen-asset-list.mjs` (sinh danh sách từ manifest), `game/package.json` (CHỈ thêm 1 script nếu cần).
- Được phép thêm **test** vào `game/tests/render/**` (theme registry, map SFX) và nếu cần mở rộng `test:logic` cho `tests/render` thì sửa ĐÚNG dòng đó trong `package.json`.
- KHÔNG sửa: `src/logic/**` (trừ khi có lỗi chặn — nếu vậy BÁO, đừng tự sửa), `specs/**`, `scripts/gen_assets_m11.py`, `scripts/gen_sfx_m11.py`.

## RÀNG BUỘC
- KHÔNG gọi mạng, KHÔNG thêm thư viện mới (chỉ dùng Phaser đã có).
- Chạy `npm run gate` và `npm run build:standalone` **mỗi thứ 1 lần ở cuối**, dán output thật.
- Sắp hết lượt ⇒ (1) typecheck xanh → (2) test xanh → (3) build chạy được → (4) báo cáo.

BÁO CÁO: file:dòng từng việc 1-6 · bảng map SFX · output gate + build · số asset + tổng KB trong dist · việc không làm được.
