# UPGRADE-PLAN-M1 — Buzz Blitz nâng cấp TOÀN DIỆN (v1, 04/09/2026)

> **PLAN ONLY — chờ anh Tuyền duyệt, chưa gieo card thực thi.**
> Tác giả: CEO. Bằng chứng đọc tại nguồn: STATUS.md · docs/ARCHITECTURE.md · docs/SUBMISSIONS.md ·
> docs/REJECT-LESSONS.md · FIX-ROUND-3-PERF.md · ROLE-RULES/COMPANY-RULES/PROJECT-RULES (đủ 6 nguồn B1)
> + soi code trực tiếp trên main `cf3d558` (wc -l, grep, config/, GameEngine.ts, context.ts).

## 0. GIẢ ĐỊNH ĐẦU VÀO (điều kiện chạy plan)

1. Chuỗi **PERF3 đang chạy song song** (fe-dev t_0bf09818 → QA t_162eea7a → merge t_e49b5119 → closeout t_7eae689d).
   Plan này **giả định fix perf A–D merge xong + boss Fun Gate retest hết lag**. Mọi hạng mục chạm
   `Gameplay.ts` xếp **SAU** t_e49b5119. Nếu PERF3 FAIL → dừng plan, xử lý PERF3 trước.
2. Channel đích của M1 = **Mediacube (YouTube Playables)** — cửa đang mở (Sofiya yêu cầu sửa 2 ý,
   đã sửa xong round PB-M1-FIX). Fun Gate boss (PB-2) vẫn là cổng 0 ở cuối mỗi phase đụng gameplay.

## 1. CHỤP HIỆN TRẠNG BẰNG SỐ (main cf3d558, soi trực tiếp)

| Trục | Hiện trạng | Kết luận |
|---|---|---|
| Kiến trúc | Gameplay.ts **2038 dòng** (bệnh E FIX-ROUND-3, không sửa trong perf round); logic đã tách pure TS (GameEngine 481d, vitest 48 pass); rng injectable | Nợ E là **trục 1** — mọi nâng cấp sau đều đè lên file này |
| Game feel | Có: shake 5 điểm, flash 2, squash & stretch, 81 lệnh tween/Graphics, Sfx 8 file mp3 thật, BGM, combo/near-miss popup. **Chưa có: hit-stop, particle tier theo mức thưởng, audio ducking fever** | Juice KHÁ đủ — thiếu vài chấm nhỏ, không phải khoảng trống lớn |
| Depth/progression | D-A2 curve (warmup 30s, ramp 1.2→5px/s, softcap 440), level mỗi 22 milestone, 3 palette đổi cảnh, fat-bee L(k)=20+15k+5k², swarm raid 22s, 4 loại ong | Progression **có khung nhưng phẳng sau chương 1**: không mốc chiến thắng, mechanic không ra theo nhịp |
| Retention/meta | Có: 4 quests, shop 4 skins (giá 450/1100/1800 cá), continue-max 1/lần (rewarded), interstitial 2 ván, save schema v2 qua SDK. **Chưa có: daily reward/streak, achievements dài hạn, leaderboard UI (sendScore đã gọi nhưng không hiển thị), "one more" nhanh** | Meta base tốt, thiếu **móc giữ chân qua phiên** — đúng chỗ payout Playables đo |
| Compliance | Zip REPACK-2: 1.34MB < 5MB, 0 URL ngoài (mediacube), title EN, mute/pause/lifecycle qua SDK, globe button handled. Chưa chốt: ytgame metadata checklist (title/desc/thumbnail 1:1, 5:7, 16:9) | Đạt phần cứng; việc còn lại là **hồ sơ nộp** |
| Anti-clone | Catalog check 04/09 hồi tố ghi "<3 bản dodge-cứu-mèo" — **SOAT LẠI HÔM NAY thấy Playgama có `Cat Runner`, `Gold Runner` (cat + né vật cản + thu vàng + unlock skin) + mảng runner Nexand** | ⚠ Xem mục 3 — ảnh hưởng quyết định kênh nộp |

## 2. BẢNG HẠNG MỤC (7 trục B2)

Priority: P0 = phải làm trước khi tính chuyện nộp lại · P1 = nên làm · P2 = nice-to-have.
Effort = giờ worker (fe-dev/QA, chưa tính review/merge).

