Bạn là dev viết test cho batch B3a (nửa 2: animation/timer/hint + state contract). **90 lượt tối đa.**

Luật phiên + GÓI NGỮ CẢNH B3a nằm trong system prompt (pack `harness/packs/b3a.md`). Con  test khác đã tạo `view-b3a-geometry.test.ts` + `view-b3a-contract.test.ts` — **CẤM đụng 2 file đó**, chỉ tạo file của bạn.

Đọc thêm:
- /data/youtube-playables/M11-Gap/specs/1-paper-crease/E2E-TESTS.md §1.3 (nhóm L)
- /data/youtube-playables/M11-Gap/game/tests/logic/helpers.ts

NHIỆM VỤ — chỉ tạo `tests/logic/view-b3a-timing.test.ts` cho `src/render/anim/unfoldPlan.ts` (phần lịch động) + bảng state-hint:
1. **Lịch mở bung**: với `layers=4` ⇒ đường chờ `3*110+140 = 470ms`; `layers=8` ⇒ `910ms` (DS:120). Kịch bản input của scene Play: `unfoldTimeline(opts: {layers:4|8, holes:number, wrong:boolean})` (contract bạn ĐẶT RA trong comment đầu file, code B3a phải theo):
   - `{layers:4, holes:1, wrong:false}` ⇒ `totalMs = 470 + 250 = 720` (mở lớp xong mới pops lỗ `dur.pop` 250ms, DS:121) ∈ dải 0,7–0,9s (SPEC:78).
   - `{layers:8, holes:3, wrong:false}` ⇒ `totalMs = 910 + 2*60 + 250 = 1280` (lỗ cuối bắt đầu sau 2 nhịp so le rồi mới chạy `dur.pop`) và assert `holesStaggerMs===60`.
   - `{wrong:true}` ⇒ nhánh giải thích: `explainMs ≥ 700` (cấm dưới 700, DS:122) = `500 (vệt sáng) + 200 (2 lỗ blend)` — bảng số hardcode từ DS, không oracle lại bằng implementation.
   - Input bẩn: `layers:0|5|9`, `holes:0|-2` ⇒ trả `null` + không ném (scene không crash).
2. **Nhịp breathe (testid-hint-breath)**: `breathPlan()` ⇒ `scaleFrom:1.0, scaleTo:1.02, yoyoMs:1200, repeat:2, idleGateMs:5000, teachOnly:true` (đúng 6 số DS:124 + SPEC:125). repeat=2 nghĩa là DỪNG sau 2 nhịp — không lặp vô hạn (E2E PC-O-03).
3. **Buffer input** (PC-05/SPEC:248, DS:96): bảng hành vi `optionEnabledByState` — `ready`: enabled; `unfolding`: disabled-alpha0.6 nhưng buffer=1; `correct/wrong`: disabled. Đây là hợp đồng để reviewer đối chiếu scene, assert từng ô của bảng.
4. **Disabled state của ô** (DS:94-96): `alphaUnchosen=0.45` (sau đúng), `alphaDisabled=0.6` (đang animate) — 2 số khác nhau, không được gộp 1; scale chạm 1.03 (DS:95), shake ≤4px (DS:127), phản hồi chạm `dur.fast` ≤150ms (PC-U-06).
5. **Timer**: scene chỉ đọc `LevelSpec.timerOn` (types.ts đã có) + render đồng hồ; test = source-scan `src/render/scenes/PlayScene.ts` CẤM chứa `Date.now|performance.now|Math.random` — timer dùng Phaser clock/timeline (pause qua lifecycle PC-17, không tự đếm bằng wall clock).

Mỗi `it()` assert giá trị cụ thể. Ghi comment trace từng case E2E: **PC-L-01..11** (E2E-TESTS.md:43-53) — mốc 720ms ⇒ L-01; wrong≥700ms ⇒ L-03; buffer ⇒ L-05; breathe ⇒ O-03.

RÀNG BUỘC: chỉ tạo ĐÚNG 1 file; CẤM sửa src/; chạy `npx vitest run tests/logic/view-b3a-timing.test.ts 2>&1 | tail -12` ⇒ dán output RED thật (module chưa tồn tại).

BÁO CÁO CUỐI: file + số `it()` · output RED · bảng case→(PC rule, E2E ID).
