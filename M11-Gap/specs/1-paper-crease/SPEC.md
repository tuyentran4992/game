# M11 — "Paper Crease" (gấp giấy → đục lỗ → đoán hình mở bung)

> **Ngày:** 2026-09-13 · **Trạng thái:** SPEC chờ anh Tuyền duyệt (gate cứng §PB-2b trước mọi dòng code)
> **Tên game:** **Paper Crease** (anh Tuyền chốt 13/09). Tên cũ trong nhà: "GẤP" / mã module `M11-Gap`.
> **Kênh nộp:** ưu tiên **Playgama**, song song **YouTube Playables** (Reddit Devvit để sau — xem CATALOG-CHECK.md).
> **Nguồn gameplay đã duyệt:** MVP `game-gap-giay/prototype/gap-playtest.html` (anh Tuyền chơi và duyệt 13/09: *"chơi là duyệt luôn"*).
> **Điều tra trùng lặp (T0):** `../t0/VERIFY-PARENT.md` — 0 bản cùng mechanic trên 4 kênh; 11 bản ngoài kênh ⇒ **khác biệt hoá là bắt buộc**.

---

## 1. TỔNG QUAN

### 1.1 Một câu để hiểu game
Tờ giấy bị **gấp** làm 4 hoặc 8 lớp, rồi bị **đục 1 lỗ** (hoặc cắt 1 góc chéo). Người chơi nhìn tờ đang gấp và chọn **1 trong 4 hình** là hình dạng thật của tờ giấy khi **mở bung** ra.

Câu định vị: *"Tờ giấy ai cũng từng gấp. Chưa ai từng thấy nó mở ra."*

### 1.2 Vì sao game này tồn tại (khác biệt hoá — bắt buộc theo T0)
Thị trường đã có ≥11 bản cùng mechanic (Daily Unfold, Holepunch.fun, Unfoldit, Fold Trace…), trong đó 2 bản dùng đúng format "chọn 1 trong 4 hình". Vì vậy **3 điểm khác biệt là điều kiện sống của game**, không phải tính năng phụ:

| # | Khác biệt | Vì sao thắng |
|---|---|---|
| **D1** | **Mở bung ANIMATE TỪNG LỚP + chỉ ra vì sao sai** (chấm lỗ nhân bản theo từng lớp, lỗ nằm trên nếp thì 2 lớp trùng khít) | Biến "quiz tĩnh" thành **bài học thị giác**; đối thủ chỉ đúng/sai |
| **D2** | **Độ sâu level có chương trình**: gấp 4 → 8 → nhiều lượt gấp liên tiếp, lỗ trên nếp / ở mép / giao nếp, cắt góc chéo, nhiều lỗ | Đối thủ dừng ở 1 dạng đề lặp; mình có 8 chương tiến bộ đo được |
| **D3** | **Định dạng PHIÊN chơi có nhịp + kỷ lục** (combo, timer ở chương cuối, ghost của chính mình) — **KHÔNG** làm "bài test năng lực hằng ngày" | Tránh đúng cái bẫy "daily aptitude test" mà CognitiveTrain/Lizely đang làm |

### 1.3 Đối tượng
- Người chơi 13+, chơi trên web casual (Playgama/Playables), cảm ứng + chuột, chơi dọc hoặc ngang đều được.
- Phiên mục tiêu **5-7 phút** (~5-7 màn); chơi rảnh, không cần tài khoản, không mạng.

