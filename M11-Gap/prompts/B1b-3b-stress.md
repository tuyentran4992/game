Bạn là REVIEWER ĐỘC LẬP cho batch B1b — TẤN CÔNG/FUZZ. **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được). **KHÔNG copy test có sẵn làm bằng chứng** — tự viết script fuzz riêng, import code THẬT.

## Cách chạy script fuzz (đã kiểm chứng, dùng đúng nguyên mẫu)
```
cd /data/youtube-playables/M11-Gap/game
# file nháp ở /tmp, import TUYỆT ĐỐI vào src thật (node v22 strip-types, đã đo OK):
# /tmp/b1b-fuzz.ts:
#   import { startLevel, tap, resolve, ... } from '/data/youtube-playables/M11-Gap/game/src/logic/levelState.ts';
#   import { chapterOf, win, ... }           from '/data/youtube-playables/M11-Gap/game/src/logic/progression.ts';
#   import type { LevelSpec } from '/data/youtube-playables/M11-Gap/game/src/logic/types.ts';
node --experimental-strip-types /tmp/b1b-fuzz.ts
```
Dựng `LevelSpec` giả trong script bằng hằng số viết tay (đủ field theo pack mục 1; `Rat = {n,d}` bigint — tự khai `{n:1n,d:4n}`). CẤM mô phỏng lại 2 file src trong script (oracle phải là code thật). CẤM `npm install`, CẤM đọc node_modules.

## Đòn kiểm F1..F8, ép riêng B1b
| # | Đòn | Cách làm |
|---|---|---|
| F1 | Fuzz máy trạng thái | PRNG tự viết (nhiều seed), ≥10.000 chuỗi action trộn `tap/resolve/retry/nextLevel/useHint/useUndo/advanceClock`, `optionIndex ∈ [-3..6]`, `ms ∈ [-100..1e6]` ⇒ mọi state luôn nằm trong đúng 6 phase; `taps`/`misses` ≥0 và bị chặn; spec KHÔNG mutate (Object.freeze sâu trước khi đưa vào máy); exception chỉ xuất hiện ở đúng các input mà pack mục 2 khai là ném lỗi |
| F2 | Input bẩn progression | `chapterOf(0\|121\|1.5\|NaN\|Infinity)`, `sumStars` chuỗi 119/121/chứa '4'/'a', `applyResult` level ngoài 1..120 hoặc gained ngoài 0..3, `isChapterUnlocked(chapter 0\|9)` ⇒ hành vi XÁC ĐỊNH: ném lỗi rõ HOẶC trả đúng boolean đã công bố; không crash kiểu TypeError trần, không "sửa" input im lặng |
| F3 | Determinism dưới tải | cùng 1 chuỗi action chạy 100 lần ⇒ serialize kết quả giống hệt từng byte; tạo 2 máy state xen kẽ không ảnh hưởng nhau (không biến module-level) |
| F4 | Purity | script chạy trong node thuần 0 DOM là bằng chứng; kèm `grep -nE "^import" src/logic/levelState.ts src/logic/progression.ts` ⇒ chỉ được trỏ `./types` (+`./rational`), không `./generator`/`./foldRules`/`./validator`/platform |
| F5 | Thời gian/ngẫu nhiên ẩn | stub `Math.random`/`Date.now`/`performance.now`/`new Date` thành `throw`, chạy lại nguyên F1+F3 ⇒ 0 lời gọi |
| F6 | Đối chiếu bảng §6.1 | chép bảng SPEC §6.1 (pack mục 4) thành const TÂY trong script ⇒ so từng dòng với `CAMPAIGN` + `newFoldVocab` + `timerEnabled` + `revealLevel` + `archetypeOf(màn 14,15)` (breather/checkpoint, không luật mới ở 2 màn cuối) — 8/8 chương phải khớp, không suy ngược từ code |
| F7 | Hiệu năng | đo ms của 10.000 chuỗi action và 100.000 lệnh progression; tổng >2s ⇒ báo động kèm số |
| F8 | Test tự-làm-oracle | đọc 4 file test B1b (`level-state`, `hint-undo`, `stars`, `progression`.test.ts): chỉ ra case nào hardcode kỳ vọng (đạt) vs case nào dẫn xuất kỳ vọng bằng chính hàm src đang test (giả xanh) |

## Quy tắc
- Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`.
- Dán output THẬT; ca FAIL kèm repro tối thiểu (input → output thật vs mong đợi).
- Không tìm thấy lỗi ⇒ ghi rõ ĐÃ THỬ gì (số chuỗi, số seed, dải input) để chứng minh tấn công thật.
- Tin nhắn CUỐI PHẢI là bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Xong trong ≤25 lượt; thiếu thời gian ⇒ F1/F2/F5/F6 trước, ghi rõ mục bỏ dở.
