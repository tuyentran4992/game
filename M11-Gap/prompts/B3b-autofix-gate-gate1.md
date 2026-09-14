Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B3b (đợt gate1).

Cổng máy `npm run gate` của batch B3b ĐANG ĐỎ. Output thật (cuối):
```

> paper-crease@0.1.0 gate
> npm run typecheck && npm run test:logic && node tools/gate-smell.mjs


> paper-crease@0.1.0 typecheck
> tsc --noEmit

src/main.ts(35,28): error TS2306: File '/data/youtube-playables/M11-Gap/game/src/render/scenes/AlbumScene.ts' is not a module.
src/main.ts(37,26): error TS2306: File '/data/youtube-playables/M11-Gap/game/src/render/scenes/EndScene.ts' is not a module.
src/main.ts(38,26): error TS2306: File '/data/youtube-playables/M11-Gap/game/src/render/scenes/MapScene.ts' is not a module.
src/main.ts(40,28): error TS2306: File '/data/youtube-playables/M11-Gap/game/src/render/scenes/ScoreScene.ts' is not a module.
src/main.ts(41,27): error TS2306: File '/data/youtube-playables/M11-Gap/game/src/render/scenes/ShopScene.ts' is not a module.
src/render/components/SkinCard.ts(129,19): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string | CanvasGradient | CanvasPattern'.
src/render/viewmodel/mapModel.ts(15,52): error TS6133: 'STAR_SCALE' is declared but its value is never read.
```
Sửa cho cổng XANH. Chỉ sửa nguyên nhân gây đỏ (lỗi biên dịch, test đỏ, hoặc vi phạm gate-smell THẬT — mục "NỢ ĐÃ KHAI" thì bỏ qua).

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.
