# M10: "Banh Mi Master" — SPEC v1 (ONE-SHIFT MVP · full art · win/lose rõ)
> Chuẩn §PB-2b SPEC-DRIVEN (án lệ M3/M4/M9: 5 file spec chốt trước + 1 prompt chạy trọn = MVP đạt).
> Lệnh boss 09/09: Hermes TỰ research + TỰ viết spec (không gieo card company).

## 1. PITCH
Bạn là chủ quầy **bánh mì đường phố Việt Nam** buổi sáng. Mỗi khách **đọc đơn HÀNG ĐÚNG 1 LẦN** — bong bóng order hiện lên rồi BIẾN MẤT. Bạn phải **NHỚ** và lắp đúng sandwich: đúng nguyên liệu, đúng thứ tự lớp (dưới→trên). Giống ≥90% = 3 sao + tip đậm. 3 khách bỏ đi vì chờ lâu/sai bét = **THUA ca làm**.
**Hook độc đáo (chưa game cooking nào làm):** order KHÔNG nằm mãi trên màn hình như Papa's/Cooking Mania — nó biến mất, tạo cảm giác "hồi hộp sợ quên" của người bán hàng thật. Evidence anti-clone: `CATALOG-CHECK.md`.

## 2. MÀN CHƠI DUY NHẤT (portrait 720×1280)
- **Trên (0–300px):** nền quầy bánh mì đường phố (xe đẩy gỗ, bạt xanh, nắng sớm); khách đi vào từ phải, đứng trái; bong bóng order hiện trên đầu khách.
- **Giữa (300–780px):** vùng lắp sandwich — ổ bánh mì đáy cố định giữa màn, layer stack dựng lên; khi SERVE nắp bánh trên úp vào.
- **Dưới (780–1280px):** khay nguyên liệu **12 ô (4×3)** + hàng nút **UNDO · SERVE · HINT**.
- HUD góc trên: 💰 Tips (coin) · ⭐ Stars · 💢 Strikes (3 ô, mất khách = tối 1 ô).

## 3. THAO TÁC — đúng 1 ngón
- **Tap ô nguyên liệu** → layer bay lên stack đúng thứ tự tap (dưới→trên), snap + squash.
- **Tap UNDO** → bỏ layer trên cùng (tự do, không phạt).
- **Tap SERVE** → nắp bánh úp, so khớp order (công thức DATA-MODEL §5) → sao + tip.
- **Tap HINT (rewarded ad)** → bong bóng hiện LẠI 1.5s. Tối đa **1 lần/khách, 3 lần/ca**.
- Không drag, không multi-touch, không giữ-chờ (khác M9). Vùng chạm ≥ 44px (chuẩn mobile-first).

## 4. VÒNG LẶP (1 câu)
**Khách vào → order FLASH rồi biến mất → lắp từ trí nhớ → SERVE → sao/tip → khách kế khó hơn → hết 8 khách = thắng ca.**
- Patience (thanh kiên nhẫn trên đầu khách) chỉ bắt đầu tụt SAU khi bong bóng tắt; về 0 = khách bỏ đi, +1 strike.
- SERVE khớp <40% = khách lắc đầu bỏ đi (strike) — chống serve bừa; ≥40% = 1-3 sao theo thang.
- Thắng: xong khách #8 với <3 strike → màn WIN: tổng tips + hạng **S/A/B** (ngưỡng DATA-MODEL §6) + CHƠI LẠI.
- Thua: strike thứ 3 → màn "STALL CLOSED": số khách đã phục vụ + tips + THỬ LẠI (reset seed mới).

## 5. BIẾN ĐỔI TRONG CA (không shop, không meta — luật boss: chỉ nâng cấp trải nghiệm TRONG 1 ván; cột 3 BẮT BUỘC đã điền, bài học M7 Skip King)
| # | Khách | Sự kiện | **Quyết định mới mở ra** |
|---|---|---|---|
| 1 | Học sinh (tutorial) | flash 6s, từng layer highlight + ô khay sáng theo | Học chunking: nhìn-theo-từng-lớp |
| 3 | Dân văn phòng | đơn 4 lớp, tip ×1.2 | Bắt đầu phải nhớ 2 nhóm (sốt+thịt / rau) |
| 5 | Doanh nhân VIP | đơn 5 lớp, tip ×2 nhưng patience ngắn nhất (32s) | **Liều lắp chậm để 3 sao ×2 tip, hay serve nhanh ăn 2 sao?** |
| 6 | Sinh viên vội | flash chỉ 3.5s | Kỹ năng đọc-trước: nhìn khay dự đoán layer kế |
| 7 | Khách đổi ý | flash xong 1.5s → "WAIT!" bong bóng hiện lại 2s với **1 nguyên liệu ĐỔI** (miễn phí, patience pause) | Phải **ghi đè 1 phần trí nhớ** — sai đúng chỗ bị đổi là lỗi điển hình |
| 8 | Khách quen giờ cao điểm | đơn 6 lớp dài nhất ca | Chunking toàn phần: 3 nhóm × 2 |

## 6. ONBOARDING (bài học M1: không đọc help vẫn hiểu)
- Khách #1: flash 6s; trong flash, mỗi layer sáng tuần tự 0.8s + mũi tên chỉ đúng ô khay.
- 2 khách đầu patience rộng (45/40s) — người mới lắp chậm vẫn kịp.
- Text tối đa 3 từ EN ("Remember the order!", "WAIT!"). Không pause để dạy.

