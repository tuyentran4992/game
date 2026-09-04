# UPGRADE-PLAN-M2 — Buzz Blitz (M1) nâng cấp TOÀN DIỆN, cắt theo cửa Sofiya

**Ngày:** 04/09/2026 · **Tác giả:** CEO · **Trạng thái:** CHỜ ANH TUYỀN DUYỆT PLAN — chưa có card thực thi nào được gieo.
**Nguồn:** sản phẩm của vòng §5.1 UPG2 trên card mẹ `t_5ae18b14`: DISC2 5 góc (#60 KT · #62 GATE · #63 UX · #64 MONEY · #65 VIRAL) → TÓM GIỮA VÒNG #67 → 5 REBUT (#70 GATE · #72 MONEY · #73 UX · #74 KT · #75 VIRAL) → **BẢN TỔNG HỢP QUYẾT ĐỊNH #78**. Không copy UPGRADE-PLAN-M1.md — mọi mục dưới đây ghi rõ xuất xứ thread. Bằng chứng kỹ thuật đọc tại main `cf3d558` (CEO spot-check độc lập các số liệu then chốt ngày 04/09).
**Ký hiệu:** `TỨC`=PRE-SUBMIT (trước resubmit Mediacube) · `ĐỢT`=POST-SUBMIT (vẫn thuộc "toàn diện", sau khi nộp) · `CHẾN`=cắt khỏi M2. Phút = worker estimate theo §5.4 (dev-lead sẽ áp hệ số hiệu chuẩn khi cắt subcard).

---

## 0. NÚT BOSS (đọc trước mọi hạng mục — tách riêng theo đề xuất growth #64/#72, CEO chốt #78-Z3)

| # | Nút | Chi tiết | Cổng |
|---|---|---|---|
| B0.1 | **DUYỆT PLAN NÀY** | GO = CEO mở vòng fan-out thực thi (§1 chặng 5, v1.7: 1 card code cho dev-lead). KHÔNG = dây Sofiya trôi, goodwill 2-3 tuần tự tiêu từ 04/09 [GD1]. | anh Tuyền |
| B0.2 | **EMAIL 1 → SOFIYA** | Gửi **D+1..2 (05–06/09)**. Bản nháp 5 dòng TIẾNG ANH verdict-ready nằm trong REBUT-MONEY #72(a) — anh duyệt nội dung + **anh bấm gửi** (PB-6: danh tính thật là quyền boss). Email **KHÔNG hứa ngày resubmit cứng**; nếu vỡ lịch D+11 → email 2 đúng 1 dòng (ngày mới, không xin lỗi dài, không hứa "tuần sau"). CẤM đính kèm zip/ảnh chưa QA-verify. | anh Tuyền (0h dev) |
| B0.3 | **FUN GATE PB-2** | D+9..10 (13–14/09): anh chơi tay bản code-freeze. Câu hỏi duy nhất "chơi có vui không / độ khó hợp lý chưa". FAIL = FIX-ROUND, resubmit lùi trong dải 13–22/09. | anh Tuyền |
| B0.4 | **NÚT NỘP MEDIANE** | Target resubmit **D+11 = 15/09**, dải thực tế 13–22/09. Hồ sơ do growth soạn + QA verify, anh bấm nộp trên tài khoản publisher. | anh Tuyền |

**Lịch dây (MONEY#72(a), neo D0=04/09, chấp nhận nguyên văn #78-Y3):**
`D+1..2 email 1 → D+2..4 PERF3 khép (t_0bf09818→t_162eea7a→t_e49b5119) → D+4..7 T1 + 6 feature PRE → D+8 QA-GOM + repackage + RE-SHOOT ảnh 1 LẦN tại code-freeze (không chờ verdict boss) → D+9..10 Fun Gate → D+11 nộp.`
Goodwill [GD1]: 15/09 = ngày 11 của cửa 2-3 tuần — an toàn cả kịch bản trễ cùng (22/09).

---

## 1. PHẠM VI & Khung fan-out (luật v1.7 #71 + CONTRACT #69)

- Sau GO của boss: CEO mở **ĐÚNG 1 card code cho dev-lead** (phạm vi PRE-SUBMIT) — dev-lead nộp CONTRACT rồi tự chia subcard ≤60', mỗi subcard 1 tầng, nhãn **TDD-A** (logic thuần, red-first) hoặc **TDD-B** (render Phaser, data qua interface tầng A). CEO không cắt card thợ.
- Card phụ trợ song song ngoài code: 1 card `QA-PLAN` cho qa-engineer (ma trận + QA-subcard theo §5.2), 1 card docs `C1a` cho growth-lead.
- **Ranh giới cứng (lệnh boss #69):** `logic/` = GameEngine pure-TS sở hữu luật chơi; `scenes/`+`ui/` = Phaser sở hữu hiển thị. FE chỉ gọi public methods + đọc typed Result (DodgeResult/FishResult/TickResult); engine 0 import Phaser; đổi signature = breaking change qua dev-lead; mọi logic còn lẫn trong Gameplay.ts phải về engine (nghiệm thu T1).
- **Dep toàn dây (đồng thuận #67 + KT#74(c)):** `t_e49b5119` (PERF3 merge) → **T1** → mọi feature chạm Gameplay.ts. KHÔNG có đường song song PERF3 cho vùng spawn L1273-1395.
- **Kỷ luật 1 file = 1 card đang chạy** (hotspot Gameplay.ts — án lệ 04/09). **N3:** testid là hợp đồng QA — `grep data-testid` trước/sau T1 phải diff-rỗng.
- **Trigger cứng anti-clone (GATE#62 C4):** mọi obstacle/type mới ngoài `{normal,speedy,zigzag,fat}×{fish,shield,magnet}` = dừng, chạy CATALOG CHECK trước code (PB-5, án lệ M3). Kênh M1 = Mediacube; Playgama ĐỎ cho M1 bất kể nâng cấp (#67 mục 4). Reddit: 0 dòng M2 — backlog M4/M5 + điều kiện SPEC R4 (MONEY#72(c) đồng VIRAL#65[3]).
- **Methodology mọi hook móc cuối phiên (Z1 PERSIST-OK #70(a) + VIRAL#75(c)):** (1) QA dùng persistent browser context trong 1 phiên nhiều ván; (2) harness chạy N phiên baseline TRƯỚC hook đầu tiên — mọi chỉ tiêu ghi dạng **delta so baseline**, cấm hứa % tuyệt đối khi chưa có đường cơ sở.

---

## 2. BẢNG PRE-SUBMIT (TỨC — nộp bản này cho Sofiya)

| Mã | Hạng mục | Vấn đề — BẰNG CHỨNG | VIỆC LÀM | METRIC ô QA-MÁY (BLOCK/WARN) | Ô FUN GATE boss | ESTIMATE | Dep PERF3/T1? | Xuất xứ thread |
|---|---|---|---|---|---|---|---|---|
| K0 | CONTRACT FE/BE | Lệnh boss #69: boundary chưa thành văn bản, thợ hai tầng dễ đá nhau | dev-lead viết `CONTRACT.md`: interface logic/↔scenes/, typed Result, rule đổi signature | CONTRACT nằm trên branch, đủ cho thợ code; QA đọc từ ô này | — (0 phần vui) | 30' | **KHÔNG** — chạy ngay, song song PERF3 | #69 boss |
| T1 | Tách Gameplay.ts 2038d | `wc -l` = 2038 (CEO verify); branch perf đã viết lại ~25% file chưa merge — feature chạy trước = va chạm 100% bảo đảm (KT#60 K2) | SpawnDirector/CollisionSystem (pure-ish TDD-A) + HudRenderer/RoadsideRenderer/FxRenderer (TDD-B) + reuse FxPool PERF3; mỗi file <400d; **logic lẫn phải về engine (#69-4)**; hành vi 100% giữ nguyên | BLOCK: verify_game.sh 4/4 + vitest ≥48 + regression ảnh 3 mốc (0/30/60s) khớp trước-sau + P95 không tăng >5% sau PERF3 + N3 testid diff-rỗng | — (refactor thuần, không đổi cảm giác) | 360' (3–4 subcard ≤60') | **CÓ — sau t_e49b5119, đứng đầu dây** | KT#60; #67 đồng 5/5 |
| N1 | Audit input-feel lane-switch | Core loop 0-3s của lane-runner là CẢM GIÁC ĐỔI LANE; tham số lane-tween = magic number rải trong scene, `moveSeq`+`killTweensOf` quản lý bằng cờ (KT#60 mục 4) | Đưa `laneMoveMs`/`ease`/`inputBufferMs` về MechanicsConfig + test khóa công thức + boss chơi tay trước/sau | BLOCK: vitest khóa tween theo config (rng/Date injectable); số không `[PLACEHOLDER]` tới playtest | WARN: "mượt hơn không" — anh so 2 bản | 60' | CÓ — Gameplay.ts, sau T1 | KT#60 N1 (không ai cãi) |
| J1 | Hit-stop | Va chạm/chết không "đứng hình" — feel flat (KT#60); ROLE-RULES FEEDBACK <100ms | Đóng băng timeScale 60–120ms khi hit/chết + punch camera theo lực; **đk UX#63: ≤120ms, không băng HUD tween/input buffer** | BLOCK: vitest timeScale snapshot + screenshot frame đóng băng | BOSS: "sướng hơn không" (máy không đo được sướng) | 60' | CÓ — Gameplay.ts, sau T1 | KT#60 TỨC; #67 đồng |
| R5 | One-more ≤2 chạm | GameOver giờ: Play Again → **ad chắn trước khi tải lại ván** (CEO verify GameOver.ts L215-224: `await requestInterstitialAd()` trước `scene.start`) + panel dày | Play Again thành nút primary, đường về spawn ≤2 chạm; đo tap E2E | BLOCK: Playwright đếm tap game-over→spawn ≤2. **Viral#75(d): ô tap-count chạy với mock chặn ad / counter dưới ngưỡng cadence — variant live có ad KHÔNG tính FAIL cho R5** (chống báo động giả lẫn I1) | — (đo được 100% bằng máy) | 30' | GameOver.ts diff perf = 0 dòng → **sau t_e49b5119, KHÔNG chờ T1** | KT#60 TỨC; UX/VIRAL/MONEY đồng |
| P1'' | Chapter debut (mở rộng P1') | (i) Banner CHAPTER lv10/20 đã merge 0ccf1ef — đừng bán lại (KT#60); (ii) **bằng chứng MỚI KT#74: 9/12 ca chết bot kẹp 34.6-34.8s = bẫy speedy đầu sau warmup** (warmupSeconds 30, rollBeeType 25% speedy ngay hết warmup); (iii) UX#63 điều-3 onboarding: loại ong mới ra dồn dập không beat giới thiệu — "chưa từng thấy thứ giết mình" | `firstSeen` set trong GameEngine (TDD-A, ~20 dòng kiểu rollBeeType L283) → lần đầu mỗi type (speedy/zigzag/swarm) ra **1 cụm thưa + telegraph**; swarm gắn message "CH3 · NIGHT RAID"; clear-chapter fanfare dùng lại popup; 0 asset; KHÔNG đổi ranh giới chương time-based (BR-17 vitest khóa) | BLOCK **DEBUT-TELEGRAPH**: quãng 30-45s mỗi type mới, frame-first-visible→frame-chạm-làn ≥1.2s (CDP rAF timestamps + event log). BLOCK **DEBUT-DENSITY**: 2s sau lần ra đầu, count song song type đó ≤1. **Lưu ý trung thực KT#74(b): debut beat KHÔNG đổi số bot** (policy bot 300ms không mô hình hóa telegraph) | BOSS: PROGRESSION PB-3b "3 phút thấy lên trình" — đây là mục Sofiya chê, máy không thay anh | 150–180' | CÓ — vùng spawn nằm trong hunk rewrite perf → **bắt buộc sau PERF3 + T1** (KT#74(c)) | #67 mục 5 (P1'); UX#73(c) rút trùng; KT#74(c) phương án A — CEO chốt A #78 |
| CH | Chip chương trên HUD | UX#63[2]: 80% newbie chết Lv6-9 (P50 ~60-90s) → chapter card lv10 VÔ HÌNH với đúng người cần; phần thưởng progression treo quá xa | `NEXT LEVEL: 8/22` → `CH2 · NEXT 8/22` — đổi format text trong updateHud tại testid `level-progress` đã tồn tại (Gameplay.ts L303); 0 asset; tầng B | BLOCK: screenshot OCR/HUD testid đọc format mới; không tụt readability 0.3s liếc | BOSS: liếc 0.3s giữa trận có biết "đang lên chương" không | 30–60' | CÓ — Gameplay.ts HUD, sau T1 | UX#63[2]→#73(d) bênh vào PRE; không ai bác |
| B1 | Re-sim khóa curve | Bẫy giây-34 (KT#74) + 20% survive 90s @N=40 sát cổng, 1 seed lật = 2,5pp, ±12pp CI — không đủ làm release-gate (GATE#62 C3). Nộp bản có bẫy vào cửa Sofiya = gọi round-2 Fun Gate, đắt hơn 1h | Tuning 3 cần trong MechanicsConfig (perf diff 0 dòng với logic/): (i) `earlyRampPerSec` 1.2→~0.85 đoạn 34-90s; (ii) `shield/fish` density cửa 60-90s; (iii) [debut beat đã tách sang P1'']. Sim ≥100 seed (probe KT: N=100 = 0.38s). **CEO chốt #78: P50≥90s là số BÁO CÁO, không phải lời hứa hard-gate** — tránh cliff cho card | BLOCK(1) 30→60s sống ≥50% (gate cũ giữ, không nới); BLOCK(2) 30→90s sống **≥40% @N=100** = pass-criteria B1; BLOCK(3) 48 test hiện có cấm sửa assert — mọi "xanh nhờ nới assert" = FAIL diff-test. WARN: P50(deathT) + p50_death_t ghi JSON báo cáo. + WARN **CURVE-FROZEN** (UX#73): sim giữ nguyên 2 cửa sau debut beat | BOSS: độ khó hợp lý chưa — anh chơi tay (PB-3b ranh giới: bot chỉ smoke) | 60' | SAU P1'' (đo sau mọi đổi curve) → mắt xích cuối PRE | GATE#62 C3 + GATE#70(d); KT#74(b) CHỈNH; VIRAL#65 đòi vào phase-1 (hướng đúng); CEO chốt khung #78-Y2 |
| V-H1 | Delta-bar "suýt phá record" | Score-flex chưa khai thác: sendScore gọi 2 lần nhưng điểm không bao giờ có bối cảnh (VIRAL#65[1]); móc goal-gradient đặt sai màn nếu để GameOver (UX#73: GameOver cấm thêm dòng, Start còn chỗ) | 1 dòng dưới Play ở màn Start: `37 POINTS TO BEAT YOUR BEST` — chỉ đọc best + lastScore (lastScore sống trong bộ nhớ retry, GameOver đã đọc ctx.engine trực tiếp — KT#74(a)); **close-calls CUT** (negative framing + trùng popup ⚡CLOSE CALL giữa phiên Gameplay L750-759); engine counter near-miss dồn POST | BLOCK: vitest deterministic delta-bar + E2E screenshot Start; metric móc = runs/session delta vs baseline (counter `totalGamesPlayed` GameEngine L93, save v2 'game_save' — PERSIST-OK #70(a)) | — (móc cơ chế, không phải feel) | 30' | GameOver/Start.ts, diff perf = 0 → **sau t_e49b5119, song song T1 được**. Cứng: wiring theo pattern ctx.engine; CẤM đổi EndGameResult/types.ts (= chạm hunk perf +2012..+2077, phạm 1-file-1-card) | VIRAL#65 V-H1 → KT#74 chấp PRE → UX#73 dời Start → VIRAL#75 teo 0.5h → CEO chốt #78-Y1 |
| C1a | Nợ hồ sơ chữ | MONEY#64[4] đếm live: title 24/50 OK, short_desc 138/150 OK; **blocker duy nhất: build/metadata.json thiếu how_to_play** (root có đủ 3 trường) | Bản nộp luôn kèm root metadata; +15' sửa build/ | BLOCK: REPACK gate diff -r zip≡dist + metadata đủ 3 trường | — | 15' (growth, 0 code) | KHÔNG — song song từ đầu | MONEY#64[4] |
| C2 | Size gate | Zip 1.34MB < 5MB nhưng mọi upgrade sau có thể phình; verify_game.sh chưa có bước size | Thêm `zip ≤1.6MB + diff -r zip≡dist` vào verify_game.sh (pattern gate #67) | BLOCK: chạy 1 lệnh ra pass/fail, mọi REPACK | — | 30' | KHÔNG — song song từ đầu | KT#60 TỨC; #67 đồng |

**Tổng PRE (cộng thức từ từng dòng, có K0):** `30+360+60+60+30+150+30+60+30+15+30 = 855'` floor; thay P1''=180 và CH=60 ở ceil: `+30+30 = 915'`. → **855–915' = 14h15–15h15 worker.** C1b RE-SHOOT thumb/preview (0.5–1 ngày wall-clock, growth+ux+viral, **1 lần tại code-freeze D+8, không chờ verdict boss**) không tính vào phút dev. Tương thích ledger vòng 2: KT#74 nêu ≈16h trước khi harness 2h dời về PERF3-QA (#78-Y6), V-H1 teo 1h→0.5h (#78-Y1), C1 docs còn 15' (#78-Y3) — trừ ~3h25 chẵn, bù vào K0 30'; #67 nêu 13h là gộp-round — dải bottom-up 14h15–15h15 nằm giữa hai số đó và là số chính thức của plan.

---

## 3. BẢNG POST-SUBMIT (ĐỢT — vẫn thuộc "toàn diện", chạy sau khi hồ sơ nộp, không block cửa Sofiya)

| Mã | Hạng mục | Vấn đề — BẰNG CHỨNG | VIỆC LÀM | METRIC ô QA-MÁY | Ô FUN GATE boss | ESTIMATE | Dep | Xuất xứ thread |
|---|---|---|---|---|---|---|---|---|
| J2 | Particle tier | Juice bậc 2 — J1 xong feel đã đổi bậc; reviewer MC không chấm hạt (UX#73(d)) | Tier hạt qua FxPool; **ràng buộc lane-keep-out đo được (UX#63[3]): vùng cấm hạt = hành lang 3 lane trong vùng đọc telegraph, z < bee, cap ~20 hạt** | BLOCK: pool gate (GameObject sống không tăng đơn điệu 60s) + screenshot hash vùng lane ≈ 0 pixel hạt + 0 console lỗi | BOSS: cảm nhận juice | 120' | SAU T1 (FxPool ổn định) | KT#60 ĐỢT; GATE ô J2; UX ràng buộc |
| R2 | Achievements 10 mốc | Nền đã có: 4 quests + incrementQuest trong engine → chỉ mở rộng config (KT#60) | 10 mốc + toast mỏng lúc đạt (UX#63: không thành màn danh sách = clutter) | BLOCK: vitest đếm progress từ engine state + toast screenshot | — | 120' | SAU T1 | KT#60 ĐỢT; #67 |
| R4+V-H2 | Rank-pop trên GameOver | (i) **ytgame-backend.ts L185-202 (CEO verify): `entries:[]` + `userEntry.rank:1` cố định + `showNativeLeaderboard/showLeaderboard` = false vĩnh viễn** → trên kênh nộp thật = "hạng bịa #1 · Top 2%" cho 100% người chơi + nút chết = social-proof giả, PB-5-class; (ii) reviewer chấm build nộp, zero meta → xác suất đổi verdict = 0 (MONEY#72); (iii) giá trị hạng chỉ tồn tại sau live khi có đối thủ | 1 dòng `#14 · TOP 2% THIS WEEK` **THAY pill BEST** (GameOver = đúng 1 entry meta — UX#73(a)) + tap mở leaderboard native; fallback theo TÊN KÊNH làm trong SPEC trước (devvit có server leaderboard thật; ytgame chờ API thật của window.ytgame); engine counter near-miss (phần dồn từ V-H1) +30' | BLOCK: boot mock 0 lỗi + Playwright addInitScript cho loadData reject → dòng ẩn không crash + tap-count ≤2 tới leaderboard | — | 90'+SPEC docs | KHÔNG phụ thuộc funnel PRE; làm sau live data | VIRAL#65 đề PRE → KT#74+VIRAL#75 BÁC bằng chứng nguồn → GATE#70(b) khung R4 → CEO chốt POST #78-Y1 |
| R1' | Today-runs HUD | Nền Playables: không push, không email, không deep-link (đã soát handler.ts) → **streak-qua-ngày-thật = dark pattern thụ động, 3/3 đường kích hoạt lại fail** (VIRAL#65[2], #75(a)) | 1 dòng `Today: N runs 🔥` HUD Start từ totalGamesPlayed + reset theo local date; **không schema v3, không hứa thưởng, không phạt mất**; C3 migration gắn lại theo day-streak thật (backlog gated D1/D2 dashboard MC — [PLACEHOLDER] chưa có baseline) | BLOCK: vitest day-key deterministic (Date injectable) + đếm runs = số thật qua save 'game_save' | — | 30' | Song song (Start HUD mỏng) | VIRAL#65 TỬ bản gốc → #75(a) GIỮ án tử → CEO chốt #78-Y4 |
| I1 | Interstitial placement | **Ad ĐANG chặn Play Again**: GameOver.ts L215-224 (CEO verify) — `shouldShowInterstitial()` → `await requestInterstitialAd()` TRƯỚC `scene.start('GameplayScene')`, cadence mỗi 2 ván | Dời ad ra SAU restart (đầu ván mới) hoặc ranh chương — **placement trong cùng cadence, CẤM thêm slot/tăng tần** (chữ chốt MONEY#72(d) nguyên văn); A/B 2 placements chỉ SAU live qua dashboard Mediacube, mỗi bên ≥1 tuần; kênh thiếu công cụ → HỦY hạng mục, ghi "không có số liệu công khai", không đoán. **Peak-end guard (VIRAL#75): không đặt ad lên beat clear-chapter-1 của phiên đầu** | BLOCK: tap-count R5 không đổi khi bật I1 (mock); vitest cadence giữ interstitialDelayGames | — | 30' | SAU R5 trên main (đo tap-count trước/sau) | MONEY#64[3] "rẻ nhất chạm tiền" → #72(d) khung an toàn → VIRAL#75(d) ACCEPT + bằng chứng đảo |

**Tổng POST:** `120+120+90+30+30+30 = 420' = 7h worker` (R4 có 90' code; SPEC docs không tính dev phút).

---

## 4. CHẾN khỏi M2 (3 mục — đồng thuận #67, không ai phản biện ở vòng REBUT)

| Mã | Lý do cắt | Số phận |
|---|---|---|
| J3 audio ducking | Không đo được bằng máy ta; mute-rate web/portrait cao; lợi/game-feel thấp nhất nhóm J (KT#60, #67) | Playbook game sau, khi có analytics on/off |
| P2 chapter modifiers | Mỗi modifier = 1 mặt bằng balance mới → B1 phình + risk nới assert (KT); variable reward cần session data thật | **Ứng viên reopen Playgama DUY NHẤT** (trigger "substantially differentiate CORE gameplay" — MONEY#64[2]): card riêng + CATALOG CHECK trước code, không kèm resubmit MC |
| R3 skin unlock | Endowment cần chiều sâu sưu tập; 4 skin cho pilot chưa chứng minh ai quan tâm; = tiền art trước số liệu thật, ngược PB-6 (KT, UX#63[4]) | Sau khi có achievement data (R2) + boss duyệt tiền art |

**Reddit Devvit:** rút mọi dòng khỏi M2 (MONEY#72(c) đồng VIRAL#65[3]) — backlog M4/M5, giữ đúng 1 điều kiện SPEC trong R4 (fallback leaderboard theo tên kênh).

---

## 5. Hạ tầng đo — KHÔNG phải hạng mục M2 (one-line xác nhận, #78-Y6)

Harness = **sản phẩm phụ của `t_162eea7a`** (PERF3-QA, đang TODO trên board — chưa mài dao lần 2; tách riêng = 2 worker cùng thớt, phạm §5.2). M2 chỉ cộng 2 trường vào JSON export cố định tại outbox QA: `time_to_playable_ms` (N2 KT#60) + `p50_death_t` (phục vụ B1). Đo từ BÊN NGOÀI (rAF frame time, scene.children.length, hash ảnh) → sống qua T1. Trigger reopen hạng mục riêng: nếu t_162eea7a chết. N3 (testid diff-rỗng) = điều kiện nghiệm thu T1, 0h.

---

## 6. Rủi ro & kill-gate

1. **PERF3 FAIL / t_e49b5119 trễ** → cả dây PRE đứng (mọi dep) → email 2 một dòng đổi ngày. Không cố nộp bản chưa QA-GOM.
2. **T1 regression** (2038 dòng): rủi ro cao nhất. Kill-gate: QA FAIL 2 vòng → giữ nợ E thêm 1 kỳ, nộp bản không T1 (chỉ J1/R5/P1''/CH/B1/V-H1/C1a/C2 — chúng phụ thuộc T1 riêng J2/N1; P1'' bắt buộc sau T1 vì vùng spawn → thực tế T1 trễ = trễ cả cụm debut, ghi thẳng vào lịch).
3. **B1 không lên 40% sau 3 cần tuning** → WARN + boss quyết bằng Fun Gate thật, không siết tiếp curve bằng bot (PB-3b ranh giới).
4. **Fun Gate FAIL** → FIX-ROUND 30' trong MechanicsConfig, resubmit vẫn trong dải 13–22/09.
5. **Cửa goodwill vỡ (>22/09)** → email 2 + chấp nhận review lại từ đầu; không tự đặt deadline hỏng (MONEY#72(a)).

---

## 7. Điều kiện nghiệm thu toàn chain (trước khi anh bấm nút B0.4)

- `verify_game.sh` 4/4 + boot check browser thật (PB-3, trích vào QA verdict theo §0.3 luật cha).
- QA-GOM PASS trọn batch (§2.5 GOM PREVIEW — 1 preview hoàn chỉnh duy nhất, 1 trinh-boss).
- PREVIEW-OK của supervisor trên lane 540x (§2/§2.11) — CEO mới được trình URL.
- **Mọi mục depth (J1, P1'', CH, B1, V-H1, R5): cả 2 ô — QA-máy PASS ≠ Fun Gate boss — phải xanh trước resubmit** (luật GATE#62 C2, CEO nhắc lại #78).
- 100% text in-game tiếng Anh; 0 network call; 0 ads tự nhét ngoài SDK cadence cũ (PB-5).

*(Card closeout PB-M1-FIX cũ đã chép nguyên §2 vào body; plan này trỏ §2/§2.5/§2.11 luật cha v1.7 làm hợp đồng trình boss.)*

— HẾT PLAN — chờ B0.1.
