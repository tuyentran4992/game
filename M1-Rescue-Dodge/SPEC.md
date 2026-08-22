# M1: Rescue/Dodge MVP — "Cứu Mèo" (YouTube Playables)

> **Research date:** 2026-08-22
> **Sources:** developers.google.com/youtube/gaming/playables (monetization, stability, design requirements), mediacube.io (Playables monetization pilot), blog.youtube (YPP 2026/2027), playables.in/wiki.playgama (kỹ thuật engine/size)
> **Depends on:** — (module đầu tiên của business YouTube Playables Games)
> **Contract file:** `pipeline/` (Python CLI) + `game/` (Phaser 3 web build)
> **Game MVP tóm tắt:** hyper-casual **rescue/dodge 1-chạm** — bảo vệ chú mèo khỏi ong, score tăng khi né được ong, game over khi chạm ong. Dùng để test end-to-end thuật toán Playables + pipeline trước khi tổng quát hóa.

---

## 1. TỔNG QUAN

### Mục tiêu
Làm chín **1 game casual HTML5** (không qua mobile store) có thể đưa lên YouTube Playables, để:
1. Chứng minh pipeline hoạt động từ **concept → AI-gen asset → scaffold Phaser → validate → đóng gói → metadata**.
2. Đo thật trên Playables: cơ chế có giữ chân không (session depth), có bị reject không.
3. Học quy trình publish (portal trực tiếp vs publisher pilot) để chuẩn bị tổng quát hóa ở M2.

### Đối tượng dùng
- **Đầu vào**: 1 concept game + config (tên, theme, style). Trong M1 concept fixed = "Cứu Mèo" (rescue/dodge).
- **Người vận hành**: Hermes (điều phối) + agent/dev (code) + anh Tuyền (duyệt). KHÔNG có end-user bàn phím — game là output bàn giao lên nền tảng.

### IN SCOPE
- Pipeline **tạo asset** (AI-Box/WAN + optional LoRA) cho: 1 nhân vật mèo, 1-2 chướng ngại (ong), nền, UI icon.
- Pipeline **scaffold** game Phaser 3 (web build) đúng chuẩn Playables.
- Tích hợp **Playables SDK**: pre-roll (auto), **interstitial** (đặt giữa màn), **rewarded** (tùy chọn — xem BR), `saveData/loadData`, `sendScore`, `pause/mute` handlers.
- **Validate tự động** trước khi đóng gói: bundle size, file size, cấm nén, cấm gọi mạng ngoài, responsive, no external API.
- **Đóng gói**: zip + metadata (title/desc/thumbnails 1:1-5:7-16:9/preview 16:9) theo form portal.
- 1 game mẫu chạy được + chuẩn bị file upload.

### OUT OF SCOPE (M1 KHÔNG làm)
- Tổng quát hóa factory đa game (để M2).
- Tự động hóa publish/upload (làm thủ công lên portal hoặc qua publisher pilot ở M1; automation để M3).
- IAP (chưa được nền tảng hỗ trợ).
- Multiplayer / bất kỳ gọi mạng ngoài / analytics third-party — **CẤM tuyệt đối bởi Playables**.
- Hỗ trợ mobile store / các nền tảng web game khác (CrazyGames, Poki) trong M1.
- **KHÔNG hứa** AI tạo đúng góc/khung chuyển động mới từ 1 ảnh (WAN image-to-image bịa góc) — asset dùng nền tĩnh + animation bằng tween/physics của Phaser (xem BR-08).

---

## 2. MODULE DEPENDENCIES + API CONTRACT

### Dependency
| Phụ thuộc | Vai trò | Engine phiên bản |
|-----------|---------|------------------|
| YouTube Playables SDK | ads, cloud-save, score, pause/mute | theo docs `developers.google.com/youtube/gaming/playables/reference/sdk` |
| Phaser 3 | game engine web build | Phaser 3.60+ (WebGL) |
| Python 3.11+ | pipeline orchestration (asset gen, validate, package) | 3.11+ |
| AI-Box / WAN 2.7 (API image) | sinh asset hình | xem skill `aibox-image-generation` |
| (tùy chọn) LoRA | đồng bộ style asset | xem skill `lora-trainping-pipeline` |