### 1.4 IN SCOPE (bản nộp đầu — MVP+)
1. Chuỗi **120 màn / 8 chương × 15 màn**, sinh đề **deterministic theo seed** (không server) — mỗi màn cùng số = cùng đề cho mọi người.
2. 2 dạng thao tác tạo đề: **đục lỗ** và **cắt góc chéo**; các kiểu gấp H (dọc), V (ngang), D (chéo).
3. Vòng lặp màn: chọn 1 trong 4 → mở bung animate từng lớp → đúng/sai + giải thích; **không có win screen** (màn kế đã gấp sẵn trên màn hình).
4. Sao 1-3/màn; tiến trình chương (mở khoá theo sao tối thiểu ~12/15); theme giấy theo chương.
5. Tiền tệ **Mực Gấp** + **8 skin giấy** (bản nộp đầu; có thể cắt còn 5) + album mẫu giấy đã mở (≤14) + huy hiệu chương (≤6).
6. Kỷ lục offline: ghost lần chơi tốt nhất của chính mình, streak theo phiên, tường top-5 local, mã seed chia sẻ được, ảnh kết quả.
7. Rewarded ad (SDK): undo/hint/continue/x2 Mực. Interstitial: sau score screen ở ranh giới chương hoặc game over lần 2+.
8. Save qua SDK storage (local), log event ring-buffer ≤100KB để QA.
9. Endgame: màn "hết nội dung" khi hết 120 màn + vòng **Master** chơi lại toàn bộ không hint.
10. Multi-platform build: standalone (dev) · playgama · ytgame.

### 1.5 OUT SCOPE (không làm ở module này)
- **Daily challenge / streak theo ngày** — anh Tuyền chốt làm theo LEVEL, không daily.
- Multiplayer, leaderboard online, tài khoản, mạng xã hội, thông báo đẩy.
- IAP / bán skin bằng tiền thật / bất kỳ call mạng nào (luật Playables cấm).
- Sửa/thêm pin, blog, site affiliate… (không liên quan).
- Bản Việt hoá: UI mặc định **tiếng Anh**; tiếng Việt là lớp dịch sau (i18n để điểm cắm, không làm bây giờ).

---

## 2. MODULE DEPENDENCIES + CONTRACT

| Phụ thuộc | Dùng cho | Ghi chú |
|---|---|---|
| `@game/sdk` (packages/sdk) | storage (save, ring-buffer log), rewarded/interstitial ad, lifecycle pause/mute | Bắt buộc: **mọi** lời gọi nền tảng đi qua đây; cấm gọi thẳng `window.ytgame`/bridge trong logic |
| `@game/core` (packages/core) | Button, Modal, ScoreText, Particle — UI chrome | Không tự vẽ lại component đã có |
| `docs/DESIGN-SYSTEM.md` (business) | token màu/typography/spacing/radius/motion | DESIGN-SPEC của game chỉ tham chiếu + override art-theme |
| pipeline Python chung (scaffold/assets/validate/package) | đóng gói zip + metadata nộp | Game mới **KHÔNG** được sửa pipeline; nếu pipeline gắn chặt schema M1 thì xử lý theo `references/pipeline-validate-package.md` |

**Contract nội bộ (không phải HTTP — game offline):**
- Logic thuần (`src/logic`) KHÔNG được import Phaser / DOM / SDK. Cổng kiểm: `npm run test:logic` chạy được khi không có browser.
- Nội dung màn = **hàm thuần** `levelSpec(seed)` → dữ liệu mô tả (kiểu gấp, vị trí lỗ/cắt, 4 phương án, đáp án đúng). Không lưu nội dung màn vào save.
- Save = 1 object JSON có `version`; mọi thay đổi schema phải có hàm migrate đi kèm (xem DATA-MODEL).

---

## 3. USER FLOW (end-to-end + so đối thủ)

