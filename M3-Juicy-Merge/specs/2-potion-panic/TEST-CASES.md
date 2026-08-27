# M3v2 "Potion Panic" — TEST CASES (DEV chạy TRƯỚC khi bàn giao)

> **Loại file:** Test-case mô tả cho DEV (bảng Steps/Expected) — KHÔNG phải code test.
> **📍 DEV chạy file này TRƯỚC khi bàn giao/deploy.** Nguồn sự thật: `SPEC.md` (PP-01..19) + `DATA-MODEL.md`.
> **Chuẩn:** NON-Laravel. Pipeline = `pytest` (Python); game logic thuần = `vitest` (⚠ chạy từng file test riêng lẻ — vitest có thể hang trên môi trường này); UI = browser manual (Playwright+vision thuộc E2E-TESTS.md của Hermes QA sau deploy).
> **Regression:** toàn bộ test cũ v1 còn giữ (`merge-engine`, `settle`, `rng`, `save`, `stages`, `obstacles`, `powerups`) phải PASS SAU migration — test nào đổi hành vi theo SPEC v2 thì cập nhật expectation, KHÔNG xóa ca.

## 0. CÁCH CHẠY

| Đối tượng | Lệnh |
|---|---|
| Logic game | `cd game && npx vitest run src/logic/__tests__/<file>.test.ts` (từng file) |
| Typecheck | `pnpm typecheck` (0 lỗi) |
| Build | `pnpm build` + `pnpm build:playgama` |
| Pipeline | `python -m pipeline validate --game-dir games/potion-panic` |
| Gate đầy đủ | `bash ../../../../scripts/verify_game.sh M3-Juicy-Merge` |
| Anti-clone grep | `grep -riE "cherry|watermelon|suika|juicy" game/dist/` → RỖNG |

---

## B. GAME LOGIC (ID `GL2-<n>` — vitest, thuần, không Phaser)

### B.1 Element graph & merge (PP-02/09)
| ID | Steps | Expected |
|---|---|---|
| GL2-01 | `canMerge(fire2,fire2)` | true → sinh fire3 tại midpoint |
| GL2-02 | `canMerge(fire2,water2)` | false (khác nhánh không bao giờ merge) |
| GL2-03 | `canMerge(fire4,fire4)` | false (T4 trần) |
| GL2-04 | Merge chuỗi fire1→fire4 qua các bước hợp lệ | đúng 3 merge, điểm 6/16/40 theo bảng §4.5 |
| GL2-05 | Đặt fire4+water4+earth4 settle |Stone fusion trigger 1 lần; điểm +150; count stone=1 |
| GL2-06 | Fusion lần 2 cùng màn | không trigger (once/PP-09) |
| GL2-07 | Fusion khi còn goal target_orb T4 chưa đủ | Stone không phá goal (loại trừ đúng) |

### B.2 Queue & RNG (PP-01/04)
| ID | Steps | Expected |
|---|---|---|
| GL2-10 | Cùng seed → 2 lần replay 60 drop | dãy queue 3-element giống hệt (deterministic) |
| GL2-11 | Đếm phân bố element 10k drop | mỗi nhánh trong 25–42% (fair, không khóa nhánh) |
| GL2-12 | Thả liên tiếp <250ms | drop thứ 2 bị từ chối |

### B.3 Heat & Brew (PP-10..12)
| ID | Steps | Expected |
|---|---|---|
| GL2-20 | Tick T3 10s | heat=30; T1 không tăng heat bao giờ |
| GL2-21 | T4 zone3 tick 10s | heat=90 (6×1.5) |
| GL2-22 | Heat 99→100 khi đang settle | đúng 1 BrewEvent, orb biến mất, +20 |
| GL2-23 | Brew cạnh T3 heat 80 trong 140px | heat T3→105 → brew wave kế tiếp (chain), tối đa 1 nổ/frame |
| GL2-24 | Merge 2 orb heat 75+75 | điểm ×1.5, orb mới heat=0 |
| GL2-25 | Merge 2 orb heat 60+80 | KHÔNG volatile (cả hai ≥70 mới tính) |
| GL2-26 | Brew bán kính có ice+crate+h bubble | ice tan, crate −1hp, bubble vỡ (reuse obstacle fns) |
| GL2-27 | Stir orb heat 90, charge=3 | heat còn 30, charge=2, không tốn drop |
| GL2-28 | Stir charge=0 | từ chối, không đổi heat |
| GL2-29 | Regen 31s với charge=2 | charge=3; charge=3 thì giữ 3 (cap) |
| GL2-30 | Stir khi pause | không regen, không dùng được |