### Playables SDK contract (được phép dùng)
| SDK method | Chức năng | Bắt buộc? |
|------------|-----------|-----------|
| `ytgame.pause()` / `ytgame.resume()` + `onPause` / `onResume` | tạm dừng/render tắt-sound khi platform yêu cầu | ✅ BẮT BUỘC |
| audio `isAudioEnabled` / `onAudioEnabledChange` | mute/unmute | ✅ BẮT BUỘC |
| `ytgame.ads.requestInterstitialAd()` | hiện ad giữa màn (giữa level / game over) | ✅ dùng |
| `ytgame.ads.requestRewardedAd('reward-id')` | ad thưởng (extra life tiếp tục chơi) | ✅ dùng — mục tiêu tăng session depth |
| `saveData()` / `loadData()` | cloud save điểm cao | ✅ dùng (score/share) |
| `sendScore(score)` | đẩy điểm lên YouTube | ✅ dùng |
| pre-roll | tự chạy khi mở game, dev không integrate | tự động |

> Lưu ý: chỉ dùng **ads do YouTube cung cấp** (qua SDK). MỌI ads/IAP/monetize off-platform = CẤM.

### Pipeline CLI (contract — không code, chỉ giao diện)
```bash
python -m pipeline scaffold --config games/cuu-meo.yaml          # sinh code game từ template
python -m pipeline assets --config games/cuu-meo.yaml --job gen  # gọi AI-Box sinh asset
python -m pipeline validate --game-dir games/cuu-meo             # check chuẩn Playables
python -m pipeline package --game-dir games/cuu-meo              # tạo zip + metadata folder
```
> `games/cuu-meo.yaml` = config một game (tên, style, asset spec, cơ chế). M1: 1 file config cố định.

---

## 3. USER FLOW

### 3.1 Vòng chơi game (end-user trên Playables)
```
Player mở game (pre-roll ad tự chạy)
→ Màn hình Start: nút "Chơi" (data-testid bắt buộc)
→ Tutorial 1 dòng: "Giữ để tránh ong, thả để né" (3 giây, không ad)
→ Chơi chính: thú mèo chạy trên track, ong bay tới, tap/giữ để đổi lane / lật tránh
→ Điểm tăng dần theo thời gian + mỗi lần né thành công
→ [Mỗi 10 điểm: Level-up — đổi cảnh + nhảy khó + popup "Cấp {n}"]
→ [Né liên tiếp ≥5 không chạm: combo bonus +5]
→ [Nếu vượt best-score: popup "KỶ LỤC MỚI!"]
→ Chạm ong → Game Over:
     • Hiện score + điểm cao (sendScore)
     • Nút "Chơi lại" (có thể mở rewarded ad để "tiếp tục" 1 lần)
     • interstitial ad xuất hiện vào màn Game Over (đặt sau 1-2 lần chơi)
→ Player đóng / đổi tab → game tự save score qua saveData, pause đúng
```

### 3.2 Luồng vận hành pipeline (anh Tuyền / Hermes)
```
1. Tạo games/cuu-meo.yaml (concept + style + asset spec)
2. Điền asset keys vào config → chạy CLI assets → AI-Box sinh asset vào assets/raw
3. Agent code từ template Phaser (đã gắn SDK) → fill logic mechanics theo SPEC
4. Chạy CLI validate → chạy game cục bộ (browser) → sửa cho hết warning
5. Chạy CLI package → sinh build/cuu-meo.zip + metadata/ (thumbnails, desc, preview)
6. Nộp lên Playables portal (thủ công M1) hoặc qua publisher pilot → chờ certify
7. Lên sàn → theo dõi analytics (session depth, retention) → quyết định giữ/điều chỉnh
```

### 3.3 So đối thủ (khả năng friction)
- **Đối thủ**: Doge Rescue (2,3 tỷ lượt) — cơ chế tương đương đang ăn đều.
- **Ưu điểm ta**: asset AI-gen rẻ + mapping vào pipeline sinh hàng loạt biến thể (M2), tận dụng window đầu.
- **Friction tránh**: không bắt buộc nhiều ad ở level đầu (giữ chân trước), không làm loading > 5s, không quá nhiều màn hình chờ.

---

## 4. NỘI DUNG & BỐ CỤC

