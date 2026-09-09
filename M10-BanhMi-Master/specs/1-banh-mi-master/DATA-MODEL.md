# M10 Banh Mi Master — DATA-MODEL (nguồn SỐ duy nhất; code import từ đây, không rải magic number)
> File chuẩn: `game/src/data/ingredients.ts`, `game/src/data/customers.ts`, `game/src/data/shift.ts`, `game/src/core/rules.ts` — giá trị DƯỚI ĐÂY là spec, code phải khớp 100%.

## 1. WORLD CONSTANTS (`shift.ts`)
```
VIEW_W=720  VIEW_H=1280            // portrait, Scale.FIT, desktop pillarbox
SHIFT_LEN=8                        // số khách/ca
STRIKES_MAX=3                      // strike thứ 3 = LOSE
TRAY_COLS=4  TRAY_ROWS=3           // 12 ô khay, đủ 12 nguyên liệu không cuộn
HINT_MAX_PER_CUSTOMER=1  HINT_MAX_PER_SHIFT=3  HINT_REPLAY_MS=1500
FLASH_REPLAY_WAIT_MS=1500          // khách #7 "WAIT!"
INTERSTITIAL_BETWEEN=4             // sau khách #4
REWARDED_CONTINUE_PER_SHIFT=1      // hồi 1 strike khi LOSE
REVEAL_PER_LAYER_MS=500            // chấm layer khớp/lệch
```

## 2. NGUYÊN LIỆU (12) — `ingredients.ts`
| id | tên (EN UI) | loại | màu art chính | note |
|---|---|---|---|---|
| ing-base | Bread (ổ dưới) | base | vàng nâu | LUÔN là layer 1 — order không liệt kê, tự có |
| ing-pate | Pâté | sốt | nâu hồng | đặc sản Việt |
| ing-mayo | Mayo | sốt | trắng ngà | |
| ing-chili | Chili Sauce | sốt | đỏ tươi | |
| ing-pork | Grilled Pork | thịt | nâu sém | thịt nướng |
| ing-chicken | Chicken | thịt | vàng | xé |
| ing-ham | Cold Cut | thịt | hồng | chả lụa |
| ing-cuke | Cucumber | rau | xanh nhạt | |
| ing-pickle | Pickles (đồ chua) | rau | vàng-cam | cà rốt+su hào |
| ing-herb | Cilantro (ngò) | rau | xanh đậm | |
| ing-chili-f | Chili Slices | rau | đỏ | lát ớt |
| ing-top | Bread (nắp) | base | vàng nâu | LUÔN là layer cuối, tự có khi SERVE |

**Quy tắc order:** order chỉ liệt kê layer GIỮA base và top (2–6 lớp). Không lặp id trong cùng order, NGOẠI TRỪ sốt được phép tối đa 2 loại khác nhau (không trùng id).

## 3. KHÁCH (8/ca, thứ tự cố định theo template — nội dung order sinh từ seed) — `customers.ts`
| # | id | persona (art) | layers | FLASH_S | PATIENCE_S | tipMult | đặc biệt |
|---|---|---|---|---|---|---|---|
| 1 | c-student | Học sinh | 2 | 6.0 | 45 | ×1.0 | tutorial highlight |
| 2 | c-granny | Bà cụ | 3 | 5.0 | 42 | ×1.0 | |
| 3 | c-office | Dân văn phòng | 4 | 4.5 | 40 | ×1.2 | |
| 4 | c-worker | Công nhân | 4 | 4.0 | 38 | ×1.0 | |
| 5 | c-vip | Doanh nhân VIP | 5 | 4.0 | 32 | ×2.0 | patience ngắn nhất |
| 6 | c-rush | Sinh viên vội | 5 | 3.5 | 36 | ×1.2 | flash ngắn nhất |
| 7 | c-changer | Khách đổi ý | 4→5 | 4.0 | 40 | ×1.2 | WAIT! đổi 1 layer (sau +2.5s kể từ flash tắt) |
| 8 | c-regular | Khách quen | 6 | 4.0 | 40 | ×1.5 | dài nhất ca |

`layers` = số layer GIỮA base/top. Order gen từ seed (§4). Tổng layers 8 khách = 33 (max sao 3×8=24 → thang §5).

## 4. ORDER GENERATOR (hàm PURE, test được) — `rules.ts`
```
genOrder(seed, customerIdx):
  rng = mulberry32(seed + customerIdx*1013)
  n = customers[customerIdx].layers
  pool = 10 nguyên liệu giữa (loại base/top)
  ràng buộc:
    (a) tối thiểu 1 sốt + 1 thịt + 1 rau (đơn "có hồn")
    (b) lớp đầu tiên sau base luôn là SỐT (đúng cách làm bánh mì thật — onboarding tự nhiên)
    (c) không trùng id
    (d) KHÔNG sinh 2 order giống hệt trong cùng ca
  output: string[] thứ tự dưới→trên
```
Mọi thứ (order, thứ tự khách chờ lệch ±2s, giá trị patience đã đếm) là hàm của seed → sim deterministic.

