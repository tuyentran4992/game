# Sổ nộp game — đa nền tảng

> MỌI lần nộp/thay đổi trạng thái ở bất kỳ kênh nào phải ghi vào đây.
> Agent trước khi nộp: đọc file này + chạy PRE-SUBMIT CHECKLIST.

## PRE-CODE CATALOG CHECK — GATE BƯỚC Ý TƯỞNG (boss lệnh 04/09 — án lệ M3 đổ sông cả game)

> Chạy NGAY khi có ý tưởng game mới, TRƯỚC khi CEO cho qua SPEC/code/asset. Kết quả ghi vào bảng "Nhật ký catalog check" bên dưới.

- [ ] Search TÊN dự kiến trên catalog 3 kênh PB-0 (Playgama / Mediacube-MC Play / Reddit) → KHÔNG trùng tên (bài học: `juicy-merge` đã tồn tại trên Playgama)
- [ ] Search 2-3 từ khóa MECHANIC cốt lõi (vd "suika", "merge", "melon") trên từng kênh → đếm bản tương đồng cùng mechanic
- [ ] **≥3 bản tương đồng trên kênh đích = KILL ý tưởng hoặc đổi mechanic NGAY — KHÔNG qua SPEC.** <3 bản = ghi link bằng chứng, GO tiếp
- [ ] Ghi entry vào "Nhật ký catalog check": ngày · tên ý tưởng · mechanic · link các bản tương đồng · verdict GO/KILL/ĐỔI

## PRE-SUBMIT CHECKLIST (lúc nộp — chỉ RE-VERIFY, không phải lần soát đầu)

**Originality:**
- [ ] Re-check nhanh catalog (kể từ PRE-CODE CHECK có bản mới nào cùng mechanic không) — nếu PRE-CODE CHECK chưa từng chạy = DỪNG, chạy bù trước
- [ ] Entry PRE-CODE CATALOG CHECK của game này tồn tại trong nhật ký (link bằng chứng)

**Kỹ thuật (Playgama):** Game Ready event qua Bridge SDK · saveData qua SDK · mute + dừng audio khi minimize · globe ngôn ngữ · responsive 9:16→32:9 · bundle < 5MB target · load < 5s
**Kỹ thuật (Reddit Devvit):** `devvit playtest` pass · leaderboard server OK · README theo yêu cầu review team · không vi phạm Devvit game policy
**Kỹ thuật (ytgame):** title ≤50 ký tự · desc ≤150 · thumbnails 1:1/5:7/16:9 không branding · preview 16:9
**Chung:** grep `dist/` sạch từ khóa/theme bản cũ bị reject · QA browser+vision pass · `bash scripts/verify_game.sh <game>` pass

### 2026-09-07 — F2 DECISION (Slice Studio, QA PB-3b t_39dc35bc / fix card t_3011ee93): DESKTOP = PORTRAIT-ONLY (phương án a)

`#game-container` giữ cap 720×1280 giữa màn hình rộng — canvas 9:16 FIT không méo, viền trơn 2 bên trên desktop là hành vi đã nghiệm thu của game portrait. Khai báo **orientation = portrait** khi nộp Playgama (B6 t_231c7422: mục 4 "orientation khai báo nếu chỉ hỗ trợ 1"; checklist dòng "responsive 9:16→32:9" của Slice Studio thỏa bằng khai báo portrait-only, không phải hỗ trợ 32:9). Phương án (b) thêm background chơi-được 2 bên KHÔNG chọn — cần card art/scene riêng (ngoài ranh giới card fix), chỉ làm nếu boss/dev-lead yêu cầu sau fun gate. Fix F1 cùng card: ambience pad dừng khi tab ẩn + resume đúng mood chương (`synth.ts` @branch `card/t_3011ee93`, RED-first 7 test + probe chrome headless 0 console error).

## Trạng thái theo kênh

