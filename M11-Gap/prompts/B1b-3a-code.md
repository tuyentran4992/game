Bạn là REVIEWER ĐỘC LẬP cho batch B1b — CODE ĐÚNG/SAI. **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Phạm vi chấm: `levelState.ts` + `progression.ts` + 4 file test B1b (`level-state`, `hint-undo`, `stars`, `progression`). B1a đã review xong — không chấm lại.

## Đọc đúng 7 file này
`game/src/logic/levelState.ts` · `game/src/logic/progression.ts` · `game/tests/logic/{level-state,hint-undo,stars,progression}.test.ts` · `game/tests/logic/helpers.ts`.
KHÔNG đọc specs/, KHÔNG quét cây thư mục, KHÔNG đọc file test B1a.

## Chấm C1..C12 (checklist ở system prompt) — bám bằng chứng đo được
Ép riêng cho B1b:
- C6: rule nào đã cài THẬT — PC-01 (8×15, timer ch7), PC-05 (1 lượt/màn + undo), PC-06 (sao 1/2/3), PC-07 (gate 12, skip=0, không tụt khoá), PC-09 (không win-screen, next precompute), PC-10 (timer mềm). Ghi PC nào chưa.
- C7: hằng số phải có nguồn pack/SPEC (`GATE_STARS=12` PC-07, `FREE_HINT_GAP=2` PC-08, `LEVELS_PER_CHAPTER=15`, `revealLevel` theo bảng §6.1) — số tự bịa ⇒ FAIL.
- C10: edge thật của B1b: `tap` lúc `answered`/`wrong`, `resolve` 2 lần, `retry` ở `ready`, `useHint` lần 2, `useUndo` lần 2, `advanceClock` âm, `tap(-1|4|NaN)`, `chapterOf(0|121|1.5|NaN)`, `sumStars` chuỗi ngắn/sai ký tự, `win` đủ 4 tổ hợp.
- C11: `grep -n NOT_IMPLEMENTED src/logic/levelState.ts src/logic/progression.ts` ⇒ phải rỗng.
- Thêm 3 mục nghiệp vụ (chấm vào dòng "B1b-EXTRA"): (a) tập phase đúng 6 giá trị, `correct` chỉ sang `next`, không path nào thành win-screen; (b) `resultOf` chỉ hợp lệ ở `correct`/`next` và `firstTry` phản ánh `misses===0`, undo không khôi phục 3★; (c) `applyResult` ghi đè (không max), `isChapterUnlocked` không khoá lại khi mất sao, `timerEnabled` false đúng ch1-6.
- Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`.
- Chạy lệnh THẬT rồi dán số (không tóm tắt thay output): `cd /data/youtube-playables/M11-Gap/game && npm run typecheck && npm run test:logic` + các grep trên + snippet determinism trong /tmp nếu cần.

Tin nhắn CUỐI PHẢI là bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Ngắn nhất có thể. Xong trong ≤25 lượt; thiếu thời gian ⇒ chấm C1/C6/C7/C10/EXTRA trước, ghi rõ mục bỏ dở.
