# PROMPT — M9 Deep Cast MVP (chạy 1 mạch, spec-driven)
> Cách dùng (như M3): `cd /data/youtube-playables/M9-DeepCast && source /data/scripts/claude-code-env.sh && ANTHROPIC_MODEL="zai-org/glm-5.3-flash" claude -p "$(cat specs/1-deep-cast/PROMPT.md)" --max-turns 200 --output-format json` (model chốt: **glm-5.3-flash** qua AI-Box, lệnh boss 08/09).

---

Bạn là chuyên gia Phaser 3 + TypeScript game dev. Xây MVP game **"Deep Cast"** hoàn chỉnh trong `/data/youtube-playables/M9-DeepCast/game/` theo 4 file spec đã chốt — TÔN TRỌNG TUYỆT ĐỐI, không tự ý đổi số:

- `specs/1-deep-cast/SPEC.md` — luật chơi, win/lose, vòng lặp
- `specs/1-deep-cast/DESIGN-SPEC.md` — art production (SVG→PNG atlas, không prototype xấu)
- `specs/1-deep-cast/DATA-MODEL.md` — MỌI con số (cá, tension, air, fuel, pickups)
- `specs/1-deep-cast/TEST-CASES.md` — GC-01..16, TB-01..04, sim harness C

## Trình tự bắt buộc (mỗi bước verify bằng SỐ thật, in ra, trước khi bước sau)
1. Scaffold Vite+Phaser3+TS strict (`game/` standalone, pnpm, port 5199, tsconfig riêng). `tsc --noEmit` = 0.
2. `src/data/` + `src/core/` (rules.ts, rng.ts PURE TS — không import Phaser ở đây). Viết vitest GC-01..GC-12 TRƯỚC cho core (TDD), chạy `pnpm vitest run` → pass hết.
3. **KHÔNG tự vẽ art.** Assets production đã gen sẵn bởi supervisor: `M9-DeepCast/game/public/assets/*.png` + danh mục sha256/size trong `M9-DeepCast/assets/manifest.json` (theo DESIGN-SPEC §3). Kiểm tra manifest khớp file thật (script ngắn so sha), thiếu file nào BÁO trong báo cáo cuối, không tự chế asset thay thế. Nối sprite vào scene (atlas tay bằng loader PNG từng file là đủ, không cần texture packer).
4. Scene Phaser: ocean parallax, boat, hook/line, fish AI swim, HUD, pickups, sonar, shark patrol, whale + WHALE_TOSS, win/lose overlays, onboarding hints. Input: hold/release/hold-while-reeling đúng §3 SPEC.
5. GC-13..GC-16 + `scripts/sim.ts` harness 40 seed (TEST-CASES §C) — chạy, in bảng số. Không đạt ngưỡng → chỉnh ±20% số DATA-MODEL (ghi rõ trước/sau) sim lại tới khi đạt.
6. Bridge Playgama stub + `playgama-bridge-config.json` copy M3. `pnpm build` = TB-02. Chạy `pnpm tsc --noEmit && pnpm vitest run && pnpm sim && pnpm build` một lượt cuối, dán output.

## CẤM
- Không Math.random trong core (TB-04). Không đổi number spec mà không ghi chú. Không commit/push git. Không tạo file ngoài `M9-DeepCast/`. Không mạng (không npm package mới ngoài deps đã có trong repo — Phaser, vite, vitest, typescript đã có ở node_modules gốc workspace; nếu cần copy từ M3 game/package.json).
- Không cắt ngắn art: thiếu 1 asset DESIGN-SPEC §3 = chưa xong.

## BÁO CÁO CUỐI (bắt buộc, bằng số)
- vitest: X passed / 16 GC
- sim 40 seed: win rate %, median dive s, survival 30–60s %, median breaks, median tiền touch-voi + các lần chỉnh số (trước→sau)
- build: size dist, atlas size
- Danh sách file tạo ra + cách chạy dev.