| ID | Trục | Mô tả | P | Effort | Risk | Metric nghiệm thu (máy đo được) | Dependency |
|---|---|---|---|---|---|---|---|
| **T1** | Nợ kỹ thuật | Tách Gameplay.ts 2038d → `scenes/Gameplay` (state machine mỏng <400d) + `systems/` (SpawnDirector, CollisionSystem) + `render/` (RoadsideRenderer, HudRenderer, FxRenderer) + reuse FxPool của PERF3. **Hành vi 100% giữ nguyên** — refactor thuần | P0 | 6h | Cao (regression) | Mỗi file <400d; verify_game.sh 4/4; vitest ≥48 xanh; regression ảnh 3 mốc (0/30/60s) khớp trước-sau; P95 frame time không tăng quá 5% so sau-PERF3 | SAU t_e49b5119 (PERF3 merge). **Chặn J2, P1, P2, R*** |
| **J1** | Juice | Hit-stop 60–80ms khi ăn hit/chết (đóng băng timeScale thời gian ngắn) + punch camera theo lực; squash mạnh hơn nấc death | P0 | 1h | Thấp | Vitest: timeScale snapshot trong cửa hit-stop; boss Fun Gate "sướng hơn không" | song song T1 được nếu làm sau T1 merge (cùng file → xếp sau) |
| **J2** | Juice | Particle tier: near-miss = wind streaks, combo ≥10 = vàng đậm hơn, level-up = confetti đang có thêm burst ring; tất cả qua pool | P1 | 2h | Thấp | Không tăng GameObject sống sau 60s (pool gate như PERF3 B2) | SAU T1 |
| **J3** | Juice âm thanh | Duck BGM khi fever/hit, thêm pitch-ramp sfx_combo theo combo, mute đúng lifecycle (đã có SDK) | P2 | 1.5h | Thấp | 0 lỗi console audio khi boot 390×844; boss nghe tay | SAU T1 (nhẹ) |
| **P1** | Depth | **Chapter thật**: 3 chương × mốc thời điểm (0-90s Morning Garden / 90-180s Sunset Sprint / 180s+ Night Raid), mỗi chương RA MẮT 1 mechanic trong bối cảnh an toàn (zigzag → ch2, swarm → ch3) + chèn 1 mốc "clear chapter" có fanfare (biến endless thành có đích cảm nhận) | P0 | 4h | Trung | Vitest công thức chương deterministic; HUD "CHAPTER n" + popup; sim newbie cửa sống qua mốc đổi chương ≥50%; PROGRESSION gate PB-3b: boss chơi 3' thấy lên trình | SAU T1 |
| **P2** | Depth | Chapter modifier ngẫu nhiên (variable reward): "Fish Rain" (×2 cá), "Calm Road" (ít ong +15s), "Bee Storm" (+fever nhanh) — chọn 1 trong 3 mỗi chương, seed qua rng injectable | P1 | 3h | Trung | Vitest: phân phối modifier deterministic theo seed; không phá softcap 440 | SAU P1 |
| **B1** | Depth | Re-balance sau P1/P2: tuning spreadsheet MechanicsConfig + Monte Carlo sim 40+ seed, mục tiêu mới: session P50 ≥90s (hiện chết ~44-60s newbie), 60% sống 30→60s giữ nguyên | P0 | 2h | Thấp | Số sim chép ra file (pattern newbieBotSim.ts hiện có); CEO duyệt số theo frame D-A2 | SAU P1 |
| **R1** | Retention | **Daily reward + login streak** (thưởng cá theo ngày liên tiếp, day 7 thưởng skin ngẫu nhiên) — dùng @game/sdk saveData, schema v3 | P1 | 3h | Thấp | Vitest migration test v2→v3 (save cũ không mất); streak logic deterministic theo Date injectable | SAU T1 (chạm context/save) |
| **R2** | Retention | **Achievements 10 mốc** (tách khỏi 4 quests: tổng né, fever max, surviveswarm, chapter 3 finish…) + toast mở khóa | P1 | 2h | Thấp | Vitest đếm progress từ engine state; HUD/GameOver hiển thị | SAU T1 |
| **R3** | Retention | Skin unlock qua achievement (endowment) — thêm điều kiện mở khóa song song mua bằng cá, không bỏ shop | P2 | 1.5h | Thấp | Test: unlock_astro sau achievement X; giá cũ giữ | SAU R2 |
| **R4** | Retention | **Leaderboard UI + score-flex**: màn GameOver hiện hạng/best + bạn (sdk.getLeaderboardEntries đã có trong @game/sdk, M1 mới gọi sendScore) | P1 | 2h | Thấp (phụ trợ backend kênh) | Boot check mock backend 0 lỗi; Mediacube/Playgama leaderboard khác nhau handle graceful fallback | SAU T1 |
| **R5** | Retention | "One more run" ≤2 chạm từ GameOver + đếm ván liên tiếp hiển thị ở HUD Start | P0 | 0.5h | Thấp | E2E: số tap từ game-over→spawn ≤2 (QA browser) | SAU T1 |
| **C1** | Compliance | Chốt hồ sơ ytgame theo SUBMISSIONS checklist: title ≤50 ký tự, desc ≤150, thumbnails 1:1/5:7/16:9 không branding, preview 16:9 — growth-lead soạn, anh bấm nộp | P0 | 1h | Thấp | Pre-submit checklist tick đủ + entry nhật ký nộp | Phase cuối, trước resubmit |
| **C2** | Compliance | Bundle budget gate: sau mọi nâng cấp zip mediacube ≤ **1.6MB** (headroom từ 1.34MB); thêm bước check size vào verify_game.sh chạy của QA | P1 | 0.5h | Thấp | `ls -l build/*.zip` + diff -r zip≡dist trong mọi REPACK | mọi phase |
| **C3** | Compliance | Save schema v3 + migration test (R1 đổi schema) — chống mất best/skins người chơi cũ | P0 | gộp R1 | Trung | Vitest migration pass 100% fixture cũ | trong R1 |
| **M1** | Đo lường | Harness QA cố định: script đo P95 frame time (tái dụng PERF3), sim session-length, size gate — chạy 1 lệnh, output JSON vào outbox QA | P0 | 2h (QA) | Thấp | Lệnh chạy được trên main sau T1, output có 3 số trên | SAU T1 |
| **A1** | Anti-clone | Kết quả catalog check cơ chế mới + **cảnh báo kênh**: xem mục 3 | — | đã làm trong plan | — | Entry nhật ký SUBMISSIONS.md khi boss duyệt plan | — |

