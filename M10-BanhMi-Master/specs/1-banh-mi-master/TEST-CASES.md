# M10 Banh Mi Master — TEST-CASES (verify bằng SỐ, chạy trước khi trình boss)
> Logic game là pure TS (`core/rules.ts`, `core/rng.ts`, `data/*`) → vitest không cần DOM/Phaser. Mọi GC dưới đây PASS/FAIL bằng con số in ra stdout.
> (Tương đương "PHPUNIT-TESTS" của chuẩn 5 file — repo game quy ước TEST-CASES theo M3v2/M9.)

## A. VITEST — `cd game && pnpm vitest run` (unit deterministic)
| # | Tên | Input | Kỳ vọng |
|---|---|---|---|
| GC-01 | rng cùng seed cùng chuỗi | seed=42 gen ca 2 lần | mảng 8 order giống hệt (id + thứ tự layer) |
| GC-02 | rng khác seed | seed 42 vs 43 | ≥1 order khác |
| GC-03 | ràng buộc order | 40 seed × 8 khách | MỌI order: ≥1 sốt + ≥1 thịt + ≥1 rau, layer[0] là sốt, không trùng id, length đúng bảng customers |
| GC-04 | không trùng trong ca | 40 seed | 0 cặp order giống hệt nhau trong cùng ca |
| GC-05 | matchScore hoàn hảo | order==stack | score=1.0, 3 sao, tip=30×tipMult (khách 3: đúng 36) |
| GC-06 | matchScore vị trí | order=[pate,pork,cuke], stack=[pate,cuke,pork] | score=1/3 → <0.40 → 0 sao + strike event |
| GC-07 | matchScore thừa/thiếu | order 4 lớp, stack 3 lớp đúng đầu | score=3/4=0.75 → 2 sao |
| GC-08 | thang sao biên | score đúng 0.90 / 0.70 / 0.40 | 3/2/1 sao (biên là ĐẠT) |
| GC-09 | combo | 3 khách 3-sao liên tiếp | tip khách 2 ×1.15, khách 3 ×1.30 (làm tròn xuống); khách 4 sau 1 khách 2-sao → combo reset ×1.0 |
| GC-10 | FAST bonus | serve khi patience còn 65% | +5 tip + event 'fast' |
| GC-11 | patience walkout | mô phỏng BUILD không serve, patience→0 | strike+1, 0 tip, event 'walkout' đúng 1 lần |
| GC-12 | LOSE 3 strike | 3 walkout liên tiếp | state=LOSE tại strike 3, KHÔNG chơi tiếp khách #4 |
| GC-13 | khách #7 WAIT! | mô phỏng c-changer | sau flash tắt +2.5s: đúng 1 layer đổi (order mới ≠ cũ tại đúng 1 index), patience pause 2.5s tổng (1.5 replay + 1.0 đệm), xảy ra đúng 1 lần |
| GC-14 | WIN + rank | script bot hoàn hảo 40 seed | WIN 40/40; rank S khi sao≥21 & tips≥260; sendScore=tips; rewarded-continue chỉ 1 lần/ca (lose 2 lần → showRewarded gọi 1) |

## B. BUILD & TÀI NGUYÊN
| # | Lệnh | Kỳ vọng |
|---|---|---|
| TB-01 | `pnpm tsc --noEmit` | 0 lỗi |
| TB-02 | `pnpm build` (vite) | exit 0, dist/index.html boot được (0 console error) |
| TB-03 | script so sha | `assets/manifest.json` (supervisor gen, 37 file): 100% tồn tại + sha256 khớp; tổng < 4MB |
| TB-04 | `grep -r "Math.random" game/src/core game/src/data` | 0 kết quả (core deterministic; FX ngoài core được phép) |
| TB-05 | `find game/src -name '*.ts' -exec wc -l {} + \| sort -rn \| head -5` | file dài nhất **≤300 dòng**; scene ≤250 dòng; không class GameManager ôm hết (mỗi hệ 1 module: `systems/order.ts`, `systems/patience.ts`, `systems/scoring.ts`, `systems/customer.ts`) |
| TB-06 | `pnpm vitest run` | 14/14 GC pass |

## C. SIM HARNESS 40 SEED (`game/scripts/sim.ts`, chạy `pnpm sim`) — SỐ CHO BOSS
2 policy bot (chứng minh memory = kỹ năng quy ra sao/tip):
- **Bot hoàn hảo:** nhớ 100%, lắp đúng thứ tự, serve ngay.
- **Bot hay quên:** mỗi layer xác suất 25% nhớ SAI (đổi id ngẫu nhiên trong khay), vẫn serve hết.

In đúng bảng:
| chỉ số | bot hoàn hảo | bot hay quên |
|---|---|---|
| win rate | 40/40 = 100% | ≥60% |
| median shift time | 70–140s | — |
| median stars /24 | ≥22 | **≤20** |
| median tips | ≥260 | thấp hơn hoàn hảo ≥25% |
| patience-util max (serve lúc patience còn %) | ≤70% (không trì vô lý) | — |
| strikes median | 0 | ≥1 |

→ Kết luận phải rút được: **người chơi giỏi nhớ hơn = rank cao hơn rõ rệt** (chênh S vs B bằng số). Không đạt ngưỡng → chỉnh ±20% số DATA-MODEL (ghi rõ trước→sau) sim lại.