| Kênh | Vai trò | Ràng buộc chính | Ghi chú |
|---|---|---|---|
| **Reddit Devvit** | Kênh dễ nhất, nộp ĐẦU khi nghi ngờ clone | Devvit policy, server leaderboard riêng | Ít soi "trùng gameplay" hơn Playgama |
| **Playgama** | Traffic + revenue sharing | Chống duplicate (toàn bộ HOẶC một phần), self-check | Review 3-5 ngày; có mentor/support chat — hỏi trước khi nộp |
| **YouTube Playables** | Dài hạn, chờ IAP cuối 2026 | Cấm tự monetize, no network ngoài | indie trực tiếp duyệt chậm; qua publisher (Mediacube) |
| **Mediacube (MC Play)** | Publisher pilot多渠道 | theo hợp đồng | pending indie approval |
| **CrazyGames** | ⛔ LOẠI (boss 04/09) | ngoài phạm vi 3 kênh — PROJECT-RULES §PB-0 | không nộp, không đóng gói |

## Nhật ký catalog check (PRE-CODE — gate ý tưởng, chạy TRƯỚC khi SPEC/code)

| Ngày | Ý tưởng | Mechanic | Kênh đã soát | Bản tương đồng (link) | Verdict |
|---|---|---|---|---|---|
| 2026-09-04 | (hồi tố) M1 Buzz Blitz | dodge/cứu mèo 3 lane | Playgama + MC Play | <3 bản dodge-cứu-mèo cùng mechanic | GO (hồi tố — game đã có từ trước luật này) |
| 2026-09-04 | (hồi tố) M2 Neon Sort | color/liquid sort | Playgama + MC Play | CHƯA SOÁT ĐẦY ĐỦ — sort là thể loại đông, re-check trước khi nộp | ⚠ chờ re-check |
| 2026-08-27 | (án lệ) M3 hướng B Potion Panic | merge | Playgama | ≥4 Suika clone + trùng tên juicy-merge | ❌ KILL (nhưng quá muộn — đã code xong; luật mới ra đời từ đây) |

| 2026-09-06 | Skip King (flick đá skip nước) | flick-throw / skip | Playgama | **0 bản cùng mechanic** — search "skipping stones/skip stone/pebble/pond/bounce rock": chỉ My pet Pebble (pet-sim), Pebble: bubble evolution (bắn bong bóng), Ball Bounce (platformer), Throw ball into box (ném vào hộp) — không ai làm game ném đá attendant skip mặt nước | GO (chờ fun gate PB-2) |
| 2026-09-06 | Slice Studio (trace cắt đúng hình) | precision cut / trace | Playgama | **1 bản kề cạnh**: Perfect Half `/game/perfect-half` (kéo đường thẳng cắt đôi đều) + Ninja Veggie Slice (arcade phản xạ khác mục tiêu) — <3 nhưng phải khác biệt hóa: trace-path quanh silhouette + % sai số + chapter (khác Perfect Half ở verb-điều khiển + cấu trúc level) | GO (kèm điều kiện khác biệt hóa, chờ fun gate PB-2) |
| 2026-09-06 | Pottery Spin (spin nặn gốm) | shape-clay | Playgama | 0 bản shaping-gốm trực tiếp (chỉ Vlad&Niki Plasticine kids-racing + blog Minecraft) | GO-dự phòng (E/I thấp — chỉ khi 2 ý trên fail fun gate) |
| 2026-09-06 | Wood-turning/carve variant | lathe carve | Playgama | ≥3: Wood Turning Wood Carving ASMR Processing · Turning Lathe `/game/turning-lathe` · Wood Cutting `/game/wood-cutting` | ❌ KILL |
| 2026-09-06 | Soap cutting ASMR | slice-soap | Playgama | ≥2: Soap cutting. Relax `/game/soap-cutting-relax` · Soap Cutting ASMR `/game/soap-cutting-asmr` | ❌ KILL |
| 2026-09-06 | Glass blow/fill | draw-line water | Playgama | ≥4: Happy Glass `/game/happy-glass-1` · Happy Glass 2 · Joy of Glass · Fill The Glass · Make the glass happy | ❌ KILL |
| 2026-09-06 | Gem cut/polish | gem cutting | Playgama | 1 kề: Gem Stack `/game/gem-stack` + clicker-adjacent | ❌ KILL (verb mỏng) |
| 2026-09-06 | Laser route/toggle | beam ricochet | Playgama | 1–2: Laser Bounce Miner `/game/laser-bounce-miner` · Turn Off the Light | ❌ GẠT (audience hẹp) |
| 2026-09-06 | (ghi nhận hàng tồn) M5 "Peel!" | peel-ribbon | Playgama | ⚠ MỚI: Sticker Jam: Peel Off & Match `/game/sticker-jam-peel-off--match` (peel-sticker+match) — M5 peel-fruit vẫn khác cơ chế chính nhưng TRƯỚC KHI đầu tư lại M5 phải re-check catalog toàn bộ (PB-3b cửa 3) | ⏸ re-check trước khi dùng lại |
| 2026-09-07 | Slice Studio (re-check trước prototype — PB-3b cửa 3) | trace-cut / precision slice theo đường mờ | Playgama | **2 bản kề**: (1) Perfect Half `/game/perfect-half` — kéo ĐƯỜNG THẲNG cắt đôi 50/50 (verb + cấu trúc khác: trace-path quanh silhouette + % sai số + no-go zone); (2) Soap Cutting ASMR `/game/soap-cutting-asmr` — có mode "follow outlined path" nhưng carve tự do, không đo sai số/tách hình theo path; tên "Slice Studio" 0 trùng (search `playgama "slice studio"` chỉ trả Slice & Destroy / Slice & Soar — khác mechanic) | GO (đúng điều kiện khác biệt hóa từ 06/09; <3 bản cùng mechanic) |