### 3.1 Luồng chính
```
[Load ≤3s, không màn hình chờ]
  → TITLE: logo giấy gấp + nút PLAY (nút "Tiếp tục" nếu có save)
      · nếu có save → nút PLAY ghi rõ "Continue — Level 23"
      · KHÔNG có màn đăng nhập / xin quyền / popup xếp hạng
  → (lần đầu) vào thẳng MÀN 1 — không màn hướng dẫn chữ nào
  → PLAY: tờ giấy đang gấp ở giữa + 4 ô đáp án bên dưới
      · bấm 1 ô → tờ giấy MỞ BUNG animate từng lớp (0.7-0.9s) → lỗ hiện dần
      · ĐÚNG: 4 ô còn lại mờ đi, sao sáng lên, màn kế đã gấp sẵn giữa màn hình, 1 nút MỞ
      · SAI: rung nhẹ + animate chỉ rõ "lỗ này nằm trên nếp ⇒ chỉ tạo 2 lỗ" + 2 lựa chọn:
             "Thử lại" | "Gỡ (rewarded)" (1 lần/màn)
  → HUD tối thiểu: số màn · sao của màn · Mực Gấp · nút loa · nút menu (level map)
  → Hết màn 15 của chương → SCORE CARD chương (số sao, thời gian, kỷ lục cá nhân)
      · đây là điểm duy nhất interstitial được phép chạy (sau khi đã hiện thưởng)
      · nút "Chương tiếp" | "Xem bản đồ" | "Chơi lại chương"
  → LEVEL MAP: 8 chương × 15 màn, ô hiện sao, chương khoá hiện điều kiện (~12/15 sao)
  → SHOP (Mực Gấp): 8 skin giấy | ALBUM: mẫu giấy đã mở + huy hiệu
  → Hết 120 màn: END SCREEN tổng sao + mở vòng MASTER (chơi lại 120 màn, không hint)
```

### 3.2 Số click tới hành động chính (so đối thủ)
| Việc | Game mình | Đối thủ điển hình | Nhận xét |
|---|---|---|---|
| Từ mở link → chơi được | **1** click (PLAY) | 2-3 (chọn chế độ → daily → play) | Mình nhanh hơn |
| Chơi màn kế | **1** click (MỞ) — tờ giấy đã gấp sẵn | 2 (next → play) | Không có win screen |
| Xem tiến trình | 1 click (menu → map) | 1-2 | Ngang nhau |
| Đổi skin | 2 click (shop → skin) | 2-3 | Ngang nhau |
| Dùng hint | 1 click (+1 rewarded) | 1-2 | Ngang nhau |

**Điểm chống friction bắt buộc:** không màn đăng nhập, không popup xin thông báo, không "rate us", không interstitial trong 60 giây đầu và không trước khi kết thúc màn đầu tiên.

### 3.3 UX checklist (agent tự verify trước khi báo xong)
- [ ] Người mới **≤3 click** là đang chơi thật.
- [ ] Màn 1 hiểu được **không cần đọc chữ** (thử: tắt hết text, vẫn chơi đúng).
- [ ] Không màn nào >1 hành động chính.
- [ ] Mọi trạng thái chờ đều có phản hồi thị giác ≤150ms.
- [ ] Không có nút nào mà người chơi không biết bấm xong thì xảy ra gì.

---

## 4. NỘI DUNG & BỐ CỤC (kèm data-testid)

> Bố cục chi tiết bằng số (px, màu, motion) nằm ở `DESIGN-SPEC.md`. Dưới đây là phần tử + testid.

### 4.1 Màn PLAY (màn chính)
```
┌──────────────────────────────────────────┐
│ [← map]      MÀN 23/120        [🔊] [⚙]   │  testid-hud-level, testid-btn-sound, testid-btn-menu
│    ★★☆   (sao đang có / tối đa)   Mực: 42  │  testid-hud-stars, testid-hud-ink
│                                          │
│           ┌──────────────┐               │
│           │ tờ giấy GẤP  │               │  testid-sheet-folded
│           │   + 1 lỗ đen │               │
│           └──────────────┘               │
│        (nếp gấp "thở" chỉ chỗ lỗ 1 lần)   │  testid-hint-breath
│                                          │
│   ┌────────┐ ┌────────┐                  │
│   │ ô 1    │ │ ô 2    │                  │  testid-option-0 / -1
│   ├────────┤ ├────────┤                  │
│   │ ô 3    │ │ ô 4    │                  │  testid-option-2 / -3
│   └────────┘ └────────┘                  │
│  [💡 Soi 1 nếp]  [↩ Gỡ (video)]           │  testid-btn-hint, testid-btn-undo
└──────────────────────────────────────────┘
```

