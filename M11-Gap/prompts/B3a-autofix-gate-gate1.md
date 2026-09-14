Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B3a (đợt gate1).

Cổng máy `npm run gate` của batch B3a ĐANG ĐỎ. Output thật (cuối):
```

> paper-crease@0.1.0 gate
> npm run typecheck && npm run test:logic && node tools/gate-smell.mjs


> paper-crease@0.1.0 typecheck
> tsc --noEmit

src/main.ts(146,35): error TS2345: Argument of type 'Save | undefined' is not assignable to parameter of type 'Save'.
  Type 'undefined' is not assignable to type 'Save'.
src/main.ts(147,37): error TS2345: Argument of type 'Save | undefined' is not assignable to parameter of type 'Save'.
  Type 'undefined' is not assignable to type 'Save'.
src/main.ts(148,38): error TS18048: 'save' is possibly 'undefined'.
src/main.ts(150,76): error TS18048: 'save' is possibly 'undefined'.
src/main.ts(156,16): error TS18048: 'save' is possibly 'undefined'.
src/main.ts(157,45): error TS18048: 'save' is possibly 'undefined'.
src/main.ts(162,7): error TS2322: Type '{ stars: string; level: number; rev: number; version?: number | undefined; ink?: number | undefined; skins_owned?: string[] | undefined; album_items?: AlbumItem[] | undefined; badges?: Badge[] | undefined; sound_on?: boolean | undefined; ghosts?: string[] | undefined; walls?: number[][] | undefined; dates?: string[]...' is not assignable to type 'Save'.
  Types of property 'version' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
src/main.ts(164,28): error TS18048: 'save' is possibly 'undefined'.
src/main.ts(166,14): error TS18048: 'save' is possibly 'undefined'.
src/main.ts(174,20): error TS18048: 'save' is possibly 'undefined'.
src/main.ts(176,7): error TS2322: Type '{ sound_on: boolean; version?: number | undefined; level?: number | undefined; stars?: string | undefined; ink?: number | undefined; skins_owned?: string[] | undefined; album_items?: AlbumItem[] | undefined; ... 4 more ...; dates?: string[] | undefined; }' is not assignable to type 'Save'.
  Types of property 'version' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
src/main.ts(176,36): error TS18048: 'save' is possibly 'undefined'.
src/main.ts(178,14): error TS18048: 'save' is possibly 'undefined'.
src/main.ts(193,33): error TS2551: Property 'Fit' does not exist on type 'typeof Scale'. Did you mean 'FIT'?
src/render/components/InkBadge.ts(16,26): error TS2339: Property 'circle' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/InkBadge.ts(17,28): error TS2339: Property 'text' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/OptionCard.ts(8,26): error TS2307: Cannot find module '../../../logic/rational' or its corresponding type declarations.
src/render/components/OptionCard.ts(9,28): error TS2307: Cannot find module '../../../logic/types' or its corresponding type declarations.
src/render/components/OptionCard.ts(37,27): error TS2339: Property 'rectangle' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/OptionCard.ts(38,27): error TS2339: Property 'rectangle' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/OptionCard.ts(39,27): error TS2339: Property 'text' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/OptionCard.ts(42,29): error TS2339: Property 'circle' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/SheetView.ts(9,26): error TS2307: Cannot find module '../../../logic/rational' or its corresponding type declarations.
src/render/components/SheetView.ts(10,38): error TS2307: Cannot find module '../../../logic/types' or its corresponding type declarations.
src/render/components/SheetView.ts(84,27): error TS2339: Property 'rectangle' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/SheetView.ts(85,27): error TS2339: Property 'image' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/SheetView.ts(88,33): error TS2339: Property 'rectangle' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/SheetView.ts(90,29): error TS2339: Property 'graphics' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/SheetView.ts(91,26): error TS2339: Property 'graphics' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/SheetView.ts(93,29): error TS2339: Property 'circle' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/SheetView.ts(97,26): error TS2339: Property 'rectangle' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/SheetView.ts(98,27): error TS2339: Property 'rectangle' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/components/SheetView.ts(290,27): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
src/render/components/StarRow.ts(20,29): error TS2339: Property 'circle' does not exist on type '<T extends Phaser.GameObjects.GameObject>(child: T | T[]) => this'.
src/render/scenes/BootScene.ts(40,10): error TS2339: Property 'createProgressBar' does not exist on type 'BootScene'.
src/render/scenes/PlayScene.ts(192,31): error TS2339: Property 'layout' does not exist on type 'PlayScene'.
src/render/scenes/TitleScene.ts(29,11): error TS2416: Property 'sound' in type 'TitleScene' is not assignable to the same property in base type 'Scene'.
  Type 'ButtonView' is not assignable to type 'NoAudioSoundManager | HTML5AudioSoundManager | WebAudioSoundManager'.
src/render/scenes/TitleScene.ts(29,11): error TS4114: This member must have an 'override' modifier because it overrides a member in the base class 'Scene'.
src/render/scenes/TitleScene.ts(42,28): error TS2345: Argument of type 'this' is not assignable to parameter of type 'Scene'.
  Type 'TitleScene' is not assignable to type 'Scene'.
    Property 'sound' is private in type 'TitleScene' but not in type 'Scene'.
src/render/scenes/TitleScene.ts(44,28): error TS2345: Argument of type 'this' is not assignable to parameter of type 'Scene'.
  Type 'TitleScene' is not assignable to type 'Scene'.
    Property 'sound' is private in type 'TitleScene' but not in type 'Scene'.
src/render/scenes/TitleScene.ts(45,29): error TS2345: Argument of type 'this' is not assignable to parameter of type 'Scene'.
  Type 'TitleScene' is not assignable to type 'Scene'.
    Property 'sound' is private in type 'TitleScene' but not in type 'Scene'.
src/render/scenes/TitleScene.ts(61,12): error TS2345: Argument of type 'this' is not assignable to parameter of type 'Scene'.
  Type 'TitleScene' is not assignable to type 'Scene'.
    Property 'sound' is private in type 'TitleScene' but not in type 'Scene'.
src/ui/button.ts(18,57): error TS2551: Property 'setFillStyle' does not exist on type 'Graphics'. Did you mean 'fillStyle'?
tests/logic/view-b3a-contract.test.ts(30,55): error TS2307: Cannot find module 'node:fs' or its corresponding type declarations.
tests/logic/view-b3a-contract.test.ts(31,31): error TS2307: Cannot find module 'node:url' or its corresponding type declarations.
tests/logic/view-b3a-geometry.test.ts(64,42): error TS2307: Cannot find module 'node:fs' or its corresponding type declarations.
tests/logic/view-b3a-timing.test.ts(51,42): error TS2307: Cannot find module 'node:fs' or its corresponding type declarations.
tests/logic/view-b3a-timing.test.ts(52,31): error TS2307: Cannot find module 'node:url' or its corresponding type declarations.
```
Sửa cho cổng XANH. Chỉ sửa nguyên nhân gây đỏ (lỗi biên dịch, test đỏ, hoặc vi phạm gate-smell THẬT — mục "NỢ ĐÃ KHAI" thì bỏ qua).

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.
