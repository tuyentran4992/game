# M3v2: "Potion Panic" (Physics-Merge · Volatility · YouTube Playables / Playgama)

> **Loại:** SPEC module mới (v2) — thay thế định hướng nội dung của `specs/1-juicy-merge/` sau khi **Playgama reject v1** với lý do *"too closely replicates already published titles"* (Suika clone).
> **Research date:** 2026-08-27 · **Nguồn:** Playgama Content Requirements #3 (cấm copy "hoàn toàn HOẶC MỘT PHẦN"), Game Self-Check, khảo sát catalog Playgama (đã có ≥4 bản Suika: Suika Game, Watermelon Game, Merge Fruit Characters, Fruit Merge + 1 game TRÙNG TÊN "Juicy Merge" thể loại khác).
> **Depends on:** codebase `M3-Juicy-Merge/game/` hiện tại (merge-engine, rng, settle, save v2, stages 30 màn Adventure Saga, obstacles, action-powerups, album, daily-challenge, @game/sdk) + `docs/DESIGN-SYSTEM.md` (UI chrome) + pipeline Python.
> **Contract:** game code tại `../../game/` (reskin + thêm hệ thống mới, KHÔNG fork repo mới) · config `games/potion-panic.yaml` · nộp Playgama lại bằng bản này.
> **Art-theme:** TILED APOTHECA (lò luyện đan phù thủy, neon tím-lục huỳnh quang, orb chất lỏng phát sáng) — khác tuyệt đối palette trái cây kawaii pastel của v1.
> **UI text:** 100% TIẾNG ANH (bất biến — cả SPEC này tiếng Việt chỉ để anh Tuyền đọc).

---

## 0. VÌ SAO BẢN NÀY KHÔNG THỂ BỊ GỌI LÀ CLONE (cần trước nhất)

 Moderator Playgama mở game **10 giây đầu** phải thấy khác. Đổi 4 trục MỘT LÚC:

| Trục | Suika / v1 | Potion Panic v2 |
|------|-----------|-----------------|
| **Động từ cốt lõi** | Xếp chồng thụ động, chờ RNG | **Quản lý Nhiệt (Heat)** chủ động: orb bậc cao tự nóng lên → phát nổ đẩy văng mọi thứ → phải Stir/merge trước khi sôi |
| **Cây merge** | 1 dây thẳng 12 bậc, 1 giống | **3 nhánh nguyên tố** (Fire/Water/Earth), mỗi nhánh 4 bậc; chọn NGUYÊN TỐ khi thả (skill, không RNG-frustration) |
| **Cấu trúc thắng** | Endless score, jackpot watermelon | **Đơn hàng phù thủy (Orders)** + 30 màn campaign goal theo nguyên tố + Philosopher's Stone (cần cả 3 nhánh đạt đỉnh) |
| **Vỏ** | Thùng gỗ vuông, trái cây pastel | **Nồi đồng tròn đáy (cauldron)**, orb huỳnh quang có hiệu ứng nhiệt động, tên không chứa chữ "Merge" |

+ Không dùng lại sprite/bảng màu v1. + Description nộp bài liệt kê 3 khác biệt cơ chế (xem §9 Anti-Reject Checklist).

---

## 1. TỔNG QUAN

### Mục tiêu
Reskin + nâng cấp cơ chế M3 thành game **physics-merge volatility-management**: thả nguyên tố vào nồi, 2 orb **cùng nhánh** chạm nhau → nâng bậc; orb bậc cao **tích nhiệt → bùng nổ dây chuyền**; hoàn thành **đơn hàng** của phù thủy trong số lượt thả giới hạn. Nộp lại Playgama (đã có account + support chat) và giữ nguyên khả năng nộp YouTube Playables/CrazyGames.

### Đối tượng
- Người chơi: 13+ quốc tế (Playables/Playgama catalog).
- Vận hành: Hermes (PM/QA) · agent dev nhận SPEC này (code) · anh Tuyền (duyệt design + nộp).

