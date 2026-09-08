# M9: "Deep Cast" — SPEC v2 (ONE-LEVEL MVP · full art · win/lose rõ)
> Thay spec v1 (30 màn + shop). Lệnh boss 08/09: **art hoàn chỉnh ngay MVP, 1 màn thôi, có thắng có thua, vòng lặp rõ ràng.**

## 1. PITCH
Một chuyến hải trình: thuyền câu của anh neo trên mặt biển. Dưới sâu 1200m, **Cá Voi Xanh** canh **Kho Báu**. Mục tiêu duy nhất: **câu được Cá Voi Xanh lên mặt nước** = THẮNG. Cạn tiền = THUA. Mọi thứ (oxy, dây, tiền, nâng cấp vớt được) phục vụ cú câu đó.

## 2. MÀN CHƠI DUY NHẤT (vertical ocean, portrait 480×854)
- Mặt nước trên cùng: thuyền gỗ + ngư phủ (idle bob, sóng, mòng biển).
- 4 dải độ sâu, art riêng, cá riêng: **0–250m Rạn San Hô** (sáng, đông cá nhỏ) · **250–600m Vùng Tăm** · **600–950m Mực Tối** (bioluminescent) · **950–1200m Vực Sâu** (Kha Khủng: anh sáng + kho báu chạm đáy).
- Bottom UI: 3 thanh — **Oxy** (45s/dive) · **Dây/Căng** (0–100%) · **Tiền** (bắt đầu **600**, fuel mỗi lần thả = **150**). Trái tim durability: **3**.

## 3. THAO TÁC — đúng 1 ngón
- **Giữ** → lưỡi xuống (140 px/s tại mặt nước, ramp chậm đầu dive — bài học M1, max 260).
- **Nhả** → guồng lên (90 px/s, chia theo trọng lượng cá đang ngậm).
- **Đang lên mà giữ lại** → NÍN: lưỡi đứng, tension hạ 0.35/s, oxy ×0.5. (Đây là kỹ năng thật: canh nhịp cá giật.)
- Móc cá: chạm là dính, cá to (≥40kg) có giật 300ms.

## 4. VÒNG LẶP (rõ, 1 câu mô tả)
**Xuống sâu → móc cá bán lấy tiền fuel → lên → xuống tiếp sâu hơn với nâng cấp vớt được → khi đủ tiền + dây tốt, truy kích Cá Voi Xanh → thắng.**
- Cá thường bán khi Về bến (surface). Giá 8–160 (10 loài, DATA-MODEL §2).
- **Dây đứt** = mất cá ngậm + **−1 tim** (hồi +1 khi Về bến). 3 lần đứt = về bến tay trắng, tiền không đủ fuel = THUA.
- Hết oxy khi đang mang cá = tuột cá + **nổi miễn phí** về thuyền (không mất tim).
- **Chest 150** nằm đáy (cạnh Kho Báu) — ngạm được lúc xuống hoặc lên, tiền lời để dành cho fuel.

## 5. BIẾN ĐỔI TRONG CHUYẾN ĐI (không shop, không menu — vớt giữa dòng, cột 3 đã điền theo luật PB-2a)
| Mốc | Nhặt được | **Quyết định mới mở ra** |
|---|---|---|
| 250–350m | **LƯỠI ĐÔI** (móc 2 cá/lần) | Gom 2 cá nhỏ = an toàn nhưng drag nặng; hay chừa slot cho cá quý? |
| 550–650m | **SONAR** (2 lần/chuyến, chạm để quét) | Tiêu sonar ở dive nào — dive dò đường hay dive săn Voi? |
| 850m+ | **DÒNG CHẢY XIÊN** | Kéo lệch lưỡi → phải giữ/nhả vi chỉnh liên tục khi xuống; oxy đắt hơn |
| 950–1150m | **CÁ MẸO LỘI NGANG** (patrol 1 con) | Chạm Mẹo khi đang mang cá = mất cá + đứt dây → NÍN chờ nó qua, hay lách xuống nhanh mất 3s oxy? |