## 7. THẮNG/THUA — TRẠNG THÁI (bảng đầy đủ)
| Trạng thái | Trigger | Hiển thị |
|---|---|---|
| FLASH | khách vào | bong bóng order + icon stack mini (dưới→trên), đồng hồ vòng tròn đếm ngược flash |
| BUILD | bong bóng tắt | patience tụt; stack + khay active; UNDO/SERVE/HINT active |
| SCORING | tap SERVE | nắp bánh úp 400ms → từng layer khớp ✅ sáng xanh / lệch ❌ rung đỏ (reveal 0.5s/layer) |
| HAPPY | ≥1 sao | sao bay + tip coin bay về HUD + khách cười đi ra |
| WALKOUT | patience=0 HOẶC match<40% | khách giận (mắt lửa 💢), strike tối ô, screen shake |
| WAIT! | riêng khách #7 | bong bóng hiện lại, 1 icon đổi (nhấp nháy vàng) |
| WIN | hết khách #8, strike<3 | overlay hạng S/A/B + tips + sao + CHƠI LẠI |
| LOSE | strike=3 | overlay "STALL CLOSED" + thống kê + THỬ LẠI |
| AD-HINT | tap HINT | rewarded (bridge hoặc mock) → FLASH lại 1.5s |

Interstitial: giữa khách #4 và #5 (nghỉ tự nhiên). Rewarded continue: sau LOSE đúng **1 lần/ca** — hồi 1 strike (bài học M3/M9).

## 8. ART HOÀN CHỈNH NGAY MVP (lệnh boss 08/09)
- Style PREMIUM CASUAL theo `docs/DESIGN-SYSTEM.md` §4 (candy volumetric, thumbnail-first, juice bắt buộc).
- Theme: **đường phố Việt buổi sớm** — nắng vàng ấm, bạt xanh dương, xe đẩy gỗ, đèn lồng nhỏ; khách đa dạng (áo dài cách tân, đồng phục văn phòng, balo học sinh).
- **Supervisor (Hermes) TỰ gen assets production bằng WAN 2.7 + manifest sha256 TRƯỚC khi giao code — CẤM coding agent vẽ art** (luật boss 08/09; script `scripts/gen_assets_m10.py`, recipe skill `aibox-image-generation` §Sprite game). Danh mục: DESIGN-SPEC §3 (37 file).
- **Coding model: qwen3.8-flash qua Claude Code (lệnh boss 09/09).** TEST BẰNG CODE (vitest+sim) — KHÔNG browser test; TDD RED→GREEN bắt buộc; anti god class TB-05.
- Game KHÔNG nhúng font riêng (bundle) — hệ thống bold sans theo DESIGN-SYSTEM §1.2.

## 9. KỸ THUẬT (giữ nguyên stack đã chứng minh M3/M9)
Phaser 3.80 + TS strict · Vite · Vitest (logic pure-TS 0 Phaser) · Mulberry32 seed (mọi order/spawn/patience là hàm của seed — `Math.random` CẤM trong core) · `@game/sdk` universal bridge (sendScore = tổng tips; save `banhmi.best`) · pnpm · UI in-game TIẾNG ANH, spec tiếng Việt · mobile-first 720×1280 Scale.FIT (desktop pillarbox) · WebAudio synth SFX (không file nhạc) · 0 mạng ngoài.

## 10. IN / OUT SCOPE
**IN:** 1 ca 8 khách, 12 nguyên liệu, 12-bin khay, flash-order memory, patience/strike/star/tip, hint rewarded, khách đổi ý (#7), win/lose + rank, onboarding #1, sim harness.
**OUT:** nhiều chapter/quán, shop, meta progression (luật boss), daily challenge, achievement/skin, nhạc nền, story, multiplayer, leaderboard online, thêm món (phở/cơm tấm = M11+ nếu M10 đạt fun gate).

## 11. TIÊU CHÍ HOÀN THÀNH (verify bằng SỐ — lệnh boss 09/09: **test bằng code thôi, KHÔNG browser test**; trước khi trình boss chơi tay)
1. `tsc --noEmit` = 0 · `vitest run` pass GC-01…GC-14 (TEST-CASES) · `vite build` sạch · assets manifest 100% khớp sha · tổng assets < 4MB.
2. **Sim 40 seed** (harness 2 policy — TEST-CASES §C): bot hoàn hảo thắng 40/40, median shift 70–140s, patience-util max ≤70%; bot hay quên (25%/layer) win ≥60% NHƯNG median stars ≤20/24 → chứng minh **kỹ năng nhớ quy ra sao/tip**, không chỉ pass-fail.
3. Boss chơi tay preview: hiểu game không đọc help trong 30s đầu; **cảm giác "chết tiệt quên mất rồi" ít nhất 1 lần/ca** (đây là fun hypothesis cần xác nhận); thắng được ca đầu trong ≤3 phút.

## 12. ANTI-CLONE (tóm tắt — bằng chứng đầy đủ ở CATALOG-CHECK.md, 09/09)
- "banh mi"/đồ ăn Việt trên Playgama + Playables: **0 kết quả**.
- Genre cooking-order (Papa's, Cooking Mania/Dash/Chef, Delicious Pizza, Cozy Cafe…≥6 bản Playgama): order **hiện vĩnh viễn** — không bản nào bắt NHỚ.
- Memory thuần (Sprunki Says, Memorize and colorit, Remember the color, Mineblox Guess the Recipe): không phải serving real-time, không food-assembly.
- Giao điểm "flash-order + memory + assemble + serve" = **0 bản** trên 2 kênh đích. Khác biệt trình reviewer bằng 1 câu: *"The order disappears — cook from memory."*
