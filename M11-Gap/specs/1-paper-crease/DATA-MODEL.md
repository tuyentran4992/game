# M11 Paper Crease — DATA-MODEL (cấu trúc dữ liệu thuần; không code chạy được)

> **Nguồn sự thật:** `SPEC.md` (rule PC-01..PC-20) + `retention/P1..P4.json` (số neo). File này **không** đặt rule mới; mọi con số hoặc lấy từ hai nguồn trên, hoặc đánh dấu ⚠️ PLACEHOLDER (số tuning chờ duyệt, mô phỏng đúng cách P3-01 để `unverified`).
> **Nguyên tắc cứng của module:** game offline, **0 call mạng** (PC-15). Toàn bộ dữ liệu chỉ có 3 dạng: **Save** (SDK storage, có version + migrate, PC-16) · **Config** (file tĩnh đóng trong bundle, chỉ đọc) · **Log event** (ring-buffer ≤100KB, P4-06). Đề bài **không nằm ở đâu cả** — sinh từ seed mỗi lần chơi (PC-02).
> Ngôn ngữ: tiếng Việt · trình bày: bảng + ASCII, không code TS/JS/SQL.

---

## 0. SƠ ĐỒ DỮ LIỆU TỔNG QUAN

```
                    ┌─────────────────────────────────────────────┐
                    │  CONFIG (tĩnh, đóng trong bundle — chỉ đọc) │
                    │  config/chapters.json  8 chương × 15 màn    │
                    │  config/skins.json     8 skin + giá         │
                    │  config/stars.json     luật sao 1–3 (PC-06)│
                    │  config/album.json     ≤14 mẫu + ≤6 huy hiệu│
                    │  config/folds.json     bảng tra kiểu gấp H/V/D│
                    └───────────────┬─────────────────────────────┘
                                    │ tham số sinh đề
                                    ▼
   seed = hash(gameId + levelIndex)  ← hằng số, không phụ thuộc thời gian (PC-02)
                                    │
                                    ▼
                    ┌─────────────────────────────────────────────┐
                    │  LEVEL SPEC (runtime, trong RAM)            │
                    │  hàm thuần levelSpec(seed) → đề 1 màn        │
                    │  KHÔNG persist — discard khi rời màn (PC-02)│
                    └───────────────┬─────────────────────────────┘
                                    │ tương tác (chọn 1/4, hint, undo)
                                    ▼
        ┌──────────────────────────────────┐   ghi khi kết quả chốt
        │  SAVE  (SDK storage)             │ ◄───────────────────┐
        │  m11.save      — object chính,   │                     │
        │                   schema version,│   đọc lúc boot       │
        │                   ≤100KB (PC-16) │ ────────────────────┘
        │  m11.save.good — bản mirror write│
        │  m11.wardrobe  — skin/album đã   │
        │                   mua (append-only, chống mất khi save hỏng)
        └──────────────┬───────────────────┘
                       │ mỗi event rời vòng chơi thường
                       ▼
        ┌──────────────────────────────────┐
        │  LOG EVENT (ring-buffer ≤100KB)  │  export JSONL thủ công
        │  m11.log — 1 dòng/event, tự đẩy  │  ──► Python QA tính funnel
        │  event cũ nhất khi tràn (P4-06)  │      /phiên/D1 local (P4-01/05)
        └──────────────────────────────────┘
```

| # | Data block | Nơi sinh | Nơi tiêu thụ | Persist? |
|---|---|---|---|---|
| D1 | Config chapters/skins/stars/album/folds | người vận hành (spec này) | generator + UI + validator | chỉ đọc trong bundle |
| D2 | Seed màn | công thức `hash(gameId+levelIndex)` | generator | không — tính lại mọi lúc |
| D3 | Level spec (đề 1 màn) | generator thuần | scene PLAY + validator PC-03/04 | **KHÔNG** (PC-02) |
| D4 | Save (object có version) | game runtime | SDK storage save/load | có (PC-16) |
| D5 | Wardrobe (skin/album đã mua) | game runtime | SDK storage | có, append-only (bảo đảm vế "không mất skin đã mua" của PC-16) |
| D6 | Log event ring-buffer | logger duy nhất | dev/QA đọc qua console, export JSONL | có, vòng tròn ≤100KB (P4-06) |

---

## 1. SAVE SCHEMA — một object JSON có `version`, ≤100KB thực tế (PC-16)

### 1.1 Nguyên tắc

1. **Chỉ lưu id + counter + chuỗi nén** — không ảnh, không base64, không lịch sử move, không đề bài (P3 meta: "Save <3MB — chỉ id + counter, không ảnh"; thực tế mục tiêu ≤100KB theo PC-16).
2. **Đề bài không nằm trong save**: cùng `level_index` ⇒ cùng đề cho mọi thiết bị, vì `seed = hash(gameId + levelIndex)` là hằng số (PC-02). Save chỉ giữ *kết quả* chơi màn đó (sao, ghost, tường).
3. **Tiến trình là dữ liệu suy ra được từ sao**: không lưu "màn đã khóa/mở" riêng — cửa mở chương tính lại từ `stars` + gate 12/15 (PC-07).