## 6. TRẠNG THÁI THẮNG/THUA (BẮT BUỘC — boss yêu cầu rõ)
- **THẮNG**: Cá Voi Xanh (tier 14, spawn ở 1200m khi tension-trung-bình ≤50% mỗi 8s) được đưa lên **mặt nước**. Kịch tính: Voi **kéo thuyền chạy** (boat drift ±, screen shake), không được nhả; nó Bully dây (tension cao nhất game) — người chơi phải NÍN đúng nhịp 3 chu kỳ vùng vẫy. Win screen: Voi nhảy lên boong, **HẠNG S/A/B** (S: còn ≥3 tim & không đứt dây; B: vừa đủ), tổng tiền, nút **CHƠI LẠI**.
- **THUA**: lúc Về bến mà `tiền < 150` (không đủ fuel cho dive kế) VÀ chưa thắng → màn hình **HẾT LIỆU**, hiện số tiền + độ sâu nhất đã chạm, nút **THỬ LẠI** (reset 600).
- Edge: Voi tuột dây giữa đường → nó chìm về 1200m, **mục tiêu sống lại 8s sau** (không dead-end).

## 7. ONBOARDING (bài học M1: người mới không đọc help vẫn hiểu)
Dive 1 tự bật 3 hint text nổi cạnh đúng thứ tự: (1) "Giữ để xuống, nhả để lên" → (2) lần đầu thấy tension >60%: "Cá đang giật! Giữ lại để NÍN chờ nó mệt" → (3) lần đầu gần hết oxy: "Sắp hết oxy — lên thôi!". Không pause game để dạy.

## 8. ART HOÀN CHỈNH NGAY MVP (lệnh boss — không prototype xấu cho bản này)
- Style: cartoon tươi, viền đậm, **saturated palette trên nền xanh deep-sea** (an toàn thị giác trên mọi nền), tương phản cao với HUD.
- Bộ asset production: 10 sprite cá (idle swim, wiggle đuôi 2 frame) + **Cá Voi Xanh cỡ lớn (3 frame vùng vẫy)** + Cá Mẹo patrol + thuyền+ngư phủ (bob 2f, giật cần khi tension) + lưỡi/lưới đôi + dây câu (curve động theo tension) + 4 nền dải sâu (parallax 2 lớp) + bubble/splash/tension-flash FX + HUD (3 gauge + tim + nút sonar) + Win/Lose overlay art.
- Pipeline: `pipeline/assets` sinh atlas PNG từ SVG nguồn trong `assets/src/` — mọi thứ **không** dùng ảnh AI (deterministic, repro, size < 4MB total).

## 9. KỸ THUẬT (giữ như M3 — cái đã chứng minh)
Phaser 3.80 + TS strict, Vite, Vitest logic thuần, Mulberry32 seed (mọi spawn/pulse lịch giật là hàm của seed), bridge `sendScore` (điểm = giá trị Voi + tiền) + rewarded continue đúng **1 lần/chuyến** (hồi 1 tim, chỉ khi thua dây), localStorage `deepcast.best`. pnpm. UI tiếng Anh trong game, spec tiếng Việt.

## 10. IN/OUT SCOPE
**IN**: trên tất cả. **OUT**: 30 màn, shop, nhạc động, story, leaderboard online, nhiều vùng biển. (Bỏ 3 mốc Sonar-patrol nâng cao hơn nữa — chỉ đúng 4 biến đổi §5.)

## 11. TIÊU CHÍ HOÀN THÀNH (verify bằng số trước khi trình boss chơi)
1. `tsc --noEmit` = 0 lỗi · `vitest run` pass toàn bộ GC-01…GC-16 (TEST-CASES) · `vite build` sạch · atlas < 4MB.
2. **Sim 40 seed** (harness policy "reel khi tension<55%, nín khi ≥55%, lên khi oxy<15%"): median dive **25–70s**; win rate 20–60% (dưới = dễ quá, trên = bot chưa bắt kịp nhịp); cửa sống 30–60s **≥50%** (đúng gate M1-fix).
3. Boss chơi tay preview netlify: hiểu game không đọc help; **cảm thấy phân vân "liều xuống hay về" ít nhất 1 lần trong 2 dive đầu**; thắng được trong ≤5 phút chơi thật.

## 12. ANTI-CLONE
Thể loại push-your-luck dive fishing, không merge. Khác biệt core: NÍN canh nhịp giật (không phải tap-the-rhythm kiểu Fish Frenzy), vứt cá cứu dây, 4 mốc nhặt-open-decision không menu, và **Voi kéo thuyền** làm climax. Catalog-check: qa-engineer chạy trước khi build (PB-5).
