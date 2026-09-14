Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B1b (đợt gate1).

Cổng máy `npm run gate` của batch B1b ĐANG ĐỎ. Output thật (cuối):
```

> paper-crease@0.1.0 gate
> npm run typecheck && npm run test:logic && node tools/gate-smell.mjs


> paper-crease@0.1.0 typecheck
> tsc --noEmit


> paper-crease@0.1.0 test:logic
> vitest run tests/logic


 RUN  v2.1.9 /data/youtube-playables/M11-Gap/game

stdout | tests/logic/generator.test.ts > B1/F-1 · cfg.punchCount được tôn trọng tuyệt đối trên bảng chương thật 8×15 > (a) 120 màn: không màn nào sinh ÍT điểm đục hơn config, không màn nào ném oan
[B1] bảng holes_max=3: punch đủ=65 cắt=50 ném đúng lý do hình học=5 :: màn 94 DHV xin 3 > trần 2 | màn 96 DHV xin 3 > trần 2 | màn 100 DHV xin 3 > trần 2

 ✓ tests/logic/generator.test.ts (29 tests) 4457ms
   ✓ generator.levelSpec — PC-02 deterministic từ seed (TC-GEN-01, TC-GEN-02) > TC-GEN-01 · PC-02: determinism giữ nguyên khi sinh hàng loạt màn khác xen giữa (không trạng thái ẩn) 348ms
   ✓ generator.levelSpec — PC-04 bốn ô phân biệt, đạt ngưỡng khác biệt > PC-04 + ngưỡng: 120 màn — minPairDistance trên lưới 16 ≥ 6 và validateSpec ok cho mọi đề 326ms
   ✓ generator.levelSpec — PC-01 tham số chương là DỮ LIỆU, không hardcode > TC-GEN-11 · PC-03 + PC-01: dải chương 4..8 CÓ xuất hiện "cắt 1 góc chéo" hợp lệ; chương 1..3 chỉ đục lỗ 395ms
   ✓ B1/F-1 · cfg.punchCount được tôn trọng tuyệt đối trên bảng chương thật 8×15 > (b) 200 seed × HV/HVH/HHV × punchCount 3..4 ⇒ hoặc đủ, hoặc NÉM nêu chain + punchCount 624ms
 ✓ tests/logic/chain-config.test.ts (27 tests) 2390ms
   ✓ A1/F-1 · chainFor cấm nuốt foldCount ngoài bảng > 200 seed liên tiếp: mọi chuỗi tuân luật, tất định, và bảng không bị hẹp đến mức chỉ ra 1 chuỗi 1909ms
 ✓ tests/logic/fold-rules.test.ts (27 tests) 314ms
 ✓ tests/logic/validator.test.ts (32 tests) 62ms
stdout | tests/logic/generator-10000.test.ts
[B1a][TC-GEN-05] generated=10000/10000 distinctSpecs=10000 punchCountBad=0 rasterBad=0 elapsedMs=26595

 ✓ tests/logic/generator-10000.test.ts (11 tests) 26627ms
 ✓ tests/logic/level-state.test.ts (17 tests) 57ms
 ✓ tests/logic/fold-unfold.test.ts (30 tests) 58ms
 ✓ tests/logic/rational.test.ts (26 tests) 32ms
 ✓ tests/logic/progression.test.ts (13 tests) 50ms
 ✓ tests/logic/hint-undo.test.ts (11 tests) 24ms
 ✓ tests/logic/level-config.test.ts (6 tests) 57ms
 ❯ tests/logic/stars.test.ts (13 tests | 1 failed) 38ms
   × PC-STR-06: sumStars tinh dung 29 (bon 3 + ba 2 + sau 1); toan "0" => 0; toan "3" => 360 15ms
     → expected 24 to be 29 // Object.is equality
 ✓ tests/logic/refactor-contract.test.ts (9 tests) 290ms
 ✓ tests/logic/validator-action.test.ts (9 tests) 111ms
 ✓ tests/logic/share-code.test.ts (7 tests) 17ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/logic/stars.test.ts > PC-STR-06: sumStars tinh dung 29 (bon 3 + ba 2 + sau 1); toan "0" => 0; toan "3" => 360
AssertionError: expected 24 to be 29 // Object.is equality

- Expected
+ Received

- 29
+ 24

 ❯ tests/logic/stars.test.ts:134:23
    132|     [8, C1], [9, C1], [10, C1], [11, C1], [12, C1], [13, C1]]);
    133|   expect(s).toHaveLength(LEN);
    134|   expect(sumStars(s)).toBe(29);
       |                       ^
    135|   expect(sumStars(zeros(LEN))).toBe(0);
    136|   expect(sumStars(lead(LEN, C3))).toBe(360);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed | 14 passed (15)
      Tests  1 failed | 266 passed (267)
   Start at  21:32:57
   Duration  43.08s (transform 887ms, setup 0ms, collect 1.60s, tests 34.58s, environment 5ms, prepare 2.11s)

```
Sửa cho cổng XANH. Chỉ sửa nguyên nhân gây đỏ (lỗi biên dịch, test đỏ, hoặc vi phạm gate-smell THẬT — mục "NỢ ĐÃ KHAI" thì bỏ qua).

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.