**Không đề xuất (đã loại có lý do):**
- ❌ Thêm mạng xã hội/referral deep-link: ngoài phạm vi PB-0 kênh, dark-pattern risk, đo được bằng gì chưa rõ.
- ❌ IAP/skin bán thật: quyền anh Tuyền + cửa IAP 2027 (STATUS §1).
- ❌ Fix perf A–D: đã có chủ trong PERF3, không lặp ở đây (chống trùng card).
- ❌ Viết lại engine/logic: GameEngine pure TS + rng injectable đã chuẩn ARCHITECTURE, chỉ scene phình.

## 3. PRE-CODE CATALOG CHECK cho cơ chế mới (boss lệnh 04/09)

| Cơ chế đề xuất | Soát 3 kênh PB-0 | Bản tương đồng (bằng chứng) | Verdict |
|---|---|---|---|
| Daily reward / login streak | Playgama search | Là meta layer phổ biến (Escape from Hell Runner có 18 achievements + upgrades loop; M4 nhà đã có Daily Challenge) — **không phải core verb** nên không dính duplicate-policy | ✅ GO |
| Achievements, chapter progression | như trên | chuẩn genre, không phải mechanic gốc | ✅ GO |
| Leaderboard UI | qua @game/sdk bridge | M4 đã có leaderboard pattern, SDK hỗ trợ sẵn | ✅ GO |
| **KÊNH M1 vs Playgama** | Playgama catalog hôm nay | `playgama.com/game/cat-runner` (mèo né vật cản + thu vàng + unlock character), `playgama.com/game/gold-runner` (cat dodge obstacles + power-ups) + cụm runner Nexand — **≥3 bản tương đồng core verb "chạy mèo né"** | 🔴 **KHÔNG nộp M1 cho Playgama** (đúng luật ≥3 = kill hướng đó). Kênh M1 = Mediacube/YouTube Playables (reviewer đã cho cửa mở, không chê clone) + Reddit nếu cần. Ghi entry chính thức vào SUBMISSIONS.md khi boss duyệt plan |

Kết luận trục anti-clone: nâng cấp **giữ nguyên core verb** (không thêm động từ mới) → không phát sinh mechanic nào phải kill; rủi ro clone nằm ở **kênh nộp**, đã chốt hướng tránh.

## 4. ROADMAP THEO PHASE (mỗi phase 1 cổng nghiệm thu riêng)