### 1.2 Khóa storage (SDK storage, tất cả nằm gọn trong quota <3MB của nền tảng)

| Khóa | Nội dung | Kích thước mục tiêu | Vai trò |
|---|---|---|---|
| `m11.save` | object chính, schema `version` | ≤30KB thường dùng | toàn bộ tiến trình + kinh tế |
| `m11.save.good` | mirror bản hợp lệ kế trước | bằng `m11.save` | phao khi save chính hỏng (PC-16) |
| `m11.wardrobe` | danh sách id đã mua/mở (skin, album, huy hiệu), chỉ append | ≤1KB | bảo chứng "save hỏng cũng không mất skin đã mua" (PC-16) |
| `m11.log` | ring-buffer event JSON (§5) | **≤100KB cứng** | QA/funnel offline (P4-06) |

### 1.3 Bảng field của `m11.save`

| Nhóm | Field | Kiểu | Mặc định | Ghi chú (rule nguồn) |
|---|---|---|---|---|
| định danh schema | `version` | int | `1` | schema hiện hành = 1 (§2); bắt buộc theo PC-16 |
| | `rev` | int | 0 | bộ đếm số lần ghi — dùng chống ghi đè (§7.2) |
| ngày tháng | `first_play_date` | chuỗi YYYY-MM-DD | null | gốc tính "local D1" (P4-05) |
| | `dates_played` | list[chuỗi date] dedupe | [] | mảng ngày đã chơi, trần 365 phần tử ≈ 365 byte/năm (P4-05) |
| | `last_played_date` | chuỗi date | null | để dedupe `dates_played` khi ghi |
| tiến trình | `best_level` | int 1–120 | 1 | màn cao nhất từng đạt (120 màn = 8 chương × 15, PC-01) |
| | `current_level` | int 1–120 | 1 | điểm tiếp tục chơi = "phong bì chưa mở" của cliffhanger P4-05; chỉ cần số màn vì đề sinh lại từ seed |
| | `stars` | chuỗi nén 120 ký tự '0'–'3' | 120×'0' | sao TỪNG màn: 1=thắng · 2=thắng không hint · 3=thắng ngay lần đầu · 0=chưa chơi/bị bỏ (PC-06, P1-03); 1 ký tự/màn ⇒ 120 byte |
| | `chapter_seals` | chuỗi nén 8 ký tự '0'/'1' | 8×'0' | mộc "full 3 sao chương" chỉ cấp ở vòng Master (P1-06); suy ra được từ `stars`+`master_stars` nhưng lưu để map vẽ nhanh |
| kinh tế | `ink` | int ≥0 | 0 | Mực Gấp; +theo số sao & streak khi thắng, tiêu ở shop — **không** đổi bằng tiền thật (PC-11, P3-01) |
| | `skins_owned` | list[id] | [skin-mặc-định] | ⊆ 8 id trong config/skins.json (PC-11); **bản sao đọc-nhanh**, nguồn thật là `m11.wardrobe` |
| | `skin_equipped` | id | skin-mặc-định | đang dùng; đổi = 2 click (§3.2 SPEC) |
| sưu tập | `album_items` | list[id] ≤14 | [] | mẫu giấy đã mở bung bằng đoán đúng (PC-12, P3-02) |
| | `badges` | list[id] ≤6 | [] | huy hiệu chương, mở theo block khép chương (PC-12, P3-02) |
| kỷ lục | `ghost` | map màn→chuỗi nén | {} | **chuỗi quyết định lần chơi tốt nhất**: mỗi lượt đoán chọn ô nào + timestamp tương đối, ~40–80 byte/màn (P2-01); chỉ ghi cho màn đã clear ≥1 lần; phá ghost ⇒ đè ghost cũ |
| | `wall` | map màn→list top-5 | {} | tường LOCAL: 5 lượt chơi tốt nhất mỗi màn, mỗi lượt = (thời gian giây, số lần sai) — ≈14 byte/entry (P2-03) |
| | `streak_best` | int | 0 | streak đoán đúng liền mạch **trong một phiên** dài nhất mọi thời đại (P2-02); chuỗi hiện tại KHÔNG lưu — reset khi sai hoặc tắt game |
| | `ghost_beat_count` | int | 0 | counter phá ghost, phục vụ đo retry-rate (P2-01 how_measured) |
| | `plays_count` / `clears_count` | int | 0 | tổng lượt chơi / tổng lượt clear — suy ra retry-rate = plays/clears (P2-01) |
| endgame | `campaign_completed` | bool | false | cờ về đích 120 màn → end screen khai báo hết nội dung, bắt buộc cho Playables (PC-18, P1-06) |
| | `master_unlocked` | bool | false | mở vòng Master: chơi lại 120 màn không hint không timer (PC-18) |
| | `master_stars` | chuỗi nén 120 ký tự | 120×'0' | sao riêng của vòng Master, giữ nguyên `stars` campaign (P1-06) |
| cài đặt | `sound_on` | bool | true | tôn trọng mute nền tảng + nút mute riêng (PC-17) |
| | `language` | id chuỗi | `en` | UI mặc định EN, điểm cắm i18n — field sẵn cho bản dịch sau, chưa dùng (PC-19) |
| onboarding | `funnel_done` | bool | false | đã đi qua funnel màn 1 (level1_shown→unfold_seen, P4-01) — khỏi log lại funnel của tutorial |

