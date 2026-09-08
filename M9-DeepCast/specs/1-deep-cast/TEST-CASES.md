# M9 Deep Cast — TEST-CASES (verify bằng SỐ, chạy trước khi trình boss)
> Logic game là pure TS (`core/rules.ts`, `core/rng.ts`, `data/*`) → vitest không cần DOM/Phaser. Mọi GC dưới đây PASS/FAIL bằng con số in ra stdout.

## A. VITEST — `cd game && pnpm vitest run` (unit deterministic)
| # | Tên | Input | Kỳ vọng |
|---|---|---|---|
| GC-01 | rng cùng seed cùng chuỗi | seed=42 init spawn 2 lần | mảng (id,x,y,phase) giống hệt |
| GC-02 | rng khác seed | seed 42 vs 43 | khác thứ tự spawn |
| GC-03 | descend ramp | t=0..6s | speed 140→≤260, tại y=1200 thời gian descend ∈ [7.0s, 8.2s] |
| GC-04 | pulse cá đơn | f4 hooked, period 2.0 | max(tension)/fightPk ∈ [0.95,1.0], chu kỳ lặp đúng 2.0s (sai số 1%) |
| GC-05 | pulse 2 xung | f5 | peak thứ 2 xuất hiện ở 0.53×period ±5% |
| GC-06 | đứt dây | fight 80, reel liên tục không nín | tension chạm 100 trong ≤ 6s, heart-1, hooked=[], 1 event 'break' |
| GC-07 | nín hạ tension | tension=95 HOLD 2s | tension giảm ≥30, air giảm ≤1.0s |
| GC-08 | air hết khi mang cá | air=0.5s, hook 600m, mang f6 | tuột cá+pop up free, về SURFACE_Y, heart KHÔNG giảm |
| GC-09 | reel chậm theo weight | mang f6(48) vs rỗng | speed ratio = 1/(1+48/60)=0.556 ±1% |
| GC-10 | money đúng | 40s chơi script seed=7 (policy hook f1..f4 thả surface) | money = 600-150·dives + Σvalue·combo, khớp từng đồng |
| GC-11 | fuel | money=140, hết dive, chưa win | LOSE 'OUT OF FUEL' trigger đúng 1 lần |
| GC-12 | hearts | 3 lần GC-06 | LOSE 'LINES BROKEN' |
| GC-13 | fairness dive đầu | seed 1..40, policy "móc con đầu tiên gặp ở ≤250 rồi lên" | có ≥1 cá móc được trong tầm air=45s ở MỌI seed; median dive ∈ [25s,70s] |
| GC-14 | Voi không idle-break | whale hooked, tension ≥100 liên tục 5s | KHÔNG break (chỉ thoát theo timer 20s/tuần tra) |
| GC-15 | win | script: hook f9+f10 bán → fuel còn → dive voi → reel lên surface | WIN, rank tính đúng (S khi breaks=0&hearts=3) |
| GC-16 | continue 1 lần | lose 2 lần | showRewarded gọi đúng 1 lần, lần 2 vào thẳng retry |

## B. XÂY DỰNG & TÀI NGUYÊN
| # | Lệnh | Kỳ vọng |
|---|---|---|
| TB-01 | `pnpm tsc --noEmit` | 0 lỗi |
| TB-02 | `pnpm build` (vite) | exit 0, dist/index.html single-file tương thích Playables |
| TB-03 | `assets/manifest.json` (supervisor gen, 25 asset) | 100% file tồn tại + sha khớp; tổng < 4MB |
| TB-04 | `grep -r "Math.random" game/src/core` | 0 kết quả (core deterministic; FX được phép ngoài core) |
| TB-05 | `find game/src -name '*.ts' -exec wc -l {} + \| sort -rn \| head -5` | file dài nhất **≤ 300 dòng**; không có class "God/GameManager" ôm hết logic — mỗi hệ là 1 module riêng (`core/rules.ts`, `systems/tension.ts`, `systems/spawner.ts`, `systems/economy.ts`, `scenes/GameScene.ts` mỏng chỉ nối input+render). Scene file ≤ 250 dòng. |

## C. HARNESS SIM 40 SEED (file `game/scripts/sim.ts`, chạy `pnpm sim`) — SỐ CHO BOSS
Policy 40 seeds (1..40): "reel liên tục khi tension<55; HOLD khi ≥55; lên khi air<15% hoặc mang cá ≥1; dive mục tiêu band = band(f4), sau đó band(f7), cuối band(whale) theo khả năng tiền".
In đúng bảng:
| chỉ số | ngưỡng đạt |
|---|---|
| win rate | 20–60% |
| median dive time | 25–70s |
| survival 30–60s (cửa sau onboarding — gate M1-fix) | ≥50% |
| median breaks mỗi ván | ≤2 |
| median tiền lúc touch whale band | ≥450 |
Nếu win rate <20% hoặc survival <50% → tinh chỉnh fightPk/AIR_MAX theo §DATA-MODEL (±20%) rồi sim lại, GHI số trước-sau vào báo cáo.

## D. QA BROWSER THẬT (tôi — supervisor — chơi trước khi trình anh)
| # | Check |
|---|---|
| QB-01 | Mobile 390×844: không scroll, không zoom, HUD không overlap, chữ đọc được |
| QB-02 | Onboarding: hint 1-2-3 hiện đúng ngữ cảnh, không cần pause |
| QB-03 | Visual: 4 dải màu phân biệt rõ, cá không lẫn nền, tension flash không loá |
| QB-04 | Feel: hook có giật 300ms, squash 90ms, boat drift khi voi — có run number frame stable ≥55fps (perf HUD ?debug=1) |
| QB-05 | Win/Lose overlay hiện, CHƠI LẠI reset đúng, best lưu reload |
| QB-06 | Bridge: ?playgama=1 không lỗi console; ready() gửi; sendScore không throw khi stub |

## E. PHỦ BR ↔ TC (tự kiểm khi xong)
Mỗi BR trong SPEC.md (BR-01..BR-12) map ≥1 GC/TB/QB; mỗi asset DESIGN-SPEC map TB-03; mỗi pickup map GC tương ứng + QB-02 nếu onboarding. Bảng phủ để cuối file TEST-CASES khi code xong: `BR-xx → GC-yy` điền thật.