```
Phase 0 (đang chạy, KHÔNG thuộc plan): PERF3 A-D merge + boss retest hết lag → điều kiện kích hoạt plan
Phase 1 — NỀN + CẢM GIÁC (P0, ~9h):  T1 tách file → J1 hit-stop → R5 one-more
   Cổng: verify_game.sh 4/4 · vitest ≥48 · regression 3 mốc · P95 không tăng · BOSS Fun Gate (mượt + sướng hơn?)
Phase 2 — CHIỀU SÂU (P0, ~9h):  P1 chapters → P2 modifiers → B1 re-sim → M1 harness (QA)
   Cổng: sim số chép file (P50 session ≥90s, cửa đổi chương ≥50% sống) · PB-3b PROGRESSION/ONBOARDING · BOSS Fun Gate (3' thấy lên trình?)
Phase 3 — GIỮ CHÂN (P1, ~8.5h):  R1 daily+streak (+C3 migration) → R2 achievements → R3 skins unlock → R4 leaderboard → J2/J3 polish
   Cổng: vitest migration + deterministic streak · boot mock 0 lỗi · BOSS Fun Gate (móc quay lại có tự nhiên không?)
Phase 4 — NỘP (P0 docs, ~1.5h):  C2 size gate + REPACK QA + C1 hồ sơ ytgame + A1 entry catalog → trả lời Sofiya + resubmit
   Cổng: PB-3 + PB-3b 4 cửa + PREVIEW-GATE §2 (1 ping, SHA = main HEAD, 0 FAIL tồn) → QUYỀN ANH: bấm resubmit MC Play
```

**Tổng effort worker: ~32h** (Phase 1: 9h · 2: 9h · 3: 8.5h · 4: 1.5h + harness 2h đã tính ở P2, lệch làm tròn ≤1h do gộp C3 vào R1).
Thứ tự là **đề xuất cứng**: T1 đi trước vì Gameplay.ts là **hotspot va chạm** — mọi card sau sửa file gốc mà chưa tách file sẽ đá nhau (án lệ 2 card cùng sửa 1 curve, 04/09).

## 5. RỦI RO LỚN NHẤT

1. **T1 regression** (refactor 2038 dòng): rủi ro cao nhất của plan. Giảm bằng: refactor thuần không đổi hành vi + regression 3 mốc + vitest khóa công thức sẵn có. Nếu QA FAIL 2 vòng → kill phase, giữ nợ E thêm 1 kỳ, không cố ép.
2. **Phình scope làm chậm resubmit Mediacube**: cửa Sofiya đang mở, dây dưa quá lâu mất goodwill. Mitigation: Phase 1+2 xong là **đã đủ điều kiện nộp lại** (2 góp ý của reviewer đã đáp ứng từ PB-M1-FIX); Phase 3 có thể chạy sau khi nộp, không block nhau.
3. **Leaderboard khác biệt backend kênh** (Playgama bridge vs ytgame): R4 design phải fallback graceful, QA mock boot.
4. **Fun Gate là quyền boss**: mọi phase cuối có cổng "anh chơi tay" — plan không tự tuyên bố vui.

## 6. MỤC CẦN ANH TUYỀN QUYẾT RIÊNG (ngoài duyệt plan)

1. **Duyệt plan + thứ tự phase** (gate cuối card này — chưa duyệt chưa gieo).
2. **Timing trả lời Sofiya**: đề xuất gửi "đã sửa + đang nâng cấp thêm, ETA resubmit ~1-1.5 tuần" ngay sau Phase 2, nộp thật Phase 4. Email là quyền anh.
3. **Kênh Playgama cho M1**: chấp nhận khuyến cáo **KHÔNG nộp M1 lên Playgama** (mục 3) hay muốn research thêm?
4. **Chi art nếu R3 mở rộng skin** (WAN gen asset ~vài $/mẻ) — chỉ khi anh muốn hơn 4 skin hiện có; mặc định plan **tái dùng 4 skin có sẵn, 0 đồng asset mới**.

## 7. ĐIỂM CHỐT KHI GIEO CARD (để boss khỏi hỏi lại)

- Mọi card fan-out: prefix `UPG1-` theo phase, idempotency-key `<CHUỖI>-<VAI>`, body kèm LUẬT 3 file, ≤60' mỗi card (T1 tách thành 3-4 card con theo renderer/system).
- Merge code = dev-lead độc quyền; CEO closeout docs; ping PREVIEW-GATE 1 lần đúng điều kiện (0 FAIL + 0 card running + `git rev-parse main` dán thẳng); 1 batch 1 preview gom (PB/§2.5).
- QA chỉ đo bằng máy; "vui không" nhường Fun Gate PB-2 — không lặp án lệ bot 4 vòng.