## Nhật ký nộp

| Ngày | Game | Kênh | Action | Kết quả | Ghi chú |
|---|---|---|---|---|---|
| 2026-08-24 | M3 Juicy Merge | Playgama | Submit (account kotaro001) | ❌ **REJECT 27/08** | "too closely replicates already published titles" — catalog có ≥4 Suika clone: `Suika Game - Watermelon Game`, `Merge Fruit Characters`, `Watermelon Game`, `Fruit Merge: Juicy Drop Game`; TRÙNG TÊN `playgama.com/game/juicy-merge` có sẵn |
| 2026-08-27 | M3 Juicy Merge | Reddit Devvit | README theo yêu cầu review team (commit 0b7a8b1) | ⏳ chờ review | port done (devvit + server + Redis), chưa deploy chính thức |
| ~08/2026 | M1 Cứu Mèo | Mediacube | Gói nộp chuẩn bị xong | ⏳ pending indie approval | |
| — | M2 Neon Sort | (chưa nộp) | code xong | ⏳ chưa đóng gói | |
| — | M4 Neon Grid | (chưa nộp) | code + build OK | ⏳ thiếu QA browser + packaging | |
| 2026-08-27 | M3 Juicy Merge | Reddit Devvit | **NỘP (anh Tuyền)** | ⏳ chờ review | Reddit = kênh khả thi duy nhất còn lại của M3 |
| — | M3 v2 Potion Panic | Playgama | **KHÔNG nộp** | ⛔ hủy — anh Tuyền chơi thử thấy CHÁN | đúng checklist anti-clone nhưng fun gate fail → dừng sớm, không tốn vòng polish/submission |
| 2026-08-27 | M4 Neon Grid | Playgama | **KHUYẾN CÁO KHÔNG nộp nguyên trạng** | 🔴 reject risk cao | So catalog 27/08: block puzzle BÃO HÒA hơn cả Suika — `Neon Block Blast` (trùng cả theme+lối chơi), `Block Blaster` (Playgama tự mô tả "classic 1010! clone"), `Block Puzzle 1010: Jewel Lines`, `Sudoku Block Puzzle`, `Block Puzzle Legend`, category "Block Games" = 610 games. Core verb "đặt miếng ghép, clear hàng" y hệt Neon Grid. |
| 2026-09-04 | M1 Buzz Blitz | Mediacube | REPACK QA (t_662df9e4) — zip mới `buzz-blitz-mediacube-20260904-1114.zip` 1,808,102 B, md5 `8de20a314554bf5165fc3c9e81d8912a`, SHA base `0ccf1ef8`, 0 bridge.playgama.com | ✅ gates 6/6 (residual: Phaser testString nội bộ, bất khả kháng) | CHỜ: bệnh án PROGRESS-1 (bot chết 44s sau ramp) — chưa nộp cho Sofiya tới khi CEO chốt round sửa |
| 2026-09-04 | M1 Buzz Blitz | Playgama | REPACK QA — zip `buzz-blitz-playgama-20260904-1114.zip` 1,808,161 B, md5 `fa6525b0a9c4e787e96a22258e18eb6b` | ✅ gates pass (bridge whitelist đúng kênh) | cùng trạng thái chờ chốt |
| 2026-09-04 17:29 | M1 Buzz Blitz | Mediacube | **C1a growth-lead (t_d724a691): vá `build/metadata/metadata.json` THÊM `how_to_play`** (blocker duy nhất MONEY#64[4] — root metadata đủ 3 trường, bản build thiếu) + REPACK gate 6/6 trên bundle REPACK-2 hiện hữu | ✅ REPACK gate 6/6 PASS (growth-lead, baseline QA REPACK-2) | KHÔNG đụng zip: `buzz-blitz-mediacube-20260904-1247.zip` md5 nguyên vẹn `4998d5d078e8ba173ced60124e33ed52` (metadata đi kèm hồ sơ là thư mục riêng, không nằm trong zip). Gate: zip≡dist(-1 dòng bridge) · metadata 3/3 trường == root · title "Buzz Blitz — Cat vs Bees" 24/50 · short_desc 138/150 · how_to_play 150 ký tự EN · 0 URL playgama/bridge (inert license text: prunegames/steffe/github-MIT/phaser.io; binary chỉ XMP provenance AI-gen) · 0 tiếng VN (exception testString Phaser |MÃ‰qgy). how_to_play verified trong src: fish/shield/magnet/fever đều có code (grep cf3d558). Log: /data/agents/growth-lead/outbox/t_d724a691/logs/repack_gate_growth.json. Diff git: chỉ +1 dòng metadata, 0 file game/src |

## Bài học gốc (từ reject M3)

1. Check trùng phải làm **TRƯỚC khi code**, không phải trước khi nộp — 3 tuần dev suýt lãng vì 1 cú search chưa làm.
2. "Khác về checklist" ≠ "khác thực sự". Playgama reject bằng mắt thường 10 giây; nếu phải giải trình dài để chứng minh khác → khả năng cao là chưa đủ khác.
3. **FUN là gate số 0.** Prototype placeholder chơi trước, SPEC sau. Game giống hệt người khác nhưng vui hơn nhiều → vẫn sống; game khác hẳn mà chán → chết cả 2 kênh.

### 2026-09-04 ~12:48 UTC — REPACK-2 QA t_68477b0d (SHA 09364856, code balance t_2e94b3be)
| bản | zip | md5 | bytes |
| --- | --- | --- | --- |
| Playgama | M1-Rescue-Dodge/build/buzz-blitz-playgama-20260904-1247.zip | 67670518d8d7d7da28e94a6f5e6c3388 | 1336805 |
| MediaCube (0 URL ngoài) | M1-Rescue-Dodge/build/buzz-blitz-mediacube-20260904-1247.zip | 4998d5d078e8ba173ced60124e33ed52 | 1336776 |
Gates REPACK-2 (logs full: /data/agents/qa-engineer/outbox/t_68477b0d/logs/repack_gates.json):
title "Buzz Blitz" dist=src ✔, 0 "Cuu Meo" ✔, diff -r zip≡dist ✔ (cả 2 bản), 0 dead-art
(_new/_pal_/ui_icons) trong zip ✔, MediaCube 0 bridge URL ✔ / Playgama chỉ bridge whitelist ✔,
0 ký tự có dấu (ngoại lệ bất khả kháng Phaser testString "|MÃ‰qgy" như REPACK-1) ✔.
Dung lượng 1.81M→1.34M do dead art đã xoá từ nguồn (t_2e94b3be). Lưu ý range "loại raw/ khỏi zip":
raw/ dist = 19 file runtime asset (load keys main.ts baseURL './raw/', missing=0 — bằng chứng
outbox/t_68477b0d/logs/raw_keep_check.json) → GIỮ raw/ trong zip là đúng; dead art thật đã sạch từ nguồn.
Zip REPACK-1 (1114) giữ nguyên, không xoá — chống lẫn bản khi nộp.