## 5. SCORING — `rules.ts` (hàm PURE)
```
matchScore(order, stack):            // stack = layer người chơi, dưới→trên, KHÔNG tính base/top tự động
  n = max(order.length, stack.length)
  khớp = Σ(i) [ order[i] == stack[i] ]        // đúng id ĐÚNG vị trí
  score = khớp / n                            // 0..1
```
| score | sao | tip |
|---|---|---|
| ≥0.90 | ⭐⭐⭐ | 30 × tipMult |
| ≥0.70 | ⭐⭐ | 20 × tipMult |
| ≥0.40 | ⭐ | 10 × tipMult |
| <0.40 | — | 0 + STRIKE (khách bỏ đi) |

- **Combo:** chuỗi ≥2 khách liên tiếp 3 sao → tip khách sau ×1.15 (cap ×1.5). Chuỗi đứt khi <3 sao.
- **Tốc độ:** serve khi patience còn ≥60% → +5 tip (huy hiệu "FAST!" vàng bay lên).
- Tip làm tròn xuống số nguyên. Tips ca = Σ tip khách HAPPY.

## 6. THẮNG/THUA + RANK — `rules.ts`
```
WIN  = hoàn thành khách #8 VÀ strikes < 3
LOSE = strikes == 3 (bất kể khách thứ mấy)
RANK (khi WIN): S: sao ≥21/24 VÀ tips ≥ 260
                A: sao ≥16/24 VÀ tips ≥ 190
                B: còn lại
save: banhmi.best = max(tips) qua các ca (localStorage/sdk.saveData)
sendScore(bridge) = tips ca này
```

## 7. KHÁCH ĐỔI Ý (c-changer #7) — `rules.ts`
```
Sau flash tắt + 2.5s: sự kiện WAIT!
  - bong bóng hiện lại 1.5s (HINT_REPLAY_MS), order MỚI = order cũ với đúng 1 layer THAY bằng id khác (không trùng order cũ; ưu tiên đổi layer giữa đơn)
  - patience PAUSE trong 1.5s replay + 1.0s đệm
  - nếu người chơi đã lắp layer bị đổi trước đó → KHÔNG tự xóa (để nguyên; họ phải tự UNDO — quyết định thật)
  - chỉ xảy ra đúng 1 lần/ca (khách #7), KHÔNG áp dụng nếu người chơi đã dùng HINT cho khách này trước đó (tránh 2 lần hiện lại gây rối — khi đó khách #7 hành xử như thường)
```

## 8. PATIENCE — `rules.ts`
```
patience chỉ đếm khi state=BUILD (sau flash; pause khi WAIT!/HINT/overlay/pause nền tảng)
về 0 → WALKOUT: strike+1, khách đi ra (giận), KHÔNG tính sao/tip
hiển thị: thanh vòng cung trên đầu khách, màu theo DESIGN-SYSTEM semantic
  >60% color.success · 30–60% color.warning · <30% color.danger + nhấp nháy 1Hz
```

## 9. ASSET MANIFEST (`M10-BanhMi-Master/assets/manifest.json`)
Supervisor gen bằng WAN 2.7 (skill `aibox-image-generation`) → 33 file (DESIGN-SPEC §3): mỗi entry `{file, sha256, size}`. Code KHÔNG gen/đổi asset. Tổng < 4MB (gate TB-03).

## 10. DESIGN DECISIONS (trade-offs)
1. **12 ô khay cố định, không cuộn** — memory game cần thấy TOÀN BỘ lựa chọn cùng lúc (nếu cuộn thì load trí nhớ nằm ở UI chứ không ở order — sai hook). 12 = đủ độ khó đọc-trước nhưng 1 màn mobile chứa hết (ô 150×150px ≥ 44px chạm).
2. **Base+top tự động** — giảm noise order (không ai "quên bánh mì"), tập trung trí nhớ vào phần nhân = phần biến đổi thật.
3. **Layer đầu luôn là sốt** — quy tắc thật của bánh mì giúp người chơi "neo" cấu trúc đơn (chunking tự nhiên), giảm ức chế; vẫn đủ khó vì 2/3 sốt + thứ tự còn lại random.
4. **Score theo vị trí tuyệt đối** (không LCS/subsequence) — dễ hiểu 100% với người chơi (mỗi ✅/❌ hiện đúng chỗ) + hàm pure O(n) dễ test. Trùng phạt 2 lỗi (thừa+thiếu) — đúng cảm giác "sai đơn".
5. **strike<40% thay vì sai-1-layer-là-mất khách** — khoan dung ở mức "có làm" (1-2 sao vẫn được tiền), chỉ trừng phạt serve bừa → tránh ức chế kiểu M1.
6. **Tip thay vì "điểm" chung chung** — tiền = ngôn ngữ của quầy hàng thật; coin bay lên HUD là juice tự nhiên (DESIGN-SYSTEM §4.3).