### IN SCOPE
- Cơ chế thả mới: **chọn 1 trong 3 nguyên tố gốc** (hàng queue 3 orb, deterministic seed — giữ luật chống spam cooldown ≥250ms).
- **Nhánh merge 3x4** (12 loại orb, cùng số sprite slot của v1 → chi phí asset tương đương).
- **Hệ thống Heat**: orb T3/T4 tích nhiệt theo giây; quá 100 → **BREW** (nổ: hủy orb, xung lực đẩy văng bán kính 140px, phá băng/gỗ lân cận, +20 điểm); **Volatile Merge** (merge 2 orb ≥70 heat → x1.5 điểm + reset nhiệt) làm reward chính.
- **Stir** (khuấy): chạm 1 orb để xả 60 nhiệt của nó + 30 cho orb lân cận; 3 charge/màn, hồi 1 charge mỗi 30s.
- **Orders (goal mới)**: `serve_order` — tạo đúng orb nguyên tố+bậc gọi món → orb bay lên kệ, bonus +30.
- **Cauldron shape**: bucket lòng tròn đáy (circle arc tường) thay thành phẳng → đường rơi/lăn khác hẳn Suika.
- Reskin toàn bộ: tên game, 12 orb, nồi, nền 3 palette theo zone, audio motif mới, UI copy.
- Migration save v2→v3 (giữ sao + stage unlock + best của Adventure Saga anh đã code).
- 30 màn campaign v2 (viết lại goals từ stages.ts theo nguyên tố + thêm goal `serve_order` từ màn 11).
- Anti-Reject Checklist §9 + kịch bản nhắn support Playgama TRƯỚC khi nộp.

### OUT OF SCOPE
- KHÔNG làm engine mới, KHÔNG refactor kiến trúc monorepo/SDK (giữ `@game/sdk` hiện tại).
- KHÔNG sprite-sheet nhiều frame (ảnh tĩnh + tween/physics như quy ước factory).
- KHÔNG ads self-initiated / mạng ngoài / analytics (Playables + Playgama cấm; Playgama yêu cầu Bridge SDK — có sẵn qua @game/sdk).
- KHÔNG đổi mechanic của M1/M2/M4.

---

## 2. MODULE DEPENDENCIES + KỸ THUẬT

- **Stack:** Phaser (TS + vite, pnpm) — như v1. Build multi-platform: `standalone | playgama | ytgame | reddit` (vite multi-entry, đã có).
- **Vật lý:** Matter.js body tròn (có sẵn trong Phaser — `merge-engine.ts`, `settle.ts` tái dùng; đổi collider bucket từ 2 tường phẳng + đáy → **1 cung tròn đáy** (chain shape approximating circle) + 2 thành cong).
- **Logic thuần (vitest):** module mới `src/logic/heat.ts` (nhiệt, brew, chain) + chỉnh `merge-engine.ts` sang graph 3 nhánh (`src/logic/elements.ts` mới thay `config.ts` fruit chain) + `stages.ts` thêm `serve_order`.
- **RNG:** `rng.ts` giữ nguyên seed-instance deterministic — chỉ đổi output từ tier(0..11) sang `(element, tier)` của 3 orb gốc trong queue.
- **Save:** `save.ts` schema v3 (mục §DATA-MODEL 6) + migration từ v2.
- **SDK:** `@game/sdk` — BẮT BUỘC gửi `Game Ready` + save/score qua SDK (lý do reject phổ biến trong self-check Playgama).
- **Lệnh:** `pnpm typecheck` (0 lỗi) · `pnpm test` (vitest, chạy từng file — vitest có thể hang) · `pnpm build` · `bash ../../../../scripts/verify_game.sh M3-Juicy-Merge` · pipeline `validate`/`package` với `games/potion-panic.yaml`.