### 4.2 Các màn khác (phần tử chính)
| Màn | Phần tử | testid |
|---|---|---|
| Title | nút PLAY/Tiếp tục, nút Shop, nút Sound | `testid-title-play`, `testid-title-shop`, `testid-btn-sound` |
| Level map | 8 tab chương, ô màn (sao), khoá chương | `testid-map-chapter-{1..8}`, `testid-map-node-{n}`, `testid-map-locked` |
| Kết quả màn | animate mở bung, dòng giải thích khi sai, 2 nút | `testid-unfold-anim`, `testid-feedback-wrong`, `testid-btn-retry`, `testid-btn-undo-ad` |
| Score card chương | tổng sao, thời gian, kỷ lục, nút tiếp | `testid-scorecard-stars`, `testid-scorecard-next` |
| Shop | lưới 8 skin, giá Mực, trạng thái khoá | `testid-shop-skin-{i}`, `testid-shop-price` |
| Album | mẫu giấy đã mở, huy hiệu | `testid-album-item-{i}`, `testid-badge-{i}` |
| Settings | sound, mute, ngôn ngữ (disabled), reset save | `testid-set-sound`, `testid-set-mute`, `testid-set-reset` |
| End screen | tổng sao, nút Master | `testid-end-total-stars`, `testid-end-master` |

### 4.3 Copy (tiếng Anh — bản nộp)
- Tiêu đề: **Paper Crease** · nút chính: **PLAY** / **Continue — Level N** · nút màn kế: **UNFOLD**
- Sai: *"Right on the crease — that punch only makes 2 holes."* · hint: **Peek a fold** · undo: **Undo (watch video)**
- Hết chương: **Chapter complete** · hết game: **You unfolded all 120**.

---

## 5. TECHNICAL REQUIREMENTS

### 5.1 Stack
Phaser 3 (TS) + vite; logic thuần TS tách khỏi Phaser; build đa nền tảng như `g4-neon-grid`; asset tĩnh (sprite giấy do supervisor gen WAN, không giao agent vẽ). Không backend, không API, không CDN runtime.

### 5.2 KIẾN TRÚC (BƯỚC 0 — bắt buộc)
**1) Thành phần:** một game client tĩnh: `src/logic` (toán gấp/mở, sinh đề, tiến trình, reward) → `src/render` (Phaser scene mỏng) → `src/ui` (theme) → entrypoint per platform. Dữ liệu đi: seed màn → spec màn → tương tác → save local.

**2) Ràng buộc cứng của nền tảng (chặn spec hứa bất khả thi):**
- Playables/Playgama **cấm call mạng ngoài** ⇒ đề bài phải sinh **offline bằng seed**; "cùng màn = cùng đề" đạt được bằng công thức, không bằng server.
- Chỉ dùng **SDK ad** (interstitial/rewarded); không tự nhét ads, không IAP.
- Save qua SDK storage, **<3MB**; bundle target <5MB; load <5s; responsive 9:16→32:9, không khoá hướng.
- Target 13+; phải tôn trọng pause/mute của nền tảng.

**3) Bậc kiến trúc: BẬC 1 — capability core + adapters.** Lý do: 1 tính năng lớn (puzzle) nhưng có ≥2 nền tảng và nhiều biến thiên **đã biết**. Điểm cắm:
- `platform` (SDK) — Storage/Ads/Lifecycle: 1 interface, 3 cài đặt (standalone · playgama · ytgame).
- `fold rules` — **bảng tra dữ liệu**: thêm kiểu gấp/cắt mới = thêm 1 dòng dữ liệu, KHÔNG sửa chuỗi if.
- `theme giấy` — mỗi chương 1 bộ token; thêm chương = thêm dữ liệu.
- `generator độ khó` — tham số theo chương nằm trong config dữ liệu, không hardcode trong scene.

