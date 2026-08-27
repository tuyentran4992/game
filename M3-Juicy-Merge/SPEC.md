# M3: "Juicy Merge" (Physics Merge · Suika-style · YouTube Playables)

> **Research date:** 2026-08-23
> **Sources:** Suika Game (physics-merge chuẩn — chain 11 bậc cherry→watermelon), Mediacube Playables (luật nền tảng), kinh nghiệm triển khai M1 (reflex dodge) & M2 (color-sort puzzle)
> **Depends on:** pipeline nền (Python) + game scaffold Phaser 3 dùng chung từ M1/M2 (mỗi game 1 thư mục độc lập)
> **Contract:** `game/` tại thư mục này · config `games/juicy-merge.yaml` · pipeline tái dùng (scaffold/assets/validate/package)
> **Art-theme:** TRÁI CÂY KAWAII (pastel, viền đậm chibi) — Phaser physics-merge
> **Chọn bởi:** MoA (quality — qwen3.8-max + deepseek/kimi/glm advisors) 2026-08-23, lý do: giữ chân dài nhất + rewarded tự nhiên + đa dạng hóa factory thành tam giác **reflex (M1) — logic (M2) — physics-merge (M3)**

---

## 1. TỔNG QUAN

### Mục tiêu
Game **physics-merge** kiểu Suika/Watermelon: thả trái cây từ đỉnh xuống thùng, **2 trái cùng loại chạm nhau → gộp thành trái lớn hơn** (chain 11 bậc). Không để trái vượt qua **vạch danger** (game over). Giữ chân dài qua loop "thả 1 quả nữa" — đã được Suika chứng minh giữ phiên rất lâu → nhiều impression cho ads SDK. Là module 3 của factory, tận dụng pipeline tái dùng → chi phí thấp.

### Đối tượng
- Đầu vào: config 1 game (`games/juicy-merge.yaml`) + art trái cây kawaii.
- Người chơi: khán giả 13+ quốc tế trên YouTube Playables.
- Vận hành: Hermes (PM/QA) + Claude GLM-5.2 (Dev) + anh Tuyền (duyệt).

### IN SCOPE
- Physics-merge đầy đủ: thả trái, rơi vật lý (Matter.js body tròn), merge 2 cùng loại → bậc lên.
- Chain 11 bậc trái cây, bảng điểm theo bậc, hiệu ứng merge (pop + score).
- Vạch danger + game over (khi trái nằm trên vạch sau khi vật lý ổn định).
- Input 1-chạm (mobile) + mouse (desktop); preview ghost vị trí thả.
- Progression: score, best-score lưu qua saveData; rewarded "Tiếp tục" sau game over ≤1 lần.
- Monetize qua SDK: pre-roll, rewarded (tiếp tục). Interstitial ở game over lần 2+.
- Art kawaii + âm thanh (numpy synth). Pipeline: config/assets/validate/package.

### OUT OF SCOPE
- KHÔNG gọi mạng ngoài / multiplayer / ads self (Playables cấm) — chỉ ytgame SDK.
- KHÔNG làm lại pipeline core (tái dùng từ M1/M2).
- KHÔNG có timer ép buộc (tốc độ thư giãn — người chơi tự quyết nhịp thả).
- KHÔNG dùng sprite-sheet nhiều frame cho trái (AI image-to-image bịa góc) — trái = ảnh tĩnh + physics tween.

---

## 2. MODULE DEPENDENCIES + KỸ THUẬT

- **Stack:** Phaser 3 WebGL (JS/TS, vite build) · pipeline Python 3.11+ (reuse M1/M2) · token từ `../docs/DESIGN-SYSTEM.md` (UI chrome chung) + art-theme Kawaii trong DESIGN-SPEC M3.
- **Physics:** **Matter.js ** — body HÌNH TRÒN (circle), có sẵn trong Phaser 3 → KHÔNG tăng bundle, chỉ 1 vật liệu vật lý đơn giản. Fixed timestep, sleep threshold, cooldown thả, để tránh spam + giữ vật lý ổn định.
- **Playables SDK:** dùng `sdk-handler` wrapper (an toàn local) → pre-roll / interstitial / rewarded (tiếp tục) / saveData / sendScore / pause-mute.
- **Pipeline CLI (tái dùng M1/M2):**
```bash
python -m pipeline scaffold --config games/juicy-merge.yaml
python -m pipeline assets --config games/juicy-merge.yaml --job gen
python -m pipeline validate --game-dir games/juicy-merge
python -m pipeline package  --game-dir games/juicy-merge
```
> Cấu trúc mỗi repo: `games/<name>.yaml` (nguồn cấu hình) + `game/` (Phaser src + dist) + `assets/raw/` + `build/` (zip + metadata).