### 1.4 Ví dụ một save giữa game (mô tả, không code)

Người chơi đã tới màn 23 (chương 2), 3 phiên, từng xem 1 rewarded hint:

| Field | Giá trị minh họa |
|---|---|
| `version` / `rev` | 1 / 47 |
| `best_level` / `current_level` | 23 / 23 |
| `stars` | 22 ký tự đầu đầy 3, ba ký tự '0' sau đó → "1 chương rưỡi gần full sao" |
| `ink` | 64 (sau khi đã mua 1 skin giá PLACEHOLDER §3.2) |
| `skins_owned` / `skin_equipped` | [skin-mac-dinh, skin-ke-o] / skin-ke-o |
| `album_items` / `badges` | 5 mẫu / 0 (chưa khép block nào) |
| `ghost` | 22 mục, ≈1.5KB tổng |
| `streak_best` | 8 (chạm mốc 8, P2-02) |
| `dates_played` | 3 ngày lịch liền nhau → dữ kiện local D1 = 100% cho thiết bị này |

### 1.5 Những thứ **KHÔNG BAO GIỜ** nằm trong save

| Không lưu | Vì sao |
|---|---|
| Đề bài / seed từng màn | seed = hash hằng số, sinh lại y hệt (PC-02); lưu vào là phản tác dụng dung lượng |
| Trạng thái giữa màn (đã chọn ô nào lúc chưa chốt) | một lượt chọn = kết quả ngay (PC-05); không có "save giữa màn" |
| Streak hiện hành của phiên | định nghĩa là reset khi tắt game (P2-02) — lưu vào là sai luật |
| Mã chia sẻ seed + điểm (GAP-…-SCORE) | tính ra từ màn + thành tích mỗi lần bấm Chia sẻ, không cần persist (P2-04) |
| Ảnh kết quả canvas | snapshot sinh tại chỗ khi bấmSao chép/Tải ảnh (P2-05) |
| Danh sách màn đã khóa | suy từ `stars` + gate ~12/15 (PC-07) |

### 1.6 Ngân sách dung lượng `m11.save` (trần cứng ≤100KB, PC-16)

| Thành phần | Ước worst-case |
|---|---|
| `stars` + `master_stars` + `chapter_seals` (chuỗi nén) | 250 B |
| `ghost` 120 màn × ≤80 B (P2-01) | ≈9.6 KB |
| `wall` 120 màn × 5 entry × ≈14 B (P2-03) | ≈8.4 KB |
| `dates_played` 365 × 11 B (P4-05) | ≈4 KB |
| các list id + int + bool còn lại | ≈2 KB |
| **Tổng hai chiều (save + mirror riêng biệt)** | **≈25 KB ≪ 100 KB** |

Cách giữ dưới ngưỡng khi về già: (a) ghost/wall chỉ ghi cho màn đã chơi ≥2 lần; (b) `wall` cắt entry thừa khi hàng đợi một màn >5; (c) `dates_played` xoay vòng trần 365 (giữ 365 ngày gần nhất); (d) mọi list id có trần = số phần tử config (8/14/6) nên không thể phình.

---

## 2. LUẬT VERSION + MIGRATE (PC-16)

### 2.1 Version hiện hành

`version = 1`. Đây là schema của §1.3. sdk load/save chỉ chạm object này, không có DB.

### 2.2 Quy tắc khi schema đổi (thêm/bớt field)

1. **Chỉ thêm, không đổi tên, không đổi kiểu** trong cùng một field. Muốn đổi hình dạng ⇒ tạo field mới + hàm migrate ánh xạ cũ→mới, field cũ giữ nguyên trên đĩa (forward-compatible: field lạ chưa biết thì **giữ nguyên**, không xóa).
2. Mọi thay đổi hình dạng save ⇒ **tăng `version` lên 1** và phải có **hàm migrate mô tả được** chạy theo chuỗi: `v1→v2→v3…` (đọc bản cũ, điền default cho field mới, không đụng dữ liệu người chơi đã tạo). Ví dụ luật: thêm field `master_stars` ở v2 ⇒ migrate v1→v2 chỉ ghi thêm chuỗi '0' mặc định; `skins_owned`, `album_items`, `badges` **đang có giá trị nào giữ nguyên giá trị đó** — cấm để migrate làm mất skin đã mua (PC-16 nghiệm thu đúng ca này).
3. Migrate chạy **một lần lúc boot**, sau đó ghi lại save ở `version` mới; nếu migrate giữa chừng lỗi ⇒ bỏ kết quả, quay về nhánh cứu hộ §2.3, **không crash, không khóa màn** (tinh thần M2-08 của nhà: load/save lỗi thì chơi tiếp từ phiên hiện tại).
4. Save có `version` **cao hơn** game (người chơi mở bản cũ trên thiết bị từng có bản mới) ⇒ **không ghi đè**, load phần field quen biết, field lạ giữ nguyên để bản mới sau đọc lại.
5. Test nghiệm thu (DoD §8 mục 3): chạy fixture save v1 đưa qua migrate v2 ⇒ so field-by-field; cố tình làm hỏng JSON ⇒ đúng hành vi §2.3.