**4) 6 tháng nữa thêm 3-5 tính năng (chế độ Master, skin mới, ngôn ngữ mới, kênh thứ 3):** chỉ **thêm file dữ liệu + 1 dòng registry**; nếu phải sửa >3 file cũ ⇒ kiến trúc sai, dừng lại sửa.

### 5.3 Pattern bắt buộc vì kiến trúc (mức khung — chi tiết theo file ở `STRUCTURE.md`)
| Pattern | Dùng ở đâu | Vì sao (biến thiên đã biết) |
|---|---|---|
| **Strategy** | `platform` (storage/ads) | có ≥3 nền tảng, logic không được biết nền tảng nào |
| **Registry / bảng tra** | `logic/folds`, `logic/cut`, `render/themes` | luật ≥3 nhánh ⇒ bảng dữ liệu; thêm nhánh = thêm dòng |
| **Null Object** | SDK khi chạy standalone | nơi gọi không phải `if (cóAds)` |
| **Factory + Seed** | `logic/generator` | mọi màn sinh từ seed, tái lập được để test |
| **State (máy trạng thái màn)** | `logic/levelState` | loading→ready→answered→correct/wrong→next là hữu hạn và phải test được |

### 5.4 Routes / config / data
- Không route mạng. Config dữ liệu: `config/chapters.json` (8 chương × 15 màn: kiểu gấp, loại lỗ, số bước suy luận, timer bật/tắt), `config/skins.json` (8 skin), `config/stars.json` (luật sao), `config/album.json`.
- Seed màn: `seed = hash(gameId + levelIndex)` — hằng số, không phụ thuộc thời gian/thứ tự chơi.
- **Debug hooks (bắt buộc cho QA — chốt 13/09 để nhóm A của E2E chạy được):** build dev nhận query string
  `?debug=1` (bật overlay debug) · `?level=NN` (nhảy thẳng màn NN, KHÔNG ghi vào save thật) ·
  `?seed=<hex>` (khoá seed để test tái lập) · `?ad=mock` (thay SDK ad bằng mock: trả về kết quả cấu hình được để test cả nhánh "ad không load" và "xem xong").
  **Luật:** 4 hook này chỉ tồn tại ở build dev/standalone, bị strip khỏi build nộp (playgama/ytgame) — cổng kiểm: grep chuỗi `debug=` trong bundle nộp phải rỗng.

---

## 6. BUSINESS RULES