---

## 3. USER FLOW

```
Mở game (pre-roll/bridge ad) → Start: logo "POTION PANIC", nồi sủi bọt nền động,
   PLAY (Adventure Saga) | CHELLEN... → [Adventure map 30 màn, sao, đơn hàng]
   | DAILY (giữ từ v1) | Endless Cauldron (giữ mode điểm v1 cho leaderboard)
→ vào màn: header (Goal chip: "Serve 1 Ember T2 · Drops 16/24") + queue 3 element rune
   • Kéo ngang / chạm rune để CHỌN nguyên tố thả (ghost orb bám pointer X)
   • Thả → orb rơi vào lòng cong nồi; 2 orb CÙNG NHÁNH chạm → merge bậc+1 (+điểm, pop, sfx)
   • Orb T3+ sáng đỏ dần theo HEAT; chạm orb = Stir (xả nhiệt, tốn charge)
   • Heat đủ 100 → BREW nổ: rung màn + particle + văng orb + phá băng/gỗ + điểm
   • Orb đạt bậc 4 (Inferno/Tidal/Golem) và cả 3 nhánh đủ 1 bậc 4 → fused → PHILOSOPHER'S STONE = jackpot màn
   • Goal `serve_order` đạt → orb bay lên kệ + "ORDER FILLED +30"
→ hết drops / vượt vạch danger (orb tâm trên miệng nồi khi vật lý settle) →
   Stage Failed | Stage Clear (sao 1-3, thưởng powerup như v1) → next
→ Endless mode: game over → rewarded "Continue" ≤1 lần → interstitial lần 2+ (giữ luật M3-05..07)
```
**So áp lực click:** Start→chơi = 1 tap (PLAY hoặc chọn màn đã unlock 1 tap). Mọi màn reachable ≤3 tap từ Start. (Gate UX.)

---

## 4. GAMEPLAY & LUẬT (core)

### 4.1 Nguyên tố & cây merge
- **3 nhánh**, mỗi nhánh 4 bậc (kích thước tăng, radius = v1 cùng chỉ số để không đổi physics):

| Bậc | 🔥 FIRE | 💧 WATER | 🌿 EARTH |
|---|---|---|---|
| T1 | Spark | Droplet | Pebble |
| T2 | Ember | Bubble | Sprout |
| T3 | Flame | Stream | Vine |
| T4 | **Inferno** | **Tidal** | **Golem** |

- **Merge:** 2 orb **cùng nhánh CÙNG BẬC** chạm → bậc +1 cùng nhánh (T4 không merge tiếp). Khác nhánh KHÔNG bao giờ merge (chỉ va chạm vật lý).
- **Philosopher's Stone (PP-09):** khi trên bàn đấu đồng thời tồn tại ≥1 Inferno + ≥1 Tidal + ≥1 Golem → 3 orb bị hút vào nhau (tween), fusion = orb đặc biệt "Stone" +150 điểm + tự phục vụ 1 order bất kỳ còn thiếu. 1 lần/màn.

### 4.2 Hàng đợi thả (hết RNG-bực-cao-oan)
- Mỗi lượt thả, người chơi **chọn** 1 trong 3 orb gốc (queue hiện `next-3`, deterministic từ seed — PP-04). Thả xong quay sang orb kế trong queue.
- Cooldown thả ≥250ms giữ nguyên.