---

## 3. USER FLOW

```
Mở game (pre-roll ad) → Start (nút Chơi, art trái cây kawaii)
→ Gameplay: thùng chứa (bucket), trái cây rơi từ đỉnh
   • Nhấn/giữ kéo để preview vị trí thả (ghost trái di chuyển theo pointer X)
   • Thả: tap/click → trái rơi xuống thùng theo vật lý
   • 2 trái cùng loại chạm → merge thành bậc lớn hơn (pop + score + sfx)
   • Score pop + combo khi merge liên tiếp; hiện trái kế tiếp (next queue)
   • Trái vượt vạch danger + vật lý ổn định → GAME OVER
→ Game Over popup (lần 1): rewarded "Tiếp tục" → trái trên vạch biến mất, chơi tiếp
→ Game Over lần 2+ : interstitial ad → bảng điểm (score, best, kỷ lục mới) + nút Chơi lại
→ Player đóng giữa chừng → saveData lưu best-score; tiếp tục lần sau
```

---

## 4. GAMEPLAY & LUẬT (core)

### 4.1 Cơ chế thả & merge (BẮT BUỘC)
- **Thả trái:** người chơi nhấn giữ để di chuyển ghost theo pointer X (preview vị trí rơi), thả (tap/click lần 2 hoặc nhả) → trái rơi. Trên mobile: chạm → trái rơi tại cột X đó.
- **Vật lý:** trái rơi xuống thùng, đè/xếp chồng, lăn theo Matter.js (body tròn).
- **Merge:** 2 trái **cùng loại** chạm nhau → gộp thành trái **bậc kế tiếp** (chain +1), trái mới sinh tại điểm giữa, đẩy nhẹ ra theo vật lý (không nổ lung tung).
- **Chain 11 bậc** (trái cây kawaii, bậc tăng = kích thước tăng):
  1 Cherry → 2 Strawberry → 3 Grape → 4 Dekopon → 5 Pomegranate → 6 Orange → 7 Apple → 8 Pear → 9 Peach → 10 Pineapple → 11 Melon → **12 Watermelon** (lớn nhất, quả "jackpot").

### 4.2 Vạch danger & game over (BẮT BUỘC)
- Có **vạch danger** nằm ở ~20% chiều cao tính từ đỉnh thùng (DangerLine).
- **Game over** khi: sau khi vật lý **ổn định** (các trái ngừng rơi/di chuyển, qua threshold sleep), có **≥1 trái nằm trên vạch danger** (tâm trái nằm trên vạch). 
- KHÔNG game over ngay khi trái đang rơi ngang qua vạch — chỉ khi settle.
- Khi game over: dừng thả (khoá input), hiện popup.

### 4.3 Score & combo
- **Merge tạo điểm** theo bậc của trái mới sinh (bảng §4.4). Merge lớn → điểm cao.
- **Combo:** merge xảy ra trong khoảng thời gian ngắn liên tiếp → hệ số combo tăng; hiện "Combo x2/x3" pop.
- **Best-score:** lưu qua saveData (BR); vượt best mỗi lượt → popup "KỶ LỤC MỚI!".

### 4.4 Bảng điểm theo bậc
| Bậc | Trái | Điểm merge (tạo ra trái bậc này) |
|----|------|----------------------------------|
| 1 | Cherry | 1 |
| 2 | Strawberry | 3 |
| 3 | Grape | 6 |
| 4 | Dekopon | 10 |
| 5 | Pomegranate | 15 |
| 6 | Orange | 21 |
| 7 | Apple | 28 |
| 8 | Pear | 36 |
| 9 | Peach | 45 |
| 10 | Pineapple | 55 |
| 11 | Melon | 66 |
| 12 | Watermelon | 100 (jackpot bonus) |

### 4.5 Chuỗi trái cây & fairness (BẮT BUỘC)
- **RNG seed trước** cho chuỗi trái cần thả (next-queue) → **deterministic**, test được (đúng bài học M2 "board luôn công bằng").
- Chuỗi thả ban đầu toàn bậc thấp (1-4) → dễ bắt đầu; level-scaled theo số trái đã thả hoặc score (tăng dần bậc trung bình).
- Next-queue hiện 2 trái kế tiếp để người chơi lên kế hoạch.