| ID | Rule | Ghi chú đo được |
|---|---|---|
| PC-01 | 120 màn = 8 chương × 15 màn; chương chứa đúng 1 "từ vựng gấp" mới; độ khó tăng bằng **số bước suy luận**, timer chỉ từ chương 7 | màn 1-30 win-rate kỳ vọng ≥75% |
| PC-02 | Đề sinh **deterministic từ seed** = hash(gameId+levelIndex); **không** lưu đề vào save | test: chạy 2 lần ra cùng đề |
| PC-03 | Đáp án đúng **luôn tồn tại và đúng 1 trong 4 ô**, sinh từ trạng thái đã mở (không xáo ngẫu nhiên) | test: 10.000 đề liên tiếp đều có đúng 1 đáp án + 3 nhiễu khác ≥ ngưỡng khác biệt |
| PC-04 | Mỗi ô nhiễu phải KHÁC đáp án đúng ở ≥1 lỗ (không ô nào trùng đáp án); 2 ô bất kỳ phải khác nhau | validator đếm bằng máy |
| PC-05 | 1 lượt chọn/màn: sai ⇒ hiện animate giải thích + cho **Thử lại**; undo (bỏ qua lượt sai) qua rewarded ≤1 lần/màn | tỷ lệ phiên có ≥1 rewarded undo ≥30% |
| PC-06 | Sao: 1 = thắng · 2 = thắng không dùng hint · 3 = thắng ngay lần đầu | đếm từ log local |
| PC-07 | Mở khoá chương: đủ **~12/15 sao** của chương trước; KHÔNG bắt full sao | màn skip = 0 sao |
| PC-08 | Hint = soi 1 nếp gấp; tối đa 1 lần/màn; dùng hint ⇒ mất sao 3 | cooldown 2 màn cho hint miễn phí đầu tiên |
| PC-09 | Không có win screen: sau khi đúng, tờ giấy màn kế đã gấp sẵn; continue rate mục tiêu ≥85% qua 10 màn đầu | log level→level |
| PC-10 | Phiên mục tiêu 5-7 phút (~5-7 màn, 45-75s/màn); màn = breakpoint tự nhiên | median session ≥4 phút |
| PC-11 | Mực Gấp: +theo số sao & streak; tiêu ở shop skin (8 skin) — **không** bán bằng tiền thật | % equip ≥1 skin khác mặc định trong 7 ngày |
| PC-12 | Album mẫu giấy ≤14 mục + huy hiệu chương ≤6 (bộ nhỏ có chủ đích) | % mở ≥80% album |
| PC-13 | Rewarded chỉ ở 4 điểm: undo, hint, continue (1 lần/game over), x2 Mực sau khi thắng | engagement mục tiêu 2-4 views/DAU |
| PC-14 | Interstitial CHỈ sau score screen (ranh giới chương / game over lần 2+); **cấm** trong 60s đầu và trước khi kết thúc màn đầu; luôn hiện SAU khi đã trao thưởng | tỷ lệ thoát phiên trong 5s sau ad không tăng |
| PC-15 | **Cấm mọi call mạng**: không analytics, không leaderboard online, không tài khoản. Log event chỉ local ring-buffer ≤100KB | `validate.py` quét mã nguồn phải 0 network |
| PC-16 | Save: 1 object JSON có `version`, ≤100KB thực tế; thiếu/hỏng save ⇒ chơi lại từ màn 1 mà KHÔNG mất skin đã mua | test corruption |
| PC-17 | Tôn trọng pause/mute của nền tảng: mất focus ⇒ dừng timer + nhạc; có nút mute riêng | E2E có case |
| PC-18 | Vòng Master: chơi lại 120 màn không hint, không timer; mở sau khi hết màn 120 | end screen khai báo hết nội dung (bắt buộc với Playables) |
| PC-19 | Ngôn ngữ UI mặc định **EN**; mọi chuỗi đi qua lớp i18n (điểm cắm), tiếng Việt KHÔNG làm ở module này | grep: 0 chuỗi hardcode trong scene |
| PC-20 | Game phải chạy được standalone không có SDK (Null Object) — dùng cho dev + QA Playwright | test: boot standalone, 0 lỗi console |

### 6.1 Lộ trình dạy luật (NGUỒN SỰ THẬT DUY NHẤT — chốt 13/09, gỡ vênh P1-02 ↔ P4-02)

> Bối cảnh: retention P1-02 nói "mỗi chương 1 từ vựng mới" (cắt góc ở chương 4, gấp 8 ở chương 5) còn P4-02 nói "mỗi luật mới cách nhau 5-10 màn" (cắt góc màn 11-15 ⇒ chương 1). Hai lộ trình **xung đột** — dưới đây là bản chốt, `config/chapters.json` PHẢI theo bảng này.

| Chương | Từ vựng gấp/cắt mới ra mắt | Vị trí ra mắt trong chương | Màn còn lại của chương |
|---|---|---|---|
| 1 | Lỗ giữa mặt giấy (gấp H/V 4 lớp) | màn 2 (siêu dễ, có nếp "thở") | tăng số lớp 4→8, vẫn lỗ giữa |
| 2 | **Lỗ nằm TRÊN nếp** ⇒ số lỗ giảm | màn 2 | biến thể lỗ sát nếp 1-2px |
| 3 | **Lỗ ở MÉP / góc giấy** | màn 2 | kết hợp mép + nếp |
| 4 | **Cắt góc chéo** (thay vì đục lỗ) | màn 2 | cắt to/nhỏ, cắt 2 góc |
| 5 | **Gấp 8 lớp** (thêm 1 nếp) | màn 2 | 8 lớp + lỗ trên nếp/mép |
| 6 | **Nếp chéo D** (gấp tam giác) | màn 3 | chéo + gấp thẳng |
| 7 | **Nhiều lỗ (2-3 lỗ)** + timer bật ở màn 8 | màn 3 | timer 5s/màn, độ khó theo số lỗ |
| 8 | **Tổ hợp nhiều lượt gấp liên tiếp** + timer + combo | màn 3 | màn 13-15 = "checkpoint cuối", không luật mới |

