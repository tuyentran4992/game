Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B4 (đợt gate3).

Cổng máy `npm run gate` của batch B4 ĐANG ĐỎ. Output thật (cuối):
```

> paper-crease@0.1.0 gate
> npm run typecheck && npm run test:logic && node tools/gate-smell.mjs


> paper-crease@0.1.0 typecheck
> tsc --noEmit


> paper-crease@0.1.0 test:logic
> vitest run tests/logic tests/platform


 RUN  v2.1.9 /data/youtube-playables/M11-Gap/game

 ❯ tests/logic/view-b3b-states.test.ts (30 tests | 1 failed) 58ms
   × Phản hồi chạm <=150ms — PC-U-06 (E2E PC-U-06 · pack §4 DS:126) > PC-U-06 · pack §4: mọi node bấm được của B3b tạo qua makeButton (0 setInteractive trần) 18ms
     → ui/button.ts là cửa duy nhất cho phản hồi chạm (DS:126/PC-U-06): render/scenes/MapScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96 | render/scenes/ScoreScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96 | render/scenes/ShopScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96 | render/scenes/EndScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96: expected [ …(4) ] to deeply equal []
 ✓ tests/logic/view-b3a-timing.test.ts (62 tests) 96ms
 ✓ tests/logic/view-b3b-contract.test.ts (22 tests) 40ms
 ✓ tests/logic/generator.test.ts (29 tests) 3658ms
   ✓ generator.levelSpec — PC-01 tham số chương là DỮ LIỆU, không hardcode > TC-GEN-11 · PC-03 + PC-01: dải chương 4..8 CÓ xuất hiện "cắt 1 góc chéo" hợp lệ; chương 1..3 chỉ đục lỗ 340ms
   ✓ B1/F-1 · cfg.punchCount được tôn trọng tuyệt đối trên bảng chương thật 8×15 > (b) 200 seed × HV/HVH/HHV × punchCount 3..4 ⇒ hoặc đủ, hoặc NÉM nêu chain + punchCount 574ms
 ✓ tests/logic/chain-config.test.ts (27 tests) 1116ms
   ✓ A1/F-1 · chainFor cấm nuốt foldCount ngoài bảng > 200 seed liên tiếp: mọi chuỗi tuân luật, tất định, và bảng không bị hẹp đến mức chỉ ra 1 chuỗi 824ms
 ✓ tests/logic/view-b3b-mapmodel.test.ts (24 tests) 44ms
 ✓ tests/logic/view-b3a-contract.test.ts (16 tests) 30ms
 ✓ tests/logic/fold-rules.test.ts (27 tests) 120ms
 ✓ tests/logic/save.test.ts (23 tests) 40ms
 ✓ tests/logic/view-b3a-geometry.test.ts (19 tests) 43ms
 ✓ tests/logic/validator.test.ts (32 tests) 52ms
 ✓ tests/logic/records.test.ts (19 tests) 80ms
 ✓ tests/logic/generator-10000.test.ts (11 tests) 23968ms
 ✓ tests/logic/level-state.test.ts (17 tests) 33ms
 ✓ tests/logic/i18n.test.ts (8 tests) 50ms
 ✓ tests/logic/economy.test.ts (18 tests) 20ms
 ✓ tests/logic/fold-unfold.test.ts (30 tests) 41ms
 ✓ tests/logic/rational.test.ts (26 tests) 28ms
 ✓ tests/logic/progression.test.ts (13 tests) 37ms
 ✓ tests/logic/hint-undo.test.ts (11 tests) 21ms
 ✓ tests/logic/records-store.test.ts (13 tests) 42ms
 ✓ tests/platform/debug.test.ts (19 tests) 32ms
 ✓ tests/platform/playgama-adapter.test.ts (11 tests) 20ms
 ✓ tests/platform/ad-mock.test.ts (8 tests) 217ms
 ✓ tests/platform/ytgame-adapter.test.ts (8 tests) 21ms
 ✓ tests/logic/telemetry.test.ts (9 tests) 184ms
 ✓ tests/platform/network-ban.test.ts (8 tests) 98ms
 ✓ tests/platform/host-shape.test.ts (10 tests) 18ms
stdout | tests/logic/scene-boot.test.ts > PlayScene khi boot (F2: hết test dò đường) > boot headless => đăng đủ rect HUD + 4 ô, số hữu hạn và không nhỏ hơn trần chạm
Phaser v4.2.1 (Headless | No Audio) https://phaser.io/v4021

stderr | tests/logic/scene-boot.test.ts > PlayScene khi boot (F2: hết test dò đường) > boot headless => đăng đủ rect HUD + 4 ô, số hữu hạn và không nhỏ hơn trần chạm
[sheet] thieu texture giay "skin_kraft" (BootScene nap tu manifest - xem console [boot])

stdout | tests/logic/scene-boot.test.ts > PlayScene khi boot (F2: hết test dò đường) > bốn ô đáp án không đè nhau trên màn hình (PC-03: bốn câu hỏi riêng)
Phaser v4.2.1 (Headless | No Audio) https://phaser.io/v4021

stderr | tests/logic/scene-boot.test.ts > PlayScene khi boot (F2: hết test dò đường) > bốn ô đáp án không đè nhau trên màn hình (PC-03: bốn câu hỏi riêng)
[sheet] thieu texture giay "skin_kraft" (BootScene nap tu manifest - xem console [boot])

stdout | tests/logic/scene-boot.test.ts > PlayScene khi boot (F2: hết test dò đường) > shutdown thì rect của màn chơi bị xoá khỏi registry (không còn vùng bấm vô hình)
Phaser v4.2.1 (Headless | No Audio) https://phaser.io/v4021

stderr | tests/logic/scene-boot.test.ts > PlayScene khi boot (F2: hết test dò đường) > shutdown thì rect của màn chơi bị xoá khỏi registry (không còn vùng bấm vô hình)
[sheet] thieu texture giay "skin_kraft" (BootScene nap tu manifest - xem console [boot])

 ✓ tests/logic/scene-boot.test.ts (4 tests) 211ms
 ✓ tests/logic/level-config.test.ts (6 tests) 44ms
 ✓ tests/logic/view-b3a-holes.test.ts (7 tests) 78ms
 ✓ tests/logic/stars.test.ts (13 tests) 25ms
 ✓ tests/platform/null-adapter.test.ts (10 tests) 15ms
 ✓ tests/logic/refactor-contract.test.ts (9 tests) 194ms
 ✓ tests/platform/standalone-full-loop.test.ts (6 tests) 12ms
 ✓ tests/platform/registry.test.ts (8 tests) 15ms
 ✓ tests/logic/validator-action.test.ts (9 tests) 51ms
 ✓ tests/logic/config-caps.test.ts (4 tests) 7ms
 ✓ tests/logic/share-code.test.ts (7 tests) 19ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/logic/view-b3b-states.test.ts > Phản hồi chạm <=150ms — PC-U-06 (E2E PC-U-06 · pack §4 DS:126) > PC-U-06 · pack §4: mọi node bấm được của B3b tạo qua makeButton (0 setInteractive trần)
AssertionError: ui/button.ts là cửa duy nhất cho phản hồi chạm (DS:126/PC-U-06): render/scenes/MapScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96 | render/scenes/ScoreScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96 | render/scenes/ShopScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96 | render/scenes/EndScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96: expected [ …(4) ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   "render/scenes/MapScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96",
+   "render/scenes/ScoreScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96",
+   "render/scenes/ShopScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96",
+   "render/scenes/EndScene.ts không dùng makeButton => mất DUR.fast + pressScale 0,96",
+ ]

 ❯ tests/logic/view-b3b-states.test.ts:577:104
    575|       }
    576|     }
    577|     expect(bad, 'ui/button.ts là cửa duy nhất cho phản hồi chạm (DS:12…
       |                                                                                                        ^
    578|   })
    579| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed | 38 passed (39)
      Tests  1 failed | 632 passed (633)
   Start at  10:49:05
   Duration  54.88s (transform 7.57s, setup 0ms, collect 10.79s, tests 30.88s, environment 21ms, prepare 4.10s)

```
Sửa cho cổng XANH. Chỉ sửa nguyên nhân gây đỏ (lỗi biên dịch, test đỏ, hoặc vi phạm gate-smell THẬT — mục "NỢ ĐÃ KHAI" thì bỏ qua).

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.