### 4.6 Responsive & input
- Vùng thả = đỉnh thùng, chiều ngang theo bucket. Ghost trái theo pointer X, clamp trong bucket.
- Portrait-first (9:16), Scale.FIT + letterbox/pillarbox cho ngang. Vùng chạm ≥ 44px.

---

## 5. MÀN HÌNH & DATA-TESTID

| Màn | Phần tử | data-testid |
|-----|---------|-------------|
| Start | Nút Chơi | `start-btn` |
| HUD | Điểm hiện tại | `score-label` |
| HUD | Best | `best-label` |
| HUD | Combo | `combo-popup` |
| Gameplay | Vùng thùng | `bucket` |
| Gameplay | Vạch danger | `danger-line` |
| Gameplay | Ghost trái preview | `drop-ghost` |
| Gameplay | Trái kế tiếp (next queue) | `next-fruit` |
| Game Over | Bảng điểm | `final-score`, `best-score` |
| Game Over | Kỷ lục mới | `record-popup` |
| Game Over | Nút Tiếp tục (rewarded) | `continue-btn` |
| Game Over | Nút Chơi lại | `retry-btn` |

> Copy VI/EN: "Chơi"/"Play", "Chơi lại"/"Retry", "Tiếp tục"/"Continue", "Gợi ý"/"Hint", "KỶ LỤC MỚI"/"NEW RECORD". Title portal (≤50): **"Juicy Merge: Fruit Pop"**.

---

## 6. BUSINESS RULES

| ID | Rule |
|----|------|
| M3-01 | Chỉ thả trái khi chưa game over; input thả khoá lúc trái đang merge đặc biệt/vật lý đang settle quá nhanh (cooldown thả ≥ 250ms chống spam). |
| M3-02 | Merge 2 trái CÙNG LOẠI chạm → trái bậc kế + điểm theo bảng §4.4. Cấm merge 2 trái khác loại. |
| M3-03 | Game over khi (vật lý settle) VÀ (tồn tại trái có tâm trên vạch danger). Không game over khi trái đang rơi ngang vạch. |
| M3-04 | Chuỗi trái thả RNG seed đầu phiên → deterministic, test được. Cấm chuỗi toàn bậc cao ngay đầu (level-scaled). |
| M3-05 | Rewarded "Tiếp tục" sau game over **≤1 lần/lượt**: loại bỏ mọi trái trên vạch danger + đẩy trái còn lại xuống, tiếp tục chơi. Lần 2+ dùng interstitial thay. |
| M3-06 | Khi "Tiếp tục" không earned (người xem quảng cáo thất bại/hủy): Ở lại game over, KHÔNG trừ điểm, không lạm dụng. |
| M3-07 | Interstitial chỉ ở game over lần 2+ (không chen lần 1 — không làm bỏ game sớm). |
| M3-08 | best-score lưu qua saveData/sendScore sau game over; save/load lỗi → im lặng không crash, đặt mặc định, ghi console. |
| M3-09 | CẤM gọi mạng ngoài / analytics / multiplayer / ads self-initiated (Playables). Chỉ dùng ytgame SDK. |
| M3-10 | Nút pause/mute: obey ngay lập tức; preload đồng bộ với pre-roll. |
| M3-11 | Bundle: initial < 30 MiB (target < 5 MiB), file lẻ < 512 KiB, tổng < 250 MiB, load < 5s, save < 3 MiB. KHÔNG nén. |
| M3-12 | Metadata: title ≤50, short_desc ≤150 (EN), thumbnail 1:1/5:7/16:9, preview 16:9, 1–2 genre, KHÔNG branding trong thumb. |

---

## 7. STATE HANDLING

| Trạng thái | Hiển thị / Xử lý |
|-----------|------------------|
| Loading (trước gameReady) | Spinner (component 3.5 design-system) + pre-roll. |
| Start | Nút Chơi nổi trên art. Bấm → vào gameplay. |
| Gameplay — thả bình thường | Ghost theo pointer, trái rơi, merge pop + score. |
| Gameplay — đang settle | Cooldown thả 250ms chống spam; input thu. |
| Merge 2 cùng loại | Pop + scale + score + sfx đúng bậc; combo nếu liên tiếp. |
| Một trái rơi ngang vạch danger | Chưa game over — chỉ khi settle & nằm trên vạch. |
| Game over (lần 1) | Popup + rewarded "Tiếp tục" + interstitial không chạy. |
| Reward tiếp tục earned | Trái trên vạch biến mất, trái còn đẩy xuống, tiếp tục. |
| Game over (lần 2+) | Interstitial ad → bảng điểm + nút Chơi lại. |
| Kỷ lục mới (vượt best) | Popup "KỶ LỤC MỚI!" + sendScore/saveData. |
| Save/load lỗi | Im lặng, đặt mặc định, console (BR-08). |
| Reload giữa chừng | Tiếp tục Start → gameplay bình thường, best-score giữ. |

