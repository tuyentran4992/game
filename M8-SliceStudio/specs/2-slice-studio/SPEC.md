# Slice Studio — GAME SPEC (production)

**Stage:** `specs/2-slice-studio/` — sau khi boss GO fun gate PB-2 (verdict "oke vui đó em" 07/09; proto main `ca70e3d`, code `b7ace8e`, live https://slice-studio-playables.netlify.app/).
**Nhiệm vụ stage này:** giữ nguyên mechanic/loop đã GO, thiết kế phần nâng cấp: art pipeline + audio + level-design polish + SDK wiring per-platform + COMPLIANCE Playgama.
**Kênh nộp đích:** Playgama (PB-0) — compliance map ở `E2E-TESTS.md`, nguồn `/data/youtube-playables/docs/PLAYGAMA-TECH-REQ.md` (bản chụp 07/09).
**Anti-clone:** catalog check GO 06/09 + re-check GO 07/09 — 2 bản kề (<3 ngưỡng PB-5): Perfect Half (kéo đường THẲNG cắt đôi 50/50 — khác verb điều khiển + cấu trúc level) và Soap Cutting ASMR (carve tự do, không đo sai số). Khác biệt hóa giữ nguyên trong production: trace-path quanh silhouette + % sai số đo được + no-go zone + GHOST CUT streak.

---

## 0. FREEZE ĐÃ CHỐT (không đàm phán — copy từ card B1, nguyên văn)

| Module | Cam kết |
|---|---|
| `game/src/geom/path.ts` | bit-identical — KHÔNG sửa |
| `game/src/geom/slice.ts` | bit-identical — KHÔNG sửa |
| `game/src/core/scoring.ts` | bit-identical — KHÔNG sửa |
| `game/src/core/engine.ts` | bit-identical — KHÔNG sửa |
| `game/src/__tests__/tierA.test.ts` | 22/22 PASS, không sửa, không nới assert |
| Cấm | split polygon thật (clipper/greiner-hormann — vẫn dùng poly cắt tĩnh như proto), đổi verb trace-cut, network ngoài SDK, ads/IAP |

Hệ quả cho mọi subcard: tính toán game (score/coverage/no-go/streak) chạy đúng như proto; muốn đổi CẢM GIÁC chỉ được chạm render/audio/level data/UI/SDK — không được đổi chữ ký hàm hay công thức trong 4 file trên.

## 1. MỤC ĐÍCH GAME (1 câu)

Người chơi dùng một ngón tay trượt dọc theo đường mờ để "dao cắt" tách đôi hình — chính xác càng cao, phần chia càng đẹp, và lộ ra bí mật bên trong hình.

**Pillars (không nhượng bộ, mọi quyết định đo bằng đây):**
1. **Một cú kéo thỏa mãn** — từ lúc chạm tới lúc tách đôi phải cảm giác như cắt thật (âm + hạt + nửa hình rời nhau), feedback <100ms.
2. **Sự chính xác được nhìn thấy** — % hiện to, GHOST CUT ≥95% là danh hiệu muốn khoe, không phải con số vô tri.
3. **Mỗi chương đưa một quyết định mới** — thẳng → lõi ẩn → cong → cấm vùng: bộ xương giữ, nội dung đổi (PB-3b).

## 2. CORE LOOP 3 TẦNG

### 2.1 Moment-to-moment (0–30s, 1 lần cắt)
1. Chạm gần đầu đường mờ → magnet hút vào điểm bắt đầu (bán kính bắt đầu 90px, magnet 48px — hút từ chạm lệch tới đúng path, không kéo ngang quá xa).
2. Kéo dọc path: đường trắng sáng theo tay, độ lệch hiển thị bằng màu (đúng = sáng, lệch = xỉn dần — render, không đổi logic).
3. Đến cuối: nhả tay → whoosh + snap theo % (âm sáng hơn khi chính xác), nửa hình tách đôi lùi 2 phía, % hiện to giữa màn.
4. ≥ ngưỡng 1★ → tách đôi thành công; < ngưỡng → hình ráp lại, "keep-going", thử lại ngay (không hình phạt, không chờ).

Lỗi trạng thái ở tầng này (game phải không bao giờ kẹt):
- Chạm xa path (ngoài 90px từ điểm bắt đầu) → stroke bị bỏ qua, path gợi ý nhấp nháy 1 lần — người chơi hiểu "bắt đầu từ đầu đường", không chết oan.
- Nhả sớm giữa đường → KHÔNG fail (luật onboarding), chỉ cap 1★; % vẫn hiện để người chơi so mình-so-path.
- Chạm vùng đỏ (M4) → cắt đứt tại đó: "CHUNK LOST", 0★ nhưng score vẫn hiện, nút retry 1 chạm.
- Nhả ngay mép vùng đỏ → vào trạng thái `mid` (hold): path giữ nguyên, gợi ý "resume sau vùng đỏ" — nhả-tiếp-kéo là quyết định chủ đích, không phải lỗi.

### 2.2 Session (5–15', 1 chain 12 level)
- 12 level theo 4 chương, mỗi level 1 hình mới + 1 biến đổi (bảng §4). Chuỗi GHOST CUT liên tiếp (streak) giữ xuyên level tới lần cắt đầu tiên dưới 95%.
- Thắng level = ≥1★ → next; 0★ → retry vô hạn (không paywall, không mạng, không time-out).
- Kết session: màn End với tổng sao 36 tối đa + dòng streak dài nhất; nút "Play Again" quay L1.
- Một ván đầy đủ ~6–10' (12 level × ~30–50s), khớp mô hình play ngắn khi chờ xe/tép.

### 2.3 Long-term (giờ–tuần)
- **Master file mỗi level** (sao + % cao nhất lưu qua SDK storage — mục 5): 36★ là điểm hoàn hảo cần quay lại; % cá nhân kỉ lục là "đường cong phụ" cho người muốn luyện tay.
- **GHOST CUT full-run** (12/12 level ≥95% không đứt streak) = danh hiệu hiếm nhất — hiển thị vĩnh viễn trên End screen.
- Chưa có trong proto, KHÔNG thêm ở stage 2 trừ khi boss gật: daily, leaderboard, shop skin. (PB-5: không tự nhét IAP/ads; meta progression thuộc `@game/meta` nếu sau này cần — ngoài phạm vi SPEC này.)

## 3. MECHANIC — CHUẨN GDD (mục đích / cảm giác / input / output / điều kiện / lỗi / edge / levers)

### 3.1 Trace (động từ chính)
- **Mục đích:** biến cử chỉ kéo tay thành đường dao cắt.
- **Cảm giác mong muốn:** đường theo tay hơi "dính" vào rãnh (magnet) — đủ dễ để khó chịu vì tay rung, không đủ dễ để buồn chán.
- **Input:** 1 pointer duy nhất (touch/mouse). Pointer thứ 2 bị engine bỏ qua (multi-touch không phá state).
- **Output:** chuỗi điểm thô append vào stroke hiện hành (điểm cách nhau ≥2px); engine chuyển phase `idle → drawing`.
- **Điều kiện hoạt động đúng:** bắt đầu trong START_RADIUS=90px quanh path[0]; đang `drawing` thì begin()=false.
- **TRẠNG THÁI LỖI:** chạm ngoài → false (stroke không mở); pointerup khi `idle`/`mid` → không gì xảy ra; mất pointer (đút túi, gesture Safari) → pointerup bắt được thì score bình thường, không bắt được thì scene khôi phục bằng nút retry (edge-case iOS — test ở E2E-TESTS.md mục C-Stability).
- **Edge cases:** path là đường thẳng nằm ngang (L1) — resample 96 điểm đều; path cong khép gần (arc) — điểm cuối lệch đầu; multi-stroke M4 — mỗi stroke smooth/resample RIÊNG, cấm lerp bắc cầu qua khoảng nhả (nếu lerp thì điểm giả xuất hiện trong vùng đỏ — test neo đã khóa trong tierA).
- **Tuning levers:** `START_RADIUS` (90px), `MAGNET_RADIUS` (48px), min-gap 2px/điểm. Mọi đổi phải quay lại test tierA + 1 vòng boss tay.

### 3.2 Scoring (sự thật bằng số — freeze)
- **Mục đích:** đổi độ chính xác vật lý thành % một con số công bằng, khó Cheat và dễ hiểu.
- **Cảm giác:** % cao = hình chia đẹp; chunk lost = tiếc của, không bực (retry nhanh).
- **Input:** strokes thô + reference path + options (noGo, wobbleWeight, strokes, excludeIdx).
- **Output:** `{pct, coverage, meanDev, wobble, noGoHitAt, releasedEarly}` — công thức freeze: `pct = round(coverage × (60 + 40 × devFactor) × (1 − wobblePenalty))`, `wobblePenalty = min(0.25, (wobble/400) × wobbleWeight)`.
- **Tham số chuẩn (freeze):** tolerance 26px · samples 96 · smoothWindow 5 · noGoMargin 18px · endZone 56px.
- **Điều kiện đúng:** clean skip vùng đỏ (nhả trước, kéo sau, không chạm) → vùng đỏ loại khỏi mẫu số coverage; dirty skip (chạm đỏ) → tính vào, thành "chunk lost".
- **Lỗi/edge:** trace <6 điểm → 0% "keep-going"; path <2 điểm → 0%; tất cả gần-đường rỗng → meanDev = 2×tolerance (pct về 0, không NaN — test neo).
- **Tuning levers:** CHỈ qua `wobbleWeight` per-level (1.5/1.75/2 — đã dữ) + thresholds per-level; tolerance/samples là freeze.

### 3.3 Stars & GHOST CUT
- **Mục đích:** tần số feedback rõ ràng + danh hiệu hiệu năng cao.
- **Input:** pct + flags (releasedEarly, noGoHit) + thresholds level.
- **Output:** stars 0–3, `ghost` boolean, label ('perfect'|'great'|'good'|'chunk-lost'|'keep-going').
- **Công thức freeze:** noGoHit → 0★ 'chunk-lost'; pct ≥ t1/t2/t3 → 1/2/3★; nhả sớm cap 1★; ghost = pct ≥ 95 VÀ 3★ VÀ không nhả sớm. Streak: ghost → +1, không → reset 0.
- **Cảm giác:** 'perfect' chime + vệt sáng dọc vết cắt; streak ≥2 → âm GHOST khác hẳn (nghe thấy mình đang "on fire").
- **Edge:** level M2 có t3=95 → 3★ = GHOST CUT luôn (precision rewarded đúng thiết kế); 0★ vẫn hiện % để so tiến bộ.
- **Tuning levers:** thresholds per level (mảng [t1,t2,t3]); GHOST_PCT=95 là freeze.

### 3.4 Forbidden segment (M4 — quyết định "nhả–tiếp")
- **Mục đích:** đưa quyết định đầu tiên KHÔNG phải về tay nghệ — mà về thời điểm: nhả trước vùng đỏ hay liều.
- **Cảm giác:** căng nhẹ khi tới gần đỏ; nhả đúng mép = "đường mại"; nhảy qua = thành thạo.
- **Input:** vị trí nhả tay gần mép đỏ (≤80px từ điểm đầu vùng) VÀ không chạm đỏ → vào `mid`; chạm đỏ → chunk lost ngay.
- **Output:** phase `drawing → mid` (attempt chưa commit) → chạm lại gần path (≤76.8px = 1,6×MAGNET_RADIUS) → tiếp tục `drawing` → nhả lần 2 → score với excludeIdx (clean skip) hoặc để hit.
- **Điều kiện đúng:** vùng đỏ KHÔNG phủ đầu/cuối path (validate `a>1 && b<94` trên 96 điểm — đã có trong validateLevels); độ phủ đỏ 9,4–11,5% path (đo, xem §6).
- **Lỗi/edge:** nhả xa mép đỏ (đứng quá sớm) → early release thường (cap 1★, không phải fail); kéo ngược đầu path trong `mid` → vẫn tính 1 stroke mới, score tổng vẫn đúng (multi-stroke freeze); nhả LẦN 2 trong `mid` chưa vẽ gì thêm → trace <6 điểm → keep-going.
- **Tuning levers:** `NOGO_STOP_ZONE` 80px, resume snap 1,6×MAGNET (freeze trong engine); toạ độ [from,to] đỏ per-level.

### 3.5 Magnet & onboarding không chữ
- **Mục đích:** dạy verb "kéo dọc đường" chỉ bằng phản hồi hình/âm — không text (mọi ngôn ngữ chơi được, PB-5 EN nhưng prototype-go quyết định này giữ).
- **Cảm giác:** cú chạm đầu "bị hút" vào đúng chỗ — người chơi không bực vì đầu vào sai.
- **Input:** pointerdown trong 90px; **Output:** điểm bắt đầu snap vào path[0], magnetUsed=true.
- **Lỗi:** chạm ngoài 90px → stroke bị bỏ (mục 3.1); level mới → magnet lại hoạt động bình thường.
- **Tuning levers:** START_RADIUS, MAGNET_RADIUS (freeze số, có thể retune sau playtest với [PLACEHOLDER] mới — không trong stage 2).

### 3.6 Audio (WebAudio synth thuần — freeze động cơ, nâng cấp tầng cảm)
- **Mục đích:** feedback <100ms + dấu hiệu GHOST CUT (pillars 1,2).
- **Nguyên tắc production:** giữ `Synth` WebAudio thuần (0 file audio, 0 decoder, 0 system player — đúng compliance Playgama "KHÔNG system player"); nâng cấp = thêm voice (strum rời nửa hình, chunk buzz giàu hơn, ambience nhẹ per chương), KHÔNG đổi class API hiện có trừ thêm method mới.
- **Unlock:** AudioContext tạo trong pointerdown đầu tiên (autoplay policy mọi browser); nếu bị suspended → resume cũng trong gesture.
- **Lỗi/edge:** thiết bị không có AudioContext (hiếm) → mọi voice no-op, game vẫn chơi được 100% (âm không phải điều kiện thắng).
- **Tuning levers:** gain master 0.5, tham số voice trong config audio mới (S3) — không hardcode rải scene.

## 4. BẢNG BIẾN ĐỔI TRONG VÒNG LẶP (PB-3b — bắt buộc, cột 3 ĐÃ ĐIỀN)

**Định nghĩa vòng lặp (boss 07/09):** vòng lặp = sự lặp lại CÓ THAY ĐỔI bên trong. Bộ xương giữ nguyên (người chơi làm chủ), nội dung biến dần theo mốc, mỗi biến mở một quyết định mới.

| (1) Gì lặp y nguyên (bộ xương) | (2) Gì đổi (nội dung/áp lực/quyết định) | (3) Đổi theo mốc nào — **ĐÃ ĐIỀN** | (4) Mỗi đổi mở ra quyết định gì cho người chơi |
|---|---|---|---|
| Verb trace-cut: chạm gần đầu đường → kéo dọc path → nhả → tách đôi → % → sao | ĐẠO CẮT VẬT LÝ: path thẳng ↔ cong ↔ có vùng cấm; cách tính điểm biến đổi theo | **L1–2** path thẳng (độ nghiêng tăng) — học verb, 0 ràng buộc; **L3–5** lõi ẩn reveal (3★ = 95% — như GHOST); **L6–9** path cong + wobbleWeight ×1.5→×2 phạt tay rung; **L10–12** forbidden segment ở giữa path (9,4→11,5% độ phủ) buộc nhả–tiếp | L1–2: định nhịp tay, kéo nhanh chậm thế nào cho % cao. L3–5: đánh đổi kéo nhanh (dễ lệch) vs kéo chậm (được chính xác 95% để thấy lõi). L6–9: đi đường cong phải dự đoán hướng trước tay, giữ vận tốc đều để wobble thấp — quyết định "đi chắc hay đi nhanh". L10–12: quyết định NHẢ ở đâu trước vùng đỏ (đủ sát mép để không mất % đầu-cuối) + khi nào chạm lại sau đỏ; chọn "liều băng qua" (mất 1 khúc 0★) vs "an toàn nhả–tiếp" (giữ 3★) |
| Màn hình 1 lề: silhouette giữa, path mờ, HUD % + streak | Hình silhouette + chủ đề màu per chương + hình lõi reveal | 4 chương 4 palette (xanh dương → tím → xanh lá → đỏ cam), L3 táo/tím, L12 sao vàng cuối | Không phải quyết định gameplay nhưng mở quyết định CON NHÌN: "hình này cắt đường nào đẹp nhất" — mỗi hình mới là câu đố hình học mới dù verb đã thành thục |
| Chuỗi GHOST CUT streak xuyên level | Ý NGHĨA streak đổi theo chương: từ danh hiệu kỹ thuật (thẳng) thành chiến công điều khiển (cong + cấm vùng) | Streak khó giữ dần: L3–5 phải 95% chính xác tuyệt đối; L10–12 phải clean-skip vùng đỏ mới còn ghost | Người chơi quyết định kiểu chơi: đánh an toàn lấy 3★ đều vs đánh liều giữ streak xuyên suốt 12 level (full-run ghost) |

Kiểm tra án lệ 4.6 (Skip King): cột 3 có 4 mốc đã điền, mốc sớm nhất L1→L2 đã mở quyết định mới (nghiêng đường thẳng). Vòng lặp KHÔNG rỗng.

## 5. ĐIỂM THẮNG/THUA + TINH KUY "CHẾT OAN"

- **Thắng level:** ≥ t1 (55%) → level kế. **Thắng run:** qua L12 → End screen (tổng sao + streak max).
- **Thua:** KHÔNG có trạng thái thua vĩnh viễn — retry vô hạn, không đếm lượt, không time-out. "Thua" duy nhất là nhận ít sao hơn.
- **Cấm chết oan (ROLE-RULES + án lệ M1):**
  1. Level đầu (L1) KHÔNG THỂ 0★ nếu người chơi kéo hết path trong tolerance cơ bản — path thẳng 440px ngang, magnet 90px, tolerance 26px đủ rộng; smoke bot 10 run người mới phải qua (PB-3b onboarding smoke).
  2. 30 giây đầu không có yếu tố phạt nào ngoài % (L1-2 không wobble, không no-go — đúng bảng §4).
  3. Không bao giờ yêu cầu timeout/quick reflex — mọi quyết định là hình học, người chơi có vô hạn thời gian quan sát trước khi chạm.
  4. Nhả sớm không fail (cap 1★) — đã freeze trong engine.

## 6. DIFFICULTY CURVE BẰNG SỐ (đo thật từ data level, không bịa)

Nguồn: python port đúng công thức levels.ts @`ca70e3d` (bằng chứng trong thread card B1). Canvas 720×1280, path nằm vùng y 260–820.

| Lv | Tên | Chương | Độ dài path (px) | Tổng góc rẽ (rad) | Góc rẽ lớn nhất | wobbleWeight | Ngưỡng 3★ | Vùng đỏ (% path) | Cảm nhận khó mới |
|---|---|---|---|---|---|---|---|---|---|
| 1 | First Slice | 1 | 440 | 0.00 | 0° | — | 90 | — | baseline: đường ngang |
| 2 | Diagonal Drop | 1 | 505 | 0.00 | 0° | — | 90 | — | +15% dài, nghiêng 34° |
| 3 | Apple Secret | 2 | 330 | 2.11 | 5°/bước | — | **95** | — | cong arc + đòi precision (3★=95%) |
| 4 | Clockwork | 2 | 301 | 2.41 | 6° | — | **95** | — | cong ngược chiều |
| 5 | Ball Game | 2 | 494 | 1.79 | 6° | — | **95** | — | cong 1 chiều dài nhất chương |
| 6 | First Curve | 3 | 493 | 1.62 | 5° | **1.5** | 90 | — | wobble bật: tay rung bị phạt |
| 7 | S-Curve | 3 | 528 | 2.52 | 8° | **1.75** | 90 | — | đổi hướng giữa đường |
| 8 | Half Moon | 3 | 509 | 2.73 | 6° | **2** | 90 | — | cong đều dài, kỷ luật vận tốc |
| 9 | Double Bend | 3 | 499 | 1.61 | **13°** | **2** | 90 | — | góc rẽ đột biến (trưởng nhất M3) |
| 10 | Forbidden Line | 4 | 460 | 0.00 | 0° | — | 90 | 9.4% | quyết định nhả–tiếp xuất hiện |
| 11 | Forbidden Curve | 4 | 504 | 2.57 | 9° | — | 90 | **11.5%** | cong + cấm vùng cộng dồn |
| 12 | Grand Finale | 4 | 497 | 2.66 | 10° | — | 90 | **11.5%** | S-curve + đỏ giữa + reveal cuối |

**Đọc curve:**
- Khó tăng theo 3 trục KHÔNG đồng thời: (a) hình học path (dài + cong), (b) quy tắc tính điểm (precision/wobble), (c) ràng buộc thao tác (vùng đỏ). Mỗi chương chỉ thêm 1 trục — không bao giờ 2 trục mới cùng lúc → không bị "cú đá đầu chương".
- Các mốc ngoặt: L2→L3 (thẳng→cong, +precision), L5→L6 (wobble bật ×1.5), L9→L10 (thêm vùng đỏ — trục mới cuối, mức 9.4% nhẹ vì path L10 THẲNG: khó về quyết định, không về tay).
- Độ phủ đỏ tăng 9.4→11.5% chỉ trong chương cấm vùng, path cong tăng tương ứng — áp lực cộng dồn nhưng t1/t2/t3 GIỮ NGUYÊN 55/75/90 (trừ M2=95) → con số sao không phải cần "giỏi hơn" để qua, mà cần "chọn khôn hơn".
- **[PLACEHOLDER]** ngưỡng 55/75/90/95 là số đã dữ từ proto qua fun gate; sau playtest 20 người thật có thể retune qua mảng `thresholds` (chỉ data level, không chạm scoring.ts).

**Curve rollback nếu boss thấy nhảy vọt:** chỉ được điều trong `levels.ts` (data) hoặc thêm level trung gian vào chương — không được sửa công thức điểm.

## 7. LEVEL-DESIGN POLISH (S2 — đúng freeze)

- 12 level giữ nguyên path/shape/core/noGo/thresholds NGUYÊN (đã qua fun gate) — polish = phần QUANH: đặt tên hiện đã EN ('First Slice'…), thêm câu đố hình học phụ (mục tiêu phụ per level:vd "clean skip" trên L10 = huy hiệu nhỏ), không thêm level mới trong stage 2 trừ khi boss gật (mục 6 rollback).
- Thêm vào data-level các field HIỂN THỊ không đụng logic: `flavor` (tên phụ EN ≤3 từ: "Apple Secret — Hidden Star"), đặt trong config S2, dùng HUD hiển thị — pure data, không chạm engine.

## 8. SDK WIRING PER-PLATFORM (tóm tắt — chi tiết DATA-MODEL.md)

- 1 source → 4 đích theo `@game/sdk` có sẵn (PB-0): Reddit Devvit → Playgama Bridge → ytgame/Mediacube → Mock local. KHÔNG viết adapter kênh mới.
- Việc S4: cắm `initialize/saveData/loadData` 3 điểm — lưu `unlockedLevel`, `stars per level`, `bestPct per level`, `bestStreak` (schema DATA-MODEL.md §2). Mock local dùng localStorage cùng schema.
- Bundle Playgama KHÔNG chứa Bridge của kênh khác (PB-5); không analytics, không URL-lock (E2E-TESTS.md C-3/C-4).

## 9. PHẠM VI NÂNG CẤP STAGE 2 → SUBCARD (đã chia ở parent t_e3f3bb6d)

| Subcard | Phạm vi | TDD | Không đụng |
|---|---|---|---|
| S1 art | sprite/atlas thay đồ họa Graphics, theme 4 chương có chủ đích | B | engine/scoring/geom |
| S2 level polish | flavor text, mục tiêu phụ, chuẩn hoá data hiển thị | A | công thức điểm |
| S3 audio | voice mới + config audio + ambience per chương | B | API Synth hiện có (chỉ thêm) |
| S4 SDK | wiring 3 điểm + save schema + Mock | B | engine/geom/scoring |
| S5 UX/copy | HUD text EN, End screen, popup có nút đóng | B | logic |
| S6 PB-3 gate | verify 4 rào + boot + compliance pre-submit | B | mọi module logic |

Mọi subcard: đụng file nào liệt kê trong DATA-MODEL.md §4 (ranh giới contract); 4 file freeze không nằm trong vùng chạm của subcard nào.