### 4.1 Gameplay (mô tả)
- **Nhân vật**: 1 chú mèo (sprite tĩnh, hoạt ảnh lật/xoay bằng tween — KHÔNG sprite-sheet nhiều khung).
- **Cơ chế**: track chạy 3 lane (hoặc dọc) — ong bay tới, player tap để mèo đổi lane tránh ong. Né thành công → +điểm; trúng ong → game over.
- **Difficulty curve (BẮT BUỘC):** 10 giây đầu tốc độ ong THẤP (giữ chân người mới, không bỏ sớm); sau đó tốc độ & mật độ spawn tăng liên tục theo thời gian + **nhảy bậc** ở mỗi milestone Level (BR-17).
- **Progression / Level-up (BR-14):** cứ mỗi **10 điểm** → lên 1 Level (KHÔNG reset). Ở mỗi Level: đổi art-palette nền (cảnh mới) + tốc độ/spawn ong tăng bậc + popup "Cấp {n}" 1.5s (không chặn gameplay, không ad). Ít nhất **3 palette nền** (level 1–3+ vòng lại) — asset trong DATA-MODEL.
- **Combo streak (BR-15):** né liên tiếp không chạm — mỗi 5 lần né liên tiếp cộng thưởng +5 (popup hiệu ứng). Reset combo khi chạm ong.
- **Kỷ lục (BR-16):** khi vượt best-score đã lưu → popup "KỶ LỤC MỚI!" 1 lần/phiên + cập nhật best (saveData/sendScore).
- **Hình**: nền gradient tối thiểu + animation physics; asset size thấp để < 5MB.

### 4.2 Màn hình & data-testid (mọi phần tử tương tác)
| Màn | Phần tử | data-testid |
|-----|---------|-------------|
| Start | Nút Chơi | `start-btn` |
| Tutorial | Text hướng dẫn (3s) | `tutorial-text` |
| Gameplay | Vùng chạm chính / lane | `game-canvas` |
| Gameplay | Điểm hiện tại | `score-label` |
| Gameplay | Level hiện tại | `level-label` |
| Gameplay | Popup Level-up | `level-popup` |
| Gameplay | Popup combo bonus | `combo-popup` |
| Gameplay | Popup kỷ lục mới | `record-popup` |
| Game Over | Text score | `final-score` |
| Game Over | Text điểm cao | `best-score` |
| Game Over | Nút Chơi lại | `retry-btn` |
| Game Over | Nút Tiếp tục (rewarded ad) | `continue-btn` |
| Toàn game | (setting auto) pause theo platform | — |

### 4.3 Copy (tiếng Việt — đối tượng 13+ quốc tế, dùng EN fallback)
- Start: **"Chơi"** / EN "Play"
- Tutorial: **"Giữ để né ong"** / EN "Hold to dodge bees"
- Game Over: **"Chơi lại"** / EN "Play Again" · **"Tiếp tục (xem ad)"** / EN "Continue (watch ad)"
- Level-up: **"Cấp 2!"** / EN "Level 2!"
- Kỷ lục: **"KỶ LỤC MỚI!"** / EN "NEW RECORD!"
- Combo bonus: **"+5"** (streak)
- Title trên portal (≤50 ký tự): **"Cuu Meo - Bee Dodge"**
- Short description (≤150 ký tự): mô tả cơ chế, không thổi phồng, không branding logo.

---

## 5. TECHNICAL REQUIREMENTS

### Stack
- **Pipeline**: Python 3.11+, CLI (`argparse`/`click`), SSH/HTTP tới AI-Box API sinh asset, validate size/bundle bằng script.
- **Game**: Phaser 3.60+ WebGL, JS/TS, web build thuần, KHÔNG framework build phức tạp (tránh bundle lớn).
- **Playables SDK**: gắn vào entry, tuân thủ pause/mute/resume, ads, save/score.