### 2.3 Xử lý save hỏng / thiếu (PC-16, bảng State Handling §7 SPEC)

Thứ tự cứu hộ lúc boot, dừng ngay ở bước thành công đầu tiên:

```
1. parse m11.save            → OK  → migrate nếu version cũ → chơi tiếp
2. parse m11.save.good       → OK  → chạy migrate như trên (có thể lùi tiến
   trình về thời điểm mirror được ghi, nhưng ĐỦ: màn 1 + skin còn nguyên)
3. cả hai hỏng/không tồn tại → save mới toàn bộ default:
     • chơi lại từ màn 1                       (PC-16)
     • skins đã mua + album + huy hiệu: ĐỌC TỪ m11.wardrobe (append-only,
       chưa từng bị save hỏng chạm tới) ⇒ không mất skin đã mua (PC-16)
     • wardrobe cũng hỏng (chỉ khi storage bị xóa sạch) ⇒ skin-mặc-định,
       coi như thiết bị mới — không có cách nào khác khi 0 call mạng
```

Trình whiteout (localStorage bị trình duyệt thanh lọc, P4-06): game **vẫn chơi bình thường**, chỉ mất save + log — không màn hình lỗi.

### 2.4 Giới hạn kích thước

PC-16 chốt ≤100KB thực tế cho save; §1.6 cho thấy worst-case ≈25KB. Cửa chặn: `validate.py` của pipeline đo kích thước serialize của fixture save đầy nhất (120 ghost + 120 wall + 365 dates) — vượt 100KB ⇒ fail build, không cho nộp.

---

## 3. CONFIG DỮ LIỆU (file tĩnh trong bundle — chỉ đọc, thêm nội dung = thêm dòng)

Kiến trúc Bậc 1 (SPEC §5.2): mọi biến thiên đã biết đều là **dữ liệu** — thêm kiểu gấp, thêm skin, thêm chương = thêm dòng config, không sửa chuỗi if.

### 3.1 `config/chapters.json` — 8 chương × 15 màn (PC-01)

Hai tầng: **mỗi chương 1 dòng chương** + **mỗi màn 1 dòng tham số sinh đề** (120 dòng).

Field cấp chương:

| Field | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `chapter` | int 1–8 | đúng 8 chương (PC-01) |
| `name` | chuỗi | tên hữu danh để định vị tiến trình (kiểu episode Candy Crush — P1-01); hiển thị EN |
| `paper_theme` | id theme | 1 theme giấy/chương, đổi tự động khi vào chương = mốc tiến trình, **không bán** (P1-05): vở ô-li → báo cũ → kraft → gói quà → bản đồ → … (tên 3 theme cuối chốt ở T4 art, không bịa) |
| `fold_vocab` | id luật | đúng **1 "từ vựng gấp" mới**/chương (PC-01, P1-02): ch1 lỗ giữa mặt · ch2 lỗ trên nếp · ch3 lỗ ở mép · ch4 cắt góc chéo · ch5–8 gấp 8 lớp + tổ hợp (thứ tự P1-02) |
| `layers` | 4 \| 8 | số lớp giấy nền của chương (P1-02: 4 lớp đầu game, 8 lớp từ ch5+) |
| `timer` | bool | **chỉ bật từ chương 7** (PC-01); timer mềm 45–75s, không phạt (P4-04) |
| `gen_params` | object | tham số generator chung của chương: dải `inference_steps` (dial độ khó — P1-02), số lỗ min–max, loại action |

Field cấp màn (120 dòng):

| Field | Kiểu | Ràng buộc / Mô tả |
|---|---|---|
| `level_index` | int 1–120 | duy nhất; chương = ceil(level/15) |
| `archetype` | enum | nhịp thở trong chương theo P1-04: `teach`×2 → `practice`×8 → `combo`×3 → `checkpoint`×1 → `breather`×1 (`wow` gộp vào breather cuối — xem lưu ý ở §9) |
| `folds` | list[H\|V\|D] | chuỗi kiểu gấp áp dụng: H = gấp dọc, V = gấp ngang, D = gấp chéo; 1–3 lượt gấp liên tiếp (độ sâu D2 của SPEC) |
| `action` | enum punch \| cut | đục lỗ hay cắt góc chéo (PC in-scope §1.4 mục 2) |
| `hole_placement` | enum face \| crease \| edge | vị trí lỗ theo từ vựng chương (P1-02): giữa mặt / trên nếp / ở mép |
| `inference_steps` | int | **số bước suy luận** — thanh đo độ khó chính, không phải đồng hồ (PC-01, P1-02); ramp tăng dần trong chương |
| `noise_style` | enum | kiểu sinh 3 đáp án nhiễu cho màn (lệch 1 lỗ / phản xạ sai / thiếu 1 lớp) — phục vụ validator PC-04 |
| `timer_sec` | int \| 0 | 0 = off; chỉ khác 0 ở chương 7–8 |