### 4.3 HEAT & BREW (trục khác biệt chính)
- Orb T1/T2: heat = 0 vĩnh viễn (ổn định). Orb T3: **+3 heat/s**; T4: **+6 heat/s** (Zone 3 campaign ×1.5).
- Heat hiển thị bằng viền hồng ngoại sáng dần + sủi bọt khi >70.
- **BREW** (nổ) khi heat ≥100: hủy orb đó; xung lực bán kính 140px đẩy văng orb/khối khác; trong bán kính: Ice tan, Crate −1hp, Bubble vỡ; **+20 điểm "VOLCANIC"**; có xác suất kích hoạt heat của orb T3/T4 lân cận +25 (→ **nổ dây chuyền** tự nhiên).
- **Volatile Merge:** merge xảy ra khi CẢ HAI orb có heat ≥70 → điểm ×1.5 (làm tròn) + orb mới sinh heat = 0 (thưởng cho việc chơi nhanh, đúng nhịp giữ chân).
- **Stir:** chạm orb bất kỳ (không phải nút powerup) → chủ orb −60 heat, orb trong 120px −30. Tốn 1 charge (3 charge/màn, hồi 1/30s, tối đa 3). KHÔNG tính là lượt thả.
- Erupt/chain không bao giờ gây ra lỗi crash; số vụ nổ đồng thời tối đa 1 mỗi frame để đảm bảo settle (PP-13).

### 4.4 Danger line & game over
- Giữ luật v1 (M3-03→PP-03): game over khi vật lý settle VÀ tâm orb vượt **miệng nồi** (danger line ở ~20% từ đỉnh). Trái đang rơi ngang miệng KHÔNG tính.
- `clear_obstacles` hết obstacles = thắng tức thì (giữ v1).

### 4.5 Score & combo
| Sự kiện | Điểm |
|---|---|
| Merge T2 / T3 / T4 | 6 / 16 / 40 (×1.5 nếu Volatile) |
| BREW nổ | +20 (mỗi vụ, chain đếm 1 vụ/frame) |
| Order filled | +30 |
| Philosopher's Stone | +150 |
| Combo chain (merge liên tiếp ≤1.5s, giữ công thức v1) | +5 mỗi nấc ≥3 |
- Best/leaderboard gửi qua SDK (giữ `ScoreStore`, record per mode).

### 4.6 Chiến dịch & đơn hàng
- 30 màn (viết lại `stages.ts`, giữ schema + sao 1-3 + reward powerup + obstacles). Mục tiêu dạng: `target_orb` (đổi tên từ target_fruit), `target_score`, `clear_obstacles`, **`serve_order`** (màn 11+: "Order: 1 Ember + 1 Bubble trước khi hết 18 drops").
- `serve_order`: khi điều kiện đạt, orb tương ứng được "thu hoạch" (biến mất khỏi nồi, bay lên kệ header, KHÔNG tính Stone). Hoàn thành mọi order + mục tiêu phụ → sao.

### 4.7 Obstacles & powerups (reskin, giữ logic)
| v1 | v2 | Ghi chú |
|---|---|---|
| Ice block | **Frozen Slab** | cùng mechanic (tan trong bán kính merge/brew) |
| Wooden Crate | **Crate of Herbs** | 2hp |
| Bubble fruit | **Cursed Orb-in-Bubble** | giữ |
| Hammer | **Crack** (búa gõ tan 1 orb) | inventory rename |
| Bomb | **Blast Powder** | radius 160 giữ |
| Rainbow | **Prism Drop** (merge mọi nhánh, +1 bậc) | giữ |
- Inventory + rewarded continue giữ luật v1 (M3-05/06/07 → PP-05/06/07).

### 4.8 Responsive & input
- Mobile portrait 720×1280 gốc (Scale.FIT pillarbox desktop), vùng chạm ≥44px, Stir/queue nút ≥96px (ràng buộc toàn factory).
- Aspect 9:32→32:9, giữ state khi resize, không khóa orientation.

---

## 5. MÀN HÌNH & DATA-TESTID