### Yêu cầu kỹ thuật Playables (ràng buộc build — từ research thật)
| Điều kiện | Giá trị | Mức |
|-----------|---------|-----|
| Initial bundle (trước gameReady) | < 30 MiB | MUST — target < 5 MiB |
| Tổng bundle | < 250 MiB (target < 15 MiB) | MUST |
| File lẻ | < 30 MiB (target < 512 KiB) | MUST |
| Saved game data | < 3 MiB (target < 500 KiB) | MUST |
| Load → tương tác | < 5 giây | MUST |
| Cấm nén | không allowed; decompression fallback OK | CẤM |
| Cấm gọi mạng ngoài | no analytics / multiplayer / payment server | CẤM |
| Responsive | mọi aspect ratio, tự co theo viewport, giữ state khi resize | MUST |
| Input | touch + mouse (+ keyboard) | MUST |
| pause/mute | obey ngay lập tức | MUST |
| Target | general audience 13+, KHÔNG dành trẻ em | MUST |

### Cấu trúc code (mô tả, agent tự implement)
```
M1-Rescue-Dodge/
├── games/cuu-meo.yaml        ← config 1 game (concept, asset spec, style)
├── assets/raw/               ← asset AI-Box sinh ra (png, audio)
├── game/                     ← Phaser 3 source (template + logic)
│   ├── src/main.ts           ← entry, gắn SDK, gameReady
│   ├── src/scenes/Start.ts / Tutorial.ts / Gameplay.ts / GameOver.ts
│   ├── src/sdk.py?           ← KHÔNG — SDK là JS; dùng src/sdk-handler.ts
│   └── package.json          ← build web (NODE chỉ để build game output — KHÔNG phải pipeline)
├── pipeline/                 ← Python CLI (assets, scaffold, validate, package)
└── build/                    ← output: cuu-meo.zip + metadata/
```
> Lưu ý: tên `game/` chứa source Phaser do **agent** code; `pipeline/` là Python **anh/Hermes** điều phối. Node/JS chỉ giới hạn trong `game/` (sản phẩm output), KHÔNG nằm trong pipeline Python.

---

## 6. BUSINESS RULES

| ID | Rule |
|----|------|
| BR-01 | Game CẤM tự đặt bất kỳ ads / IAP / monetize nào. Mọi monetization chỉ qua YouTube SDK (pre-roll auto, interstitial, rewarded). |
| BR-02 | CẤM tuyệt đối gọi mạng ngoài, analytics bên thứ 3, multiplayer server, payment gateway. |
| BR-03 | Bundle phải thỏa: initial < 30MB (target < 5MB), file lẻ < 30MB (target < 512KB), load < 5s, save < 3MB. |
| BR-04 | Phải obey pause/mute/resume ngay lập tức khi platform yêu cầu; tắt âm + dừng render. |
| BR-05 | Responsive mọi aspect ratio, giữ game state khi resize, không khóa orientation. |
| BR-06 | Target khán giả 13+, không nhắm trẻ em; content phù hợp chung. |
| BR-07 | Metadata: title ≤ 50 ký tự, short desc ≤ 150 ký tự, thumbnail 1:1 + 5:7 + 16:9, preview video 16:9, publisher + 1-2 genre. KHÔNG logo/branding trong thumbnail/title/desc. |
| BR-08 | Asset nhân vật thú = nền tĩnh + animation tween/physics (Phaser). CẤM để AI tạo khung chuyển động nhiều frame (WAN image-to-image bịa góc/khung — không hứa). |
| BR-09 | Interstitial KHÔNG đặt ở level 1-2 hoặc trong 10s đầu — đặt sau khi player đã gắn kết (game over lần 2+), tránh bỏ game sớm. |
| BR-10 | Rewarded ad để "tiếp tục chơi" tối đa 1 lần/game over (anti-exploit + giữ engagement cân bằng). |
| BR-11 | Score cao phải `sendScore` + `saveData`. Nếu load score lỗi → dùng hoàn toàn phiên hiện tại, không crash. |
| BR-12 | Không có nội dung "hết màn" lơ lửng — khi game over phải có nút hành động rõ (Chơi lại / Tiếp tục). |
| BR-13 | IN-SCOPE M1 chỉ 1 game cố định "Cuu Meo". Config `games/cuu-meo.yaml` là nguồn sự thật cho asset + metadata. |
| BR-14 | Progression: cứ mỗi 10 điểm → lên 1 Level (KHÔNG reset). Mỗi Level đổi art-palette nền (cảnh mới) + tốc độ/spawn ong tăng nhảy bậc + popup "Cấp {n}" 1.5s (không chặn gameplay, không ad). Ít nhất 3 palette nền (level 1–3+ vòng lại). |
| BR-15 | Combo streak: né liên tiếp không chạm, mỗi 5 lần liên tiếp cộng thưởng +5 (popup hiệu ứng `combo-popup`). Reset combo khi chạm ong. |
| BR-16 | Kỷ lục: khi score vượt best-score đã lưu → popup "KỶ LỤC MỚI!" (`record-popup`) 1 lần/phiên + cập nhật best (saveData/sendScore). |
| BR-17 | Difficulty curve: 10 giây đầu tốc độ ong THẤP (giữ chân người mới); sau tăng liên tục + nhảy bậc ở milestone Level; không đặt interstitial trong level đầu (khớp BR-09). |