**Một dòng mẫu (mô tả):** chương 2 "Nếp Gấp Biết Ơn" — theme báo cũ — `fold_vocab` = lỗ-trên-nếp, layers 4, timer off. Màn 23: `folds` = [H, V], `action` = punch, `hole_placement` = crease, `inference_steps` = 2, `archetype` = practice, `timer_sec` = 0.

### 3.2 `config/skins.json` — 8 skin (PC-11; có thể cắt còn 5 ở bản nộp đầu)

| Field | Kiểu | Mô tả |
|---|---|---|
| `skin_id` | id | duy nhất, `skin-` prefix |
| `name` | chuỗi EN | hiển thị shop |
| `pattern_asset` | key asset | hoa văn tờ giấy (sprite tĩnh, supervisor gen WAN) |
| `crease_color` | token màu | màu đường nếp gấp — phần cosmetic thứ 2 của P3-01 |
| `price_ink` | int | giá Mực; **không phải tiền thật** (PC-11) |
| `default_equip` | bool | đúng 1 skin miễn phí mặc định |

Danh mục 8 (tên hoa văn lấy nguyên văn từ P3-01 + 4 gợi ý, 3 cái sau chờ art): mặc-định-trơn (0 Mực) · kẻ-ô · caro · kraft · hoa-văn-cổ · gói-quà · bản-đồ · #8 ⚠️ **PLACEHOLDER giá**: SPEC/retention không cho con số giá — neo gần nhất là nhịp "≈2 món mới mỗi block ~6 màn" (P3-01, tự đánh `unverified`). Đề xuất tuning ban đầu theo nhịp đó: 40 / 60 / 90 / 130 / 180 / 240 / 320 Mực tăng dần — **cả 7 số này là số tự chọn chờ data equip-rate xác nhận (PC-11), không phải số neo**.

### 3.3 `config/stars.json` — luật sao 1–3 (PC-06, PC-07, PC-08)

| Rule id | Điều kiện | Kết quả |
|---|---|---|
| star-1 | thắng màn (bất kể số lần sai) | 1★ + Mực cơ bản |
| star-2 | thắng **không dùng hint** | 2★ |
| star-3 | thắng **ngay lần đầu** | 3★ |
| star-0 | màn bị bỏ/skip (nếu sau này có skip) | 0★ — sao phản ánh trình thật (P1-03) |
| hint-penalty | dùng hint "soi 1 nếp" ⇒ mất tư cách 3★, max 1 hint/màn, cooldown 2 màn cho hint miễn phí đầu (PC-08) | — |
| chapter-gate | mở chương kế cần **~12/15 sao** chương trước, không bắt full sao (PC-07) | map gỡ khóa `testid-map-locked` |
| ink-award | Mực = f(số sao đạt + streak đúng trong phiên) (PC-11); công thức hệ số ⚠️ PLACEHOLDER chờ tuning, cấu trúc: `mức_nền_theo_sao` × sao + `thưởng_mốc_streak` (3/5/8 — P2-02) | cộng `ink` |

### 3.4 `config/album.json` — bộ sưu tập NHỎ có chủ đích (PC-12, P3-02)

| Phần | Số lượng | Field |
|---|---|---|
| `items` mẫu giấy đã mở | **≤14** | `item_id`, `name`, `pattern_asset`, `trivia` (1 dòng trivia gấp giấy thật, offline), `unlock_rule` (đoán đúng hình mẫu này lần đầu) |
| `badges` huy hiệu chương | **≤6** | `badge_id`, `name`, `award_at` (khép block màn theo P3-02), `icon_asset` |

Lý do trần nhỏ: achievement dài thì tỷ lệ sụp (game <16 achievement: 6.3% hoàn thành hết; >50: 1.2% — P3-02). Chỉ **id đã mở** nằm trong save (`album_items`, `badges` §1.3), metadata ở config.

### 3.5 `config/folds.json` — bảng tra luật gấp (registry, SPEC §5.2 điểm cắm "fold rules")

| Field | Kiểu | Mô tả |
|---|---|---|
| `fold_id` | enum H \| V \| D | gấp Dọc / Ngang / Chéo — đúng 3 kiểu in-scope (§1.4) |
| `axis` | mô tả hình học | trục phản xạ khi mở một lớp |
| `expand_rule` | mô tả | cách nhân bản lỗ/đường cắt khi mở lớp (lỗ trên nếp ⇒ 2 lớp trùng khít thành 1 lỗ ở mép — chính là dòng giải thích của D1/PC-05) |

Thêm kiểu gấp mới (nếu mở rộng 6 tháng tới) = thêm 1 dòng + 1 rule expand, không sửa generator (SPEC §5.2 mục 4).

---

## 4. ĐỀ BÀI — LEVEL SPEC (dữ liệu SINH RA, không persist)

`levelSpec(seed)` là **hàm thuần** (contract SPEC §2): seed → mô tả màn, chạy trong `src/logic`, không biết Phaser/DOM/SDK. **Không ghi vào save** (PC-02) — save chỉ nhận *kết quả* chơi nó.

