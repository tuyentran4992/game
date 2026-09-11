# PROMPT — M10 Banh Mi Master MVP (chạy 1 mạch, spec-driven §PB-2b)
> ⚠️ ĐIỀU KIỆN TIÊN QUYẾT (luật boss 08/09): **chạy prompt này CHỈ SAU KHI supervisor (Hermes) đã gen xong 30 asset production bằng WAN 2.7** + `assets/manifest.json` đủ sha256 (DESIGN-SPEC §3). Coding agent CẤM tự vẽ art.
> Cách dùng (model chốt 09/09 boss: **qwen3.8-flash**): `cd /data/youtube-playables/M10-BanhMi-Master && source /data/scripts/claude-code-env.sh && ANTHROPIC_MODEL="qwen3.8-flash" claude -p "$(cat specs/1-banh-mi-master/PROMPT.md)" --max-turns 200 --output-format json`
> Luật boss 09/09: **TEST BẰNG CODE THÔI (vitest + sim harness), KHÔNG browser test. TDD bắt buộc (RED trước GREEN sau). Anti god class (TB-05).**

---

Bạn là chuyên gia Phaser 3 + TypeScript game dev. Xây MVP game **"Banh Mi Master"** hoàn chỉnh trong `/data/youtube-playables/M10-BanhMi-Master/game/` theo 4 file spec đã chốt — TÔN TRỌNG TUYỆT ĐỐI, không tự ý đổi số:

- `specs/1-banh-mi-master/SPEC.md` — luật chơi, flash-order memory, win/lose, vòng lặp, bảng biến đổi trong ca
- `specs/1-banh-mi-master/DESIGN-SPEC.md` — layout 720×1280, danh mục 33 assets production (ĐÃ gen sẵn, chỉ tích hợp), data-testid, juice
- `specs/1-banh-mi-master/DATA-MODEL.md` — MỌI con số (12 nguyên liệu, 8 khách, order generator, scoring, patience, WAIT!, rank)
- `specs/1-banh-mi-master/TEST-CASES.md` — GC-01..14, TB-01..06, sim harness C (2 bot)

## KIẾN TRÚC CHỐNG GOD CLASS (gate TB-05, đo bằng `wc -l`, vi phạm = chưa xong)
- **Không file .ts nào > 300 dòng; file scene > 250 dòng.** Phình là tách module NGAY.
- Rules thuần: `src/core/rules.ts` (matchScore, thang sao, tip/combo/FAST, rank, WAIT! logic) + `src/core/rng.ts` (mulberry32) + `src/data/*.ts` (ingredients, customers, shift constants) — PURE TS, 0 import Phaser.
- Mỗi hệ 1 file: `src/systems/order.ts` (flash timer + ghost bubble), `src/systems/patience.ts`, `src/systems/scoring.ts` (reveal animation data), `src/systems/customer.ts` (vào/ra/wait), `src/systems/hint.ts`.
- CẤM class `GameManager` ôm hết: `scenes/GameScene.ts` mỏng chỉ nối input + render + gọi system, không chứa công thức luật.

## Trình tự bắt buộc (mỗi bước verify bằng SỐ thật, in ra, trước khi bước sau)
1. Scaffold Vite+Phaser3+TS strict (`game/` standalone, pnpm, port 5210, tsconfig riêng). `tsc --noEmit` = 0.
2. **TDD RED→GREEN BẮT BUỘC (lệnh boss 09/09):** viết vitest GC-01..GC-14 TRƯỚC khi viết code — chạy `pnpm vitest run` DÁN output **FAIL (RED) thật** vào log, rồi mới viết `src/data/` + `src/core/` đến khi GREEN 14/14. Test-only-code: KHÔNG browser, KHÔNG headless Chrome, KHÔNG playwright ở bất kỳ bước nào.
3. **KHÔNG tự vẽ art.** Assets production đã gen sẵn: `game/public/assets/*.png` + `M10-BanhMi-Master/assets/manifest.json` (37 file, sha/bytes theo DESIGN-SPEC §3). Chạy script ngắn so sha manifest với file thật; thiếu file nào BÁO trong báo cáo cuối, không chế asset thay thế. Nối sprite bằng loader PNG từng file (không cần texture packer).
4. Scene Phaser: bg, khách walk-in 8 persona, bong bóng order + flash timer vòng tròn, ghost bubble, stack zone + layer snap/squash, khay 4×3, patience arc 3 màu + nhấp nháy <30%, HUD tips/stars/strikes, scoring cross-section reveal (✅/❌ từng layer 500ms), WAIT! event khách #7, hint replay 1.5s, combo/FAST popup, screen shake + vignette strike, interstitial mock sau khách #4, win/lose overlay + rank, rewarded continue 1 lần/ca. UI chrome (bong bóng, nút, HUD, overlay, arc) vẽ PROGRAMMATIC bằng Graphics theo design-system — chỉ sprite/nền/icon mới là asset (DESIGN-SPEC §3). Input TAP-ONLY đúng SPEC §3 (không drag). UI tiếng Anh. Mobile-first 720×1280 Scale.FIT + pause/mute obey (visibilitychange tại document — án lệ M8 C-24). Logic scene PHẢI gọi thẳng vào `core/rules.ts` + systems (không nhân bản công thức trong scene).
5. Sim harness `scripts/sim.ts` 40 seed 2 bot (TEST-CASES §C) — chạy `pnpm sim`, in bảng số. Không đạt ngưỡng → chỉnh ±20% số DATA-MODEL (ghi rõ trước→sau) sim lại tới khi đạt.
6. Bridge stub theo `@game/sdk` pattern M3 (sendScore=tips, saveData `banhmi.best`) + `playgama-bridge-config.json` copy cấu trúc M8 final. `pnpm build` = TB-02. Chạy một lượt cuối `pnpm tsc --noEmit && pnpm vitest run && pnpm sim && pnpm build`, dán output.

## CẤM
- Không Math.random trong `src/core`/`src/data` (TB-04). Không đổi number spec mà không ghi chú trước→sau. Không commit/push git. Không tạo file ngoài `M10-BanhMi-Master/`. Không mạng ngoài (không npm package mới — deps đã có ở workspace node_modules gốc; cần thì copy M3 game/package.json).
- **Không browser test / playwright / headless Chrome / puppeteer ở bất kỳ bước nào (lệnh boss 09/09)** — mọi verify bằng vitest + sim + tsc + build.
- Không cắt ngắn art: thiếu 1 asset DESIGN-SPEC §3 = chưa xong (BÁO, không thay thế).
- Không thêm meta progression/shop/chapter (luật boss — OUT SCOPE SPEC §10).

## BÁO CÁO CUỐI (bắt buộc, bằng số)
- TDD evidence: dán output vitest **RED lần đầu** (fail count) + **GREEN cuối**: X passed / 14 GC
- sim 40 seed: bảng 2 bot (win rate, median shift s, median stars /24, median tips, strikes median) + các lần chỉnh số (trước→sau)
- build: size dist, tổng assets size, manifest khớp 37/37?
- `wc -l` top 5 file (gate TB-05 — file dài nhất ≤300, scene ≤250)
- Danh sách file tạo ra + cách chạy dev (port 5210)