| Màn / phần tử | data-testid |
|---|---|
| Start: nút Play / Adventure / Daily / Endless | `start-btn`, `adventure-btn`, `daily-btn`, `endless-btn` |
| Stage select | `level-select`, `stage-<n>`, `stars-<n>` |
| HUD: mục tiêu + drops + score + level | `goal-chip`, `drop-count`, `score-label`, `orders-label` |
| Queue element | `queue-orb-0/1/2`, `element-picker` |
| Nồi + orb | `game-canvas`, `cauldron`, `orb-<element>-<tier>` |
| Heat | `heat-bar-<orbId>` (ẩn khi 0) |
| Stir charges | `stir-charges` |
| Nổ / volatile | `brew-popup`, `volatile-popup`, `combo-popup` |
| Order bay kệ | `order-shelf`, `order-filled-<i>` |
| Stone | `stone-popup` |
| Game over/clear | `final-score`, `best-score`, `retry-btn`, `continue-btn`, `stage-clear`, `next-level-btn`, `star-reward` |
| Pause/mute/lang | `pause-btn`, `mute-btn`, `lang-btn` |
| Record | `record-popup` |

---

## 6. BUSINESS RULES (mã PP-NN)

| ID | Rule |
|---|---|
| PP-01 | Chỉ thả khi chưa game over; cooldown ≥250ms; người chơi CHỌN element từ queue kế tiếp, không random khi thả. |
| PP-02 | Merge 2 orb **cùng nhánh cùng bậc** chạm → bậc+1; khác nhánh cấm merge. T4 không merge tiếp. |
| PP-03 | Game over khi settle VÀ tồn tại tâm orb trên miệng nồi. Không tính khi đang rơi. |
| PP-04 | Sequence queue deterministic theo seed instance đầu phiên (vitest replay được). |
| PP-05 | Rewarded Continue sau game over ≤1 lần/lượt; xóa orb trên vạch; lần 2+ interstitial. Không earned → ở lại, không trừ điểm. |
| PP-06 | Interstitial chỉ game over lần 2+ (không chen lần 1). |
| PP-07 | Best-score + tiến trình màn lưu qua SDK saveData/sendScore; save/load lỗi → mặc định + console, không crash. |
| PP-08 | CẤM mạng ngoài / analytics / ads tự gài. Chỉ Bridge/ytgame SDK qua @game/sdk; gửi Game Ready. |
| PP-09 | Stone fusion: khi ≥1 mỗi loại T4 tồn tại settle → 3 orb hút fusion +150, 1 lần/màn, không phá goal `target_orb` còn thiếu. |
| PP-10 | Heat: T3 +3/s, T4 +6/s (zone 3: ×1.5); T1/T2 không heat. Ngưỡng brew 100. |
| PP-11 | BREW: hủy orb, impulse 140px, phá obstacle lân cận, +20, lan +25 heat cho T3/T4 bán kính 140 (chain). Tối đa 1 vụ nổ/frame. |
| PP-12 | Volatile Merge (cả hai ≥70): ×1.5 điểm, heat về 0. |
| PP-13 | Stir: −60 heat chủ / −30 lân cận 120px; 3 charge/màn, hồi 1/30s; KHÔNG tính lượt thả; tắt charge khi pause. |
| PP-14 | `serve_order`: đúng element+tier, thu hoạch tự động khi settle đạt, bonus +30; Stone = wildcard đã phục vụ. |
| PP-15 | Pause/mute obey tức thì; **âm dừng khi tab minimize** (Playgama UX req); mute + globe chọn ngôn ngữ visible. |
| PP-16 | Bundle initial <30MiB (t<5), file lẻ <512KiB target, tổng <250MiB, load <5s, save <3MiB, KHÔNG nén. (Playgama: ZIP ≤300MB, index.html ở gốc.) |
| PP-17 | Metadata nộp: tên "Potion Panic" (KHÔNG chứa "merge"/"suika"/tên v1); title ≤50; desc EN nêu 3 khác biệt cơ chế; thumb 1:1/5:7/16:9 không branding; khai đúng engine/feature/orientation. |
| PP-18 | UI text tiếng Anh; ngôn ngữ khai báo = ngôn ngữ có thật trong game. |
| PP-19 | Save migration v2→v3 một chiều không mất sao/stage/best; lỗi migration → fresh profile không crash. |