### 4.1 Cấu trúc một level spec (field)

| Field | Kiểu | Nội dung |
|---|---|---|
| `seed` | int | `hash(gameId + level_index)` — tái lập tuyệt đối, test được (Factory+Seed, SPEC §5.3) |
| `level_index` / `chapter` | int | suy từ config §3.1 |
| `folds` | list[{fold_id, seq}] | 1–3 lượt gấp theo thứ tự (H/V/D), từ `folds` config + rng(seed) |
| `layers_final` | int | số lớp sau chuỗi gấp (4 hoặc 8 — bậc tiến độ P1-02) |
| `actions` | list | 1..n phần tử: `punch{x,y}` (xác định theo `hole_placement`: giữa mặt/trên nếp/ở mép) hoặc `cut{corner}` chéo |
| `solution_pattern` | bitmap mở bung | **kết quả máy tính được**: nhân bản lỗ/đường cắt qua bảng tra folds — đây là "đáp án thật", sinh TỪ trạng thái đã mở, không xáo ngẫu nhiên (PC-03) |
| `options` | list[4] pattern | 1 = `solution_pattern`; 3 = nhiễu biến thiên theo `noise_style`: mỗi ô khác đáp án **≥1 lỗ**, ô nào cũng khác đúng 1 đáp án, 2 ô bất kỳ khác nhau (PC-03, PC-04) |
| `correct_index` | int 0–3 | vị trí đáp án đúng trong 4 ô (render gắn `testid-option-{0..3}`) |
| `inference_steps` | int | số bước suy luận — lấy từ config, validator đối chiếu |
| `timer_sec` | int\|0 | 0 = tắt (PC-01) |
| `explain_line` | id chuỗi i18n | câu giải thích khi sai ("Right on the crease — that punch only makes 2 holes." — PC-05/D1), mọi chuỗi qua i18n (PC-19) |

### 4.2 Hợp đồng deterministic + validator

- **PC-02**: chạy `levelSpec` hai lần cùng màn trên hai thiết bị ⇒ byte-identical; unit test DoD §8 mục 3.
- **PC-03/PC-04**: sinh xong phải qua validator bằng máy: đúng 1 trong 4 ô khớp `solution_pattern`; mọi ô nhiễu khác đáp án ≥1 lỗ; từng cặp ô khác nhau. Validator chạy nội tuyến lúc sinh + test hồi quy 10.000 đề liên tiếp (PC-03 ghi rõ). Đề nào fail validator ⇒ **không phát hành** — generator phải là hàm toàn phần (không "đóng vai random" sinh đề lỗi).
- Màn kế tiếp được sinh **ngay khi màn này chốt kết quả** (không win screen, tờ kế đã gấp sẵn — PC-09), nên chi phí sinh đề nằm giấu trong animation mở bung 0.7–0.9s (§8).

### 4.3 Ví dụ mô tả đề màn 23

Gấp H rồi V (4 lớp) → đục 1 lỗ **đúng trên nếp** ở nửa mép tờ đã gấp. Mở bung: lỗ trên nếp chỉ "ăn" 2 lớp trùng khít ⇒ **2 lỗ nằm đối xứng qua một trục**, không phải 4. Phương án: [A] 4 lỗ góc · **[B] 2 lỗ đối xứng qua nếp ← đúng** · [C] 1 lỗ giữa · [D] 2 lỗ nhưng lệch trục (nhiễu kiểu "phản xạ sai"). `inference_steps` = 2 (đếm lớp ăn lỗ → dựng ảnh phản xạ).

---

## 5. LOG EVENT — ring-buffer ≤100KB (PC-15, P4-06)

Logger **duy nhất** trong `src/logic`, mọi event thành 1 dòng JSON ngắn (≤120B) vào khóa `m11.log`; tràn ⇒ đẩy event cũ nhất (ring). QA đọc bằng snippet console, xuất JSONL, tính funnel bằng Python — **0 request mạng** (PC-15; validate.py quét nguồn phải 0 network). Storage bị xóa ⇒ game vẫn chơi, chỉ mất log (P4-06).

### 5.1 Danh sách event + field

