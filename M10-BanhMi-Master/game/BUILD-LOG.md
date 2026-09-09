# M10 Banh Mi Master — BUILD LOG (bằng chứng từng bước)

## BƯỚC 1 — Scaffold (Vite+Phaser+TS strict, port 5210)
Stack theo package.json M3/M1 đã chứng minh: phaser 4.2.1 (API 3.x-compatible), typescript 5.9.3, vite 5.4.21, vitest 1.6.1 — node_modules link từ workspace (0 mạng ngoài).

```
$ node node_modules/typescript/bin/tsc --noEmit -p tsconfig.scaffold.json   # src only
=== BUOC 1 GATE: tsc src = 0 loi ===
```

## BƯỚC 2 — TDD RED (vitest run TRƯỚC khi viết src/core + src/data)
```
$ node node_modules/vitest/vitest.mjs run --no-file-parallelism
 RUN  v1.6.1 /data/youtube-playables/M10-BanhMi-Master/game
 ❯ tests/gc-match.test.ts  (0 test)
 ❯ tests/gc-rules.test.ts  (0 test)
⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/gc-match.test.ts [ tests/gc-match.test.ts ]
Error: Failed to load url ../src/core/match (resolved id: ../src/core/match) in .../tests/gc-match.test.ts. Does the file exist?
 FAIL  tests/gc-rules.test.ts [ tests/gc-rules.test.ts ]
Error: Failed to load url ../src/core/rules (resolved id: ../src/core/rules) in .../tests/gc-rules.test.ts. Does the file exist?
 Test Files  2 failed (2)
      Tests  no tests
   Duration  1.17s
```
→ RED thật: 100% fail vì core/rules + core/rng + data/* chưa tồn tại.

## BƯỚC 2b — GREEN (sau khi implement) — xem cuối file
## BƯỚC 3 — Asset manifest
## BƯỚC 5 — Sim 40 seed
## BƯỚC 6 — Final gate

## BƯỚC 2b — GREEN
```
$ node node_modules/typescript/bin/tsc --noEmit          # 0 loi
$ node node_modules/vitest/vitest.mjs run --no-file-parallelism
 ✓ tests/gc-match.test.ts  (9 tests) 75ms
 ✓ tests/gc-rules.test.ts  (92 tests) 250ms
 Test Files  2 passed (2)
      Tests  101 passed (101)     # = 14/14 GC (GC-01..GC-14; GC-03/04 × 40 seed)
```

## BƯỚC 3 — Asset manifest (TB-03)
```
$ node scripts/check_assets.mjs
manifest key khop: 37/37
tong bytes khop: 1.869MB | gate TB-03 <4MB: DAT
thieu: khong | lech: khong
```
(sha trong manifest = prefix 12 hex dau cua sha256 day du → doi khop prefix + bytes.)

## GHI CHU TDD
- GC-14 bot hoan hao serve TRUOC nguong WAIT! (+2.5s) cua khach 7 → don van la don cu → 24/24 sao.
- GC-03: khach #1 layers=2 mau thuan cu nhat voi rang buoc (a) "du 3 nhom" → genOrder ep
  ≥1 sauce + ≥1 meat rieng n=2, du 3 nhom khi n≥3 (ghi bao cao — khong doi so spec).

## BƯỚC 5 — SIM 40 SEED (2 bot) + CHỈNH SỐ
Lần 1 (patience gốc, bot quên 2s+4s/mistake): gate "forgetful strikes median ≥1" FAIL (median 0, mean 0.38) — walkout chỉ tới từ <40% (hiếm với p_sai 25%).
Chỉnh ±20% DATA-MODEL §3 (trước→sau): c4 patience 38→31 (−18%), c5 32→26 (−19%), c6 36→29 (−19%), c8 40→32 (−20%). c1 45 / c2 42 / c3 40 / c7 40 GIỮ NGUYÊN (SPEC §6 onboarding rộng 2 khách đầu).
Policy sim (chi tiết hành vi, spec chỉ chốt 25%/layer): bot quên lapse 2.5s/layer + 10s sa lầy mỗi layer nhớ sai → quen = chậm, chịu hết patience VIP.
Kết quả cuối: bảng §C 10/10 PASS (in ở bước 6).

## BƯỚC 6 — FINAL GATE (output thật)
```
$ node node_modules/typescript/bin/tsc --noEmit          → 0 loi (src+tests+scripts)
$ node node_modules/vitest/vitest.mjs run                → Test Files 2 passed | Tests 101 passed (101)  # 14/14 GC
$ node --experimental-strip-types scripts/sim.ts         → exit 0, du 10/10 gate §C (bang day du o BUOC 5)
$ node node_modules/vite/bin/vite.js build               → ✓ built in 10.34s
   dist/index.html 1.47kB · dist/assets JS 1,731.27kB (gzip 396.40kB) · + 37 PNG public
   dist tong: 3.7MB (assets 1.869MB < 4MB gate TB-03 ✓)
   playgama-bridge-config.json da copy vao dist (an lei build script M1/M3)
```
- TB-04: `grep -rn "Math.random" src/core src/data` → 0 kết quả (seed fresh ở context.ts — ngoài core, được phép).
- TB-05: file dài nhất src/scenes/GameScene.ts = 198 ≤250; match.ts 175 ≤300; không GameManager; systems/ = order/patience/scoring/customer/hint 5 module; 30 file src+scripts+tests.
- Lưu ý vite chunk-size warning (1.7MB Phaser) = cosmetic, M1/M3 cùng hiện tượng, build exit 0.

## CODE REVIEW (agent code-reviewer, 09/09) — 1 CRITICAL + 3 MAJOR + 5 MINOR → FIX TẤT CẢ
1. CRITICAL `continueAfterAd` khi LOSE ở khách #8 → beginCustomer(8) crash undefined. Fix: canContinue chặn khi `customerIdx + 1 >= orders.length`.
2. MAJOR events của continueAfterAd bị HudScene bỏ rơi (khách hồi sinh giữ sprite giận). Fix: route qua `GameScene.handle()`.
3. MAJOR ẩn tab lúc WIN/LOSE → scene pause vĩnh viễn. Fix: main.ts resume vô điều kiện khi tab hiện lại.
4. MAJOR patience tune thiếu ghi chú. Fix: header customers.ts ghi trước→sau + trỏ BUILD-LOG.
5. MINOR applyWaitChange phá ràng buộc §4a/§2 (mất nhóm, tràn 3 sốt) — 285/500 seed vi phạm → test RED (thêm assertion GC-13-rules) → fix rules.ts (giữ nhóm cuối + cap 2 sốt) → GREEN.
6. MINOR FAST/served tính cả serve 0 sao → sửa: chỉ khi stars>0.
7. MINOR bubble.show() rebuild mỗi frame (ring blink không hoạt động) → cache theo signature, timer redraw nhẹ.
8. MINOR comboMult bị nhân bản trong GameScene → gọi rules.comboMult.
9. MINOR dead code (widgets.pop, board.liftLid/stackTopY, flyAwayAsGhost) → xóa.

## FINAL RE-VERIFY (sau fix review)
```
tsc --noEmit                    → 0 lỗi
vitest run                      → 101/101 pass (14/14 GC, GC-13 thêm constraint WAIT!)
node --experimental-strip-types scripts/sim.ts → 10/10 gate §C (bảng dưới)
vite build                      → ✓ built in 9.38s (+ copy playgama-bridge-config.json → dist)
wc -l top: GameScene 203 · match 182 · HudScene 142 · sim 140 · bubble 122 → mọi file ≤300, scene ≤250 ✓
dev server: vite --port 5210 → HTTP 200 index.html + /src/main.ts + /assets/cust_1.png (curl smoke, không browser)
```
Bảng sim cuối (lặp lại để chốt số):
```
win rate          | 40/40 (100%) | 31/40 (78%)
median shift (s)  | 82           | 231
median stars /24  | 24           | 14
median tips       | 458          | 188 (−59%)
patience-util max | 0.5%         | 98.6%
strikes median    | 0            | 2
rank dist         | S:40         | S:3 A:9 B:28
```