- **Luật cứng:** mỗi luật mới ra mắt ở **màn 2-3 của chương**, trên màn SIÊU DỄ (first-attempt clear ≥90% cho màn dạy luật); 2 màn cuối chương = breather/checkpoint, KHÔNG luật mới.
- P4-02 ("cách nhau 5-10 màn") được thoả vì mỗi chương dài 15 màn ⇒ khoảng cách giữa hai luật mới luôn ≥12 màn.
- Thứ tự này **thay thế** mọi phát biểu khác về thứ tự dạy luật trong file retention; DATA-MODEL §9 ghi điểm vênh này đã được chốt tại đây.

---

## 7. STATE HANDLING

| Trạng thái | Hiển thị | Ghi chú |
|---|---|---|
| Loading | logo giấy + tiến trình mảnh; **không** màn hình trắng | ≤3s |
| Màn ready | tờ giấy gấp + 4 ô bấm được | nếp gấp "thở" 1 lần ở màn dạy luật |
| Đang mở bung | 4 ô khoá bấm, animate từng lớp 0.7-0.9s | bấm trong lúc animate ⇒ buffer, không mất lượt |
| Đúng | 4 ô mờ, sao sáng, màn kế đã sẵn | không có win screen |
| Sai | rung nhẹ + animate giải thích + 2 nút | PC-05 |
| Hết lượt undo | nút undo ẩn, chỉ còn "Thử lại" | — |
| Save hỏng/thiếu | chơi lại từ màn 1, skin đã mua giữ nguyên | PC-16 |
| Ad không load | ẩn nút ad, chơi bình thường (không chặn) | Null Object |
| Mất focus / nền tảng pause | dừng timer + nhạc; quay lại thì tiếp tục đúng chỗ | PC-17 |
| Hết 120 màn | end screen + mở Master | PC-18 |
| Offline/không mạng | chạy y hệt (game vốn không cần mạng) | PC-15 |

---

## 8. TIÊU CHÍ HOÀN THÀNH (Definition of Done)

1. 5 file SPEC (+`PROMPT.md`, `CATALOG-CHECK.md`) đã có và anh Tuyền đã duyệt.
2. Build standalone chạy được **không lỗi console**, chơi trọn 120 màn bằng bàn phím/chuột (smoke), timer/pause đúng.
3. `npm run test:logic` xanh: validator đề (PC-03/PC-04), seed ổn định (PC-02), luật sao (PC-06), tiến trình chương (PC-07), save/migrate (PC-16).
4. E2E Playwright pass theo `E2E-TESTS.md`, có **screenshot từng màn** + vision QA (không tin test xanh).
5. `validate.py` của pipeline: 0 network call, bundle <5MB, save <3MB, responsive 4 tỷ lệ.
6. QA số: log event local ghi đủ funnel màn 1 → session → ngày (Điều kiện của P4-06) và em chạy được báo cáo từ JSONL export.
7. Anh Tuyền chơi tay 1 phiên ≥5 phút: "vui" ⇒ mới đi T3 juice → T4 art → T5 pre-submit.
8. Không có chuỗi/màn hình nào còn nhắc "GẤP"/tên cũ; tên hiển thị = **Paper Crease**.

### 8.1 Điều chỉnh spec cũ
Không có (module mới hoàn toàn). Nguồn gameplay cũ `game-gap-giay/` **đóng băng** — chỉ đọc, không sửa; nếu cần đổi hành vi thì vá trong M11.