---

## 8. TIÊU CHÍ HOÀN THÀNH

- Game code chạy trên browser thật (không crash, boot được): Start → chọn vị trí → thả → merge → game over.
- Vitest logic thuần PASS: reset, merge luật (M3-02), game-over check (M3-03), RNG chain deterministic (M3-04), score bảng §4.4.
- QA browser+vision: art kawaii đẹp, ghost vị trí thả đúng, merge pop, vạch danger rõ, rewarded "Tiếp tục" hiện đúng, bundle < 5MB.
- Pipeline validate PASS đủ ràng buộc Playables + package zip chạy được (unzip → serve → browser).
- Đóng gói `build/juicy-merge.zip` + metadata/thumbnail/preview thật (PIL + ffmpeg) sẵn sàng nộp Mediacube / Playgama.

---

## 9. STAGE MODE, OBSTACLES & ACTION POWER-UPS (PLAYGAMA DIFFERENTIATION)

### 9.1 Chế độ Màn chơi (Adventure / Stage Mode - 30 Màn)
- **Hệ thống cấp độ:** 30 màn chơi thiết kế sẵn (Handcrafted levels).
- **Mục tiêu màn chơi (Objectives):**
  1. `target_fruit`: Tạo ra ít nhất N trái thuộc bậc chỉ định (vd: 1 Watermelon, 2 Pineapples).
  2. `target_score`: Đạt mốc điểm yêu cầu trong màn chơi.
  3. `clear_obstacles`: Phá hủy toàn bộ các khối Băng hoặc Hộp gỗ trong thùng.
- **Giới hạn lượt thả (Move Limits):** Mỗi màn có số lượt thả tối đa (15–35 lượt). Hết lượt mà chưa hoàn thành mục tiêu → Thất bại (Stage Failed).
- **Đánh giá Sao (1-3 Stars):**
  - ⭐ 1 Sao: Đạt mục tiêu màn chơi.
  - ⭐⭐ 2 Sao: Đạt mục tiêu và còn dư ≥ 20% số lượt thả hoặc vượt mốc điểm 2 sao.
  - ⭐⭐⭐ 3 Sao: Đạt mục tiêu xuất sắc, còn dư ≥ 40% số lượt thả hoặc vượt mốc điểm 3 sao.
- **Lưu tiến trình:** Lưu `unlockedStage`, số sao và điểm cao nhất của từng màn vào `saveData`.

### 9.2 Chướng ngại vật tương tác (Obstacles)
- 🧊 **Khối Băng (Ice Block):**
  - Khối tĩnh trong thùng chứa.
  - Khi có bất kỳ vụ merge trái cây nào xảy ra trong bán kính lân cận (≤ 120px), khối băng nứt vỡ và tan biến, giải phóng không gian.
- 🪵 **Hộp Gỗ (Wooden Crate):**
  - Khối vật lý có trọng lượng, chiếm diện tích trong thùng.
  - Có thể bị phá hủy bởi Bom hoặc Búa đập.
- 🫧 **Trái Bong Bóng (Bubble Fruit):**
  - Trái cây lơ lửng bên trong bong bóng khí.
  - Khi merge cạnh bong bóng hoặc dùng Búa, bong bóng vỡ và trái cây rơi xuống đáy thùng.

### 9.3 Bộ Action Power-ups (Công cụ can thiệp chủ động)
- 🔨 **Búa (Hammer):** Người chơi bấm chọn Búa, sau đó chạm vào 1 trái cây hoặc 1 chướng ngại vật để phá hủy ngay lập tức.
- 💣 **Bom (Bomb):** Thả một quả bom nổ quét sạch toàn bộ trái cây và chướng ngại vật trong bán kính 160px.
- 🌈 **Trái Cầu Vồng (Rainbow Wildcard):** Quả cầu vồng rơi xuống, khi chạm vào bất kỳ quả nào sẽ lập tức merge với quả đó và nâng cấp lên bậc tiếp theo.
- **Tích lũy & Nhận thêm:** Người chơi nhận thêm Action Power-ups khi hoàn thành màn chơi đạt 3 sao hoặc qua phần thưởng Daily Challenge / Rewarded Ads.