### B.4 Orders & Stage (PP-14, DATA-MODEL §4)
| ID | Steps | Expected |
|---|---|---|
| GL2-35 | Stage có order [fire2]; fire2 settle | order fulfilled, orb thu hoạch, +30, drop goal vẫn đúng |
| GL2-36 | fire3 tồn tại, order cần fire2 | KHÔNG fulfill sai bậc |
| GL2-37 | Stone fusion với order chưa fulfill | Stone serve 1 order bất kỳ |
| GL2-38 | Hết maxDrops, goal chưa xong | StageFailed + lý do |
| GL2-39 | Complete sao: 1★ đủ goal; 2★ dư ≥20% drops; 3★ ≥40% | đúng như cũ v1 (regression) |
| GL2-40 | 30 stage config validate | mỗi stage: goals không rỗng, starScores tăng dần, rewardPowerup hợp lệ, element unlock nhất quán (earth chưa unlock ở zone1 không xuất hiện goal) |

### B.5 Danger / game over (PP-03 — regression + ca mới)
| ID | Steps | Expected |
|---|---|---|
| GL2-45 | Orb tâm trên miệng + settling=false | game over |
| GL2-46 | Orb đang rơi ngang miệng | KHÔNG game over |
| GL2-47 | Brew làm văng orb qua miệng rồi rơi lại trước settle | không oan (chỉ tính tại thời điểm settle) |

### B.6 Save & Migration (PP-07/19)
| ID | Steps | Expected |
|---|---|---|
| GL2-50 | Load payload v2 thật (fixture từ code hiện hành) | ra v3 đúng mapping §6, không loss sao/unlock/best/powerups |
| GL2-51 | Payload v3 corrupt | fresh defaults, không throw |
| GL2-52 | Save v3 → load lại | idempotent |
| GL2-53 | SDK saveData throw | log + mặc định, phiên chơi tiếp (PP-07) |
| GL2-54 | Kích thước payload v3 worst-case (album 12 + 30 stages) | < 3MB MUST / target <500KB |

### B.7 Platform (grep/static, chạy bằng script)
| ID | Expected |
|---|---|
| GL2-60 | 0 external URL trong `game/src` (chỉ SDK bridge) |
| GL2-61 | Pause handler + minimize-mute tồn tại và wire (PP-15) |
| GL2-62 | `grep -riE "cherry|watermelon|suika|juicy|trái cây" game/dist/` = rỗng (PP-17) |
| GL2-63 | UI strings trong dist: 100% ASCII-EN (pitfall tiếng Việt sót) |
| GL2-64 | Bundle: initial <5MB target, file lẻ JS <512KB warn / <30MB MUST, total <250MB |

## C. COVERAGE MATRIX (BR × TC)

| BR | TC |
|---|---|
| PP-01 | GL2-12, GL2-27(không tốn drop), E2E-f |
| PP-02 | GL2-01..04 |
| PP-03 | GL2-45..47 |
| PP-04 | GL2-10,11 |
| PP-05..07 | regression v1 (continue/interstitial/save) + GL2-50..54 |
| PP-08 | GL2-60, E2E-c |
| PP-09 | GL2-05..07, GL2-37 |
| PP-10 | GL2-20,21 |
| PP-11 | GL2-22,23,26 |
| PP-12 | GL2-24,25 |
| PP-13 | GL2-27..30 |
| PP-14 | GL2-35..37 |
| PP-15 | GL2-61, E2E-c |
| PP-16 | GL2-64 |
| PP-17/18 | GL2-62,63 + form nộp §SPEC-9 |
| PP-19 | GL2-50..52 |

## D. TIÊU CHÍ PASS TRƯỚC KHI BÀN GIAO
- [ ] Toàn bộ GL2 trên + regression v1 PASS (vitest từng file).
- [ ] `pnpm typecheck` 0 lỗi · `pnpm build` + `build:playgama` OK.
- [ ] GL2-60..64 (static gates) PASS.
- [ ] verify_game.sh exit 0.
- KHÔNG bàn giao khi còn ❌; không xóa ca fail — báo Hermes.