| Event | Field | Đo cái gì (neo) |
|---|---|---|
| `session_start` | t, is_first | mở phiên (P4-04) |
| `session_end` | t, reason (idle_30s \| tab_hidden \| quit), levels_played, duration_s | median phiên ≥4 phút (PC-10, P4-04: end = 30s không tương tác/tab hidden) |
| `level_start` | t, level | cặp với result; màn/phiên |
| `level_end` | t, level | ghép `level_end`→`level_start` = continue rate level-to-level ≥85% qua 10 màn đầu (PC-09, P4-03) |
| `level_result` | t, level, attempts, success, hint_used, undo_used, stars, duration_s, first_try | win-rate từng băng màn (PC-01: màn 1–30 ≥75%), sao từ log (PC-06), first-attempt clear theo level (P4-02) |
| `level1_shown` / `first_tap` / `first_answer` / `unfold_seen` | t (4 mốc) | funnel onboarding ≤60s không chữ, mục tiêu ≥80% (P4-01) |
| `resume_shown` / `resume_tapped` | t, level | cliffhanger phong bì dở: % bấm "mở nốt" ≥60% (P4-05) |
| `rewarded_offer` / `rewarded_watch` | t, placement (undo \| hint \| continue \| ink_x2) | engagement per placement, 2–4 views/DAU, tỷ lệ phiên có ≥1 rewarded undo ≥30% (PC-05, PC-13, P3-03/04/06 — mỗi placement 1 reward id riêng) |
| `interstitial_shown` | t, after (chapter_scorecard \| gameover_2plus) | đối chiếu churn 5s sau ad; chứng minh đúng 2 điểm chạm cấm-việc-khác (PC-14, P3-05) |
| `skin_purchase` / `skin_equip` | t, skin_id | % equip ≠ mặc định trong 7 ngày (PC-11, P3-01) |
| `album_opened` / `badge_earned` | t, item_id / badge_id | % mở ≥80% album (PC-12, P3-02) |
| `streak_milestone` | n (3 \| 5 \| 8) | mốc animation streak phiên (P2-02) |
| `ghost_beaten` | t, level | retry-rate = plays/clears, đếm counter (P2-01) |
| `code_generated` / `code_entered` / `code_beaten` | t, code | vòng đời seed chia sẻ offline (P2-04) |
| `copy_clicked` / `image_saved` | t | % màn kết quả có action chia sẻ (P2-05) |
| `campaign_completed` / `master_start` / `level_replay` | t, level | endgame + % về đích có ≥1 replay (PC-18, P1-06) |
| `date_mark` | date | ghi ngày đã chơi (dedupe với save §1.3) → local D1/D7 (P4-05) |

### 5.2 Bảo đảm "đủ đo" của bộ event (điều kiện DoD §8 mục 6)

Cổ chai funnel P4-01: `load → first_tap → first_answer → unfold_seen` ✓ · phiên P4-03/04: cặp `level_end`→`level_start` + `session_*` ✓ · D1 local P4-05: `dates_played` trong save + `resume_*` ✓ · **≥95% phiên có đủ cặp session_start/end + ≥1 level_result** (P4-06) là gate tự test: script headless mô phỏng 100 phiên kiểm size ≤100KB, thứ tự timestamp, không mất event giữa 2 phiên.

---

## 6. DESIGN DECISIONS (trade-offs, kiểu M10 §10)

1. **Đề bài = hàm của seed, save = kết quả** — đổi 0 byte lấy 120 màn "cùng số = cùng đề" trên mọi thiết bị mà không cần server (PC-02); save nhỏ vì không chứa nội dung, chỉ chứa sao/ghost (~25KB §1.6).
2. **`m11.wardrobe` append-only tách khỏi save chính** — PC-16 yêu cầu "save hỏng ⇒ màn 1 nhưng KHÔNG mất skin đã mua"; nếu skin nằm cùng object save thì mất object là mất hết — tách danh sách đã-mua ra khóa chỉ-thêm-là cách duy nhất giữ đúng luật với 0 call mạng. Trade-off: 3 khóa storage thay vì 1; save *chơi* vẫn đúng nghĩa "1 object JSON có version".
3. **Mirror `m11.save.good`** — migrate hỏng/crash giữa ghi không mất cả tiến trình; chi phí: gấp đôi dung lượng write (vẫn ≪ quota).
4. **Ghost nén thành chuỗi quyết định ~50B/màn** thay vì record mọi thao tác (P2-01: mỗi màn chỉ 4–8 quyết định trong 60s) — 120 ghost ≈ 6KB, phá không vỡ trần 100KB.
5. **Streak chỉ lưu KỶ LỤC, không lưu chuỗi hiện hành** — streak theo PHIÊN reset khi tắt game là định nghĩa của P2-02; lưu chuỗi sống vào save là tự mâu thuẫn với "phiên".
6. **Log tách khóa, ring-buffer, không upload** — đo được funnel/retention local mà vẫn 0 network (PC-15); log không bao giờ được phình vào save.
7. **Theme giấy nằm ở config chương, không phải shop** — mốc tiến trình nhìn được, không phải hàng hoá (P1-05; kinh tế cosmetic riêng ở skins.json, hai trục không đè nhau).
8. **Toàn bộ số chưa có neo đều gắn ⚠️ PLACEHOLDER** — chỉ 2 mục (giá skin, hệ số Mực) — để validate + anh Tuyền duyệt ở T4, theo đúng tiền lệ `unverified` của P3-01.

---

## 7. LUỒNG GHI SAVE (khi nào ghi, chống ghi đè)

### 7.1 Điểm ghi

| Thời điểm | Field thay đổi | Lý do bắt buộc ghi ngay |
|---|---|---|
| chốt `level_result` | stars, ink, best/current level, ghost, wall, streak_best, album/badge nếu mở | kết quả màn = đơn vị tiến trình tự nhiên (PC-10: màn là breakpoint) |
| mua/equip skin | wardrobe, skins_owned, skin_equipped, ink | tiền vừa tiêu — mất là mất khách |
| khép chương / `campaign_completed` / mộc Master | chapter_seals, cờ master | mốc không tái lập được |
| `session_end` / mất focus | dates_played, last_played, current_level, sound_on | cliffhanger P4-05 cần đúng chỗ dừng; PC-17 pause là điểm dừng an toàn cuối |
| **KHÔNG ghi giữa màn** | — | giữa màn không có trạng thái đáng lưu (§1.5); tránh ghi 60 lần/phiên |

