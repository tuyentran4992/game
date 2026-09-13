# GÓI NGỮ CẢNH B1a — lõi hình học (thay cho việc đọc 23 file)

## Hợp đồng hàm THẬT trong `src/logic/` (đã có, KHÔNG đổi chữ ký)
- `rational.ts`: `rat(n,d)`, `add/sub/mul/div`, `eq`, `cmp -> -1|0|1`, `toNumber`, `key`, `pointKey`, `inUnit`, `inSheet`, `point`, `ratPoint`, `toPoints`, `flatPoints`, `samePointSet`. Kiểu `Rat = {n: bigint, d: bigint}` (luôn tối giản, `d > 0`).
- `types.ts`: `Rat`, `Point`, `RatPoint`, `FoldKind = 'H'|'V'|'D'`, `PunchAction`, `CutAction`, `SheetAction`, `Option`, `LevelSpec`.
- `foldRules.ts`: `FOLD_RULES`, `makeLayers`, `layerCount`, `unfoldPoints`, `unfoldHoles`, `unfoldPointsWithCount`, `unfoldHolesWithCount -> {at, layers}[]`, `creaseLines`. `Layer/Packet` mô tả các lớp giấy.
- `generator.ts`: `levelSpec(seed, levelIndex, cfg) -> LevelSpec`, `levelConfigFor(chapters, levelIndex) -> ChapterLevelConfig`, `DISTRACTOR_RULES`, `shareCode(levelIndex, score)`.
- `validator.ts`: `validateSpec(spec) -> {ok, errors[]}`, `SPEC_RULES`, `bitmapOf(holes, grid)`, `hamming(a,b)`, `minPairDistance(spec, grid)`, `cellKeyOf`, `cellOf`, `RASTER_GRID=16`, `MIN_RASTER_DISTANCE=6`, `OPTION_COUNT=4`.

## Chân lý hình học (từ `code/g01_fold_sim.py` — nguồn sự thật, KHÔNG suy đoán lại)
- Số vị trí lỗ sau khi mở: `H`→2, `V`→2, `H·V`→4, `H·V·H`→8 (lỗ ở tâm thì gộp còn 3 vị trí: 2+4+2 lớp), `D`→2, `D`+punch ngoài đường chéo→2, punch TRÊN đường chéo→1, `H`+`D`→4, 3 nếp→8.
- Quy ước toạ độ: tờ ĐÃ MỞ, gốc (0,0) = góc dưới-trái, `x` sang phải, `y` lên trên, đơn vị = tờ gốc (0..1).
- `layers` = số lớp giấy chồng tại vị trí lỗ đó.

## Bẫy đã biết ở B1a (kiểm trước khi báo xong)
- `levelSpec` phải TÔN TRỌNG cfg: `punchCount` (chương 7+ = 2 điểm đục ⇒ 2 điểm, không phải 1), `foldCount`, `cut`, `timerOn`.
- `validateSpec` phải bắt: `correctIndex` trỏ SAI ô, 2 ô trùng nhau, không ô nào khớp, 2 ô cùng khớp, <4 ô, khoảng cách 2 lỗ < `MIN_RASTER_DISTANCE`.
- Đề phải có ĐÚNG 1 đáp án đúng trong 4 ô; 3 ô nhiễu phải phân biệt được (theo `DISTRACTOR_RULES`).

## Lệnh
`cd /data/youtube-playables/M11-Gap/game && npm run typecheck && npm run test:logic`