---

## 7. STATE HANDLING

| State | Xử lý |
|---|---|
| Boot | loading bar; font Promise.race 3s (pitfall factory); pre-roll/bridge ad → gửi Game Ready khi play được |
| Queue hết | refill từ seed tiếp; không bao giờ rỗng |
| Heat brew đúng lúc settle/stir/pause | xếp hàng nổ sau settle của frame hiện tại (PP-11) |
| Stir charge = 0 | nút mờ + tooltip "WAIT 30s"; tap không phạt |
| Save/SDK lỗi | silent default + console (PP-07) |
| Resize giữa brew | tween giữ qua resize, state không reset |
| Tab minimize | pause + mute audio ngay (PP-15) |
| Order không thể đạt (hết drops) | Stage Failed với lý do hiển thị + Retry |
| Stone khi đang brew-chain | fusion hoãn tới khi không còn vụ nổ pending |
| Crash/uncaught | FAIL gate (E2E-10) |

---

## 8. TIÊU CHÍ HOÀN THÀNH

1. `pnpm typecheck` 0 lỗi · vitest pass các nhóm GL (TEST-CASES) · `verify_game.sh` pass.
2. Chơi thật browser 9:16 + 16:9: chọn element → merge 3 nhánh, heat lên, brew nổ chain, stir, order bay kệ, Stone fusion — không lỗi boot/đen (QA vision).
3. 30 màn campaign v2 load goals + save migration v2→v3 verified.
4. Bundle Playgama `build/potion-panic-playgama.zip` (index.html gốc, Bridge SDK Game Ready + save hoạt động) + gói ytgame riêng.
5. §9 Anti-Reject Checklist đủ ☑ trước khi bấm Submit.

### ĐIỀU CHỈNH SPEC CŨ (`specs/1-juicy-merge/` đóng băng)
| Spec cũ | Điều chỉnh | Lý do | Mức |
|---|---|---|---|
| SPEC §4 chain trái 12 bậc | → graph 3x4 (`elements.ts`) | clone risk | bắt buộc |
| SPEC §4.5 RNG tier-weighted | → queue 3 element chọn-được | skill depth | bắt buộc |
| SPEC §6 M3-02/04 | → PP-02/04 | delta BR | bắt buộc |
| SPEC §9 stage goals | + `serve_order`; `target_fruit`→`target_orb` | campaign khác biệt | bắt buộc |
| SPEC tên/metadata | → "Potion Panic", EN desc unique | trùng tên + clone | bắt buộc |
| Save schema v2 | → v3 migration | dữ liệu mới | bắt buộc |
| DATA-MODEL §2 | đóng băng, chỉ đọc tham số physics | — | optional |

---

## 9. ANTI-REJECT CHECKLIST (Playgama) — trước khi Submit

- ☐ Tên game trong build == tên khai form; KHÔNG trùng title catalog ("Juicy Merge" đã bị chiếm).
- ☐ Bridge SDK: Game Ready ✓, saveData ✓, no external analytics ✓.
- ☐ Ads: không interrupt giữa drop, rewarded grant đủ thưởng, sound pause khi ad.
- ☐ Mute button ✓, minimize auto-mute ✓, lang globe ✓.
- ☐ Không element UI nào bị cắt ở 9:16/16:9/1:1 (QA boundary).
- ☐ 0 crash/uncaught trong session test.
- ☐ Description + How-to-play EN nêu 3 khác biệt cơ chế (heat/stir, 3-branch + Stone, orders + pickable queue).
- ☐ **Nhắn support chat Playgama** (link có sẵn từ reject): "Rebuilt with new core mechanics — here's a 30s gameplay video, OK to resubmit?" → chờ xác nhận.
- ☐ Không nhắc từ "Suika" ở bất kỳ đâu.