---

## 7. STATE HANDLING

| State | Cách phát hiện | Xử lý |
|-------|----------------|-------|
| Loading playable | gameReady chưa fire / asset chưa load | Preload tối thiểu, fire `gameReady` khi có thể tương tác; show spinner |
| Pre-roll ad | platform tự chạy trước khi game hiện | Không block; khi ad xong mới nhận input |
| Nhấn Start | click `start-btn` | Vào Tutorial |
| Tutorial | text 3s | Đếm xuống rồi auto vào Gameplay |
| Gameplay (active) | input tap/giữ | Đổi lane / né ong; cập nhật score-label |
| Level-up | đạt mốc 10*n điểm | đổi palette nền + nhảy khó + popup "Cấp {n}" 1.5s (không chặn, không ad); cập nhật `level-label` |
| Combo | né liên tiếp | đếm streak; mỗi 5 lần → cộng +5 + popup `combo-popup` + âm thanh; reset khi chạm ong |
| Kỷ lục | score > best đã lưu | popup `record-popup` 1 lần/phiên + lưu best mới (saveData/sendScore) |
| Game over (chạm ong) | va chạm sprite ong-mèo | Dừng gameplay, hiện final-score + best-score + 2 nút |
| Continue qua rewarded | player bấm `continue-btn` | Request rewarded ad; earned → resume 1 mạng; not earned → ở Game Over |
| Retry | click `retry-btn` | Reset phiên, vào lại Gameplay (interstitial hiện nếu lượt 2+) |
| Resize viewport | resize event (platform) | Phaser Scale auto; giữ score/state |
| Platform pause | `onPause` | Dừng update loop + mute; `onResume` chạy lại |
| Audio mute | `onAudioEnabledChange` false | Mute toàn bộ SFX/BGM |
| Save score lỗi | `saveData` reject | Bỏ qua, đánh dấu phiên không lưu; không crash |
| Network mất | (câm — không được gọi mạng) | Không xử lý; game 100% offline local |

---

## 8. TIÊU CHÍ HOÀN THÀNH + ĐIỀU CHỈNH SPEC CŨ

### Tiêu chí hoàn thành M1
1. `python -m pipeline scaffold/validate/package` chạy qua trên `games/cuu-meo.yaml` thành công.
2. Game chạy được cục bộ (browser) với đủ màn: Start → Tutorial → Gameplay → Game Over → Retry/Continue.
3. Validate PASS hết ràng buộc Playables ở mục 5 (size, không nén, không gọi mạng, responsive, pause/mute).
4. SDK gắn đúng: pre-roll chạy, interstitial đúng thời điểm (BR-09), rewarded đúng (BR-10), save/score hoạt động (BR-11).
5. Progression hoạt động: level-up đổi cảnh mỗi 10đ (BR-14), combo bonus mỗi 5 lần né (BR-15), kỷ lục mới (BR-16), difficulty tăng theo curve (BR-17).
6. Đóng gói ra `build/cuu-meo.zip` + `build/metadata/` đủ file nộp portal.
7. E2E-TESTS (Hermes QA chạy bằng Playwright + vision) PASS nhóm usability + functional.
8. Bàn giao được bộ file sẵn sàng nộp lên Playables (thủ công hoặc qua publisher).

### Điều chỉnh SPEC cũ
(Không có — M1 là module đầu tiên của business mới.)

---

*FILE NÀY = NGUỒN SỰ THẬT cho M1. Agent/dev code theo SPEC, không code PHP/Node pipeline ở `pipeline/` (Python). Node/JS chỉ giới hạn trong `game/` output.*