Ghi **coalesce**: tối đa 1 lần write mỗi mục trên, never trong lúc animate mở bung (animation chiếm frame — PC-09/§8).

### 7.2 Chống ghi đè / thứ tự an toàn

1. Trước ghi: `rev` +1, serialize, kiểm parse được (round-trip in-memory) rồi mới đụng storage.
2. Ghi `m11.save` xong ⇒ copy nguyên sang `m11.save.good`. Mirror chỉ nhận bản đã parse OK.
3. **Luật so `rev`**: nếu storage đang có `rev` cao hơn bộ nhớ (tab thứ hai cùng thiết bị đã ghi trước) ⇒ **bỏ ghi, nhận bản storage về RAM** — last-writer-wins có kiểm tra, không im lặng đè.
4. `m11.wardrobe`: mở khóa nào ghi thêm id đó rồi đóng — không bao giờ read-modify-write cả list ⇒save hỏng không kéo theo mất mua.
5. SDK save/load trả lỗi ⇒ nuốt lỗi, chơi tiếp bằng phiên hiện tại, event `save_error` ghi vào log (không chặn game — Null Object SDK standalone, PC-20).

---

## 8. HIỆU NĂNG

| Hạng | Ràng buộc | Ghi chú |
|---|---|---|
| Load boot | ≤3s, save read + migrate chạy trong boot | SPEC §3.1; migrate là thao tác trên object ≤30KB — chi phí không đo được bằng mắt |
| Sinh 1 đề | chạy trọn trong lúc animate mở bung 0.7–0.9s của màn trước (đề màn kế đã gấp sẵn trên màn hình — PC-09) ⇒ **≤ ~800ms trần**, target nội bộ ≤250ms trên máy yếu (⚠️ mục tiêu nội bộ, chưa có neo — Playwright đo khi QA) | chỉ sinh màn kế, KHÔNG pre-gen 120 màn |
| Validator PC-03/04 inline | O(số ô × số lỗ) — 4×≤8 phần tử, không đáng kể | 10.000 đề batch chỉ chạy trong test, không chạy lúc chơi |
| Write save | ~25KB/serialise, ≤4 lần/phiên (§7.1) | SDK storage async |
| Log | append ~100B/event, ~50 event/phiên ⇒ ring 100KB ≈ 800–1000 event ≈ vài chục phiên không mất gì ở giữa (P4-06 yêu cầu không mất event giữa 2 phiên liên tiếp) |
| Memory runtime | RAM chỉ giữ: 1 level spec đang chơi + 1 đang chờ + config bảng tra | không danh sách level dựng sẵn |
| Bundle | data là JSON vài KB — không ảnh hưởng trần <5MB (SPEC §5.2); gate thật ở `validate.py` |

---

## 9. BẢNG ĐỐI CHIẾU RULE ↔ § FILE + LƯU Ý CHỜ DUYỆT

| PC rule | nằm ở § |
|---|---|
| PC-01 nội dung/timer | 3.1 |
| PC-02/03/04 seed + validator | 0, 1.5, 4 |
| PC-05/06/07/08 sao, gate, hint, undo | 3.3, 5.1 |
| PC-09/10 nhịp, phiên, write coalesce | 7.1, 8 |
| PC-11/12 ink, skin, album | 1.3, 3.2, 3.4 |
| PC-13/14/15 ad + 0 network + log | 5 |
| PC-16 save version/migrate/100KB | 1, 2 |
| PC-17/18/19/20 | 1.3, 3.1, 4.1, 7.2 |

**Hai điểm vênh trong nguồn, ghi nhận — KHÔNG tự sửa, chờ anh Tuyền/T5 chốt:**
1. Chuỗi nhịp P1-04 (2 teach + 8 practice + 3 combo + 1 checkpoint + 1 breather + 1 wow) cộng thành **16**, vượt 15 màn/chương — đề xuất gộp `wow` vào màn breather cuối (`archetype` có thể thành `breather_wow`).
2. P1-02 xếp "cắt góc chéo" ở **chương 4** và "8 lớp" từ **chương 5**, còn lộ trình dạy P4-02 đặt cắt góc ở **màn 11–15** và 8 lớp ở **màn 16–20** (ngay chương 1–2). Hai nguồn xung đột vị trí giới thiệu luật; `chapters.json` §3.1 đang theo P1-02 vì SPEC PC-01 viện dẫn "mỗi chương 1 từ vựng" — cần chốt một trước khi T2 dựng nội dung.

---

*FILE NÀY = ĐẶC TẢ DỮ LIỆU LOGIC cho M11 Paper Crease. Không DB, không migration code. Code phải khớp 100% schema/table ở đây; số ⚠️ PLACEHOLDER phải được duyệt trước khi vào `src/data`.*
