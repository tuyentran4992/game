# M11 — Paper Crease · STRUCTURE (cây thư mục chốt + pattern ↔ file)

> File này chốt **ranh giới & hợp đồng** giữa các file TRƯỚC batch code đầu tiên (bài học doc-cung-be: làm muộn phải mở batch REFACTOR).
> Mỗi file trong `game/src/` ghi dòng đầu `// Pattern: <tên>` theo bảng dưới. Prompt mỗi batch phải nhắc lại pattern của file sẽ sửa.

## 1. Cây thư mục chốt

```
M11-Gap/
├── specs/1-paper-crease/     SPEC.md · DESIGN-SPEC.md · DATA-MODEL.md · TEST-CASES.md · E2E-TESTS.md · CATALOG-CHECK.md · PROMPT.md
├── docs/                     ARCHITECTURE.md · STRUCTURE.md   (Hermes giữ; agent CHỈ ĐỌC)
└── game/                     ← khớp pipeline: validate.py đọc game/src, package.py gói game/dist
    ├── src/
    │   ├── logic/            THUẦN TS — 0 import Phaser / DOM / SDK  (lưới an toàn của cả game)
    │   │   ├── rational.ts     Pattern: Value Object            số hữu tỉ lưới 2^n, so khớp CHÍNH XÁC
    │   │   ├── foldRules.ts    Pattern: Registry + Strategy     bảng tra kiểu gấp (H/V/D) & kiểu cắt
    │   │   ├── generator.ts    Pattern: Factory + Seed          seed → LevelSpec (đáp án + 3 nhiễu)
    │   │   ├── validator.ts    Pattern: Specification           cổng PC-03/PC-04
    │   │   ├── levelState.ts   Pattern: State machine           ready→answered→correct/wrong→next
    │   │   ├── progression.ts  Pattern: Registry                chương/sao/mở khoá (PC-01/06/07)
    │   │   ├── economy.ts      Pattern: Registry + data         Mực/skin/album/huy hiệu (PC-11/12)
    │   │   ├── records.ts      Pattern: Memento                 ghost, streak phiên, top-5, mã seed
    │   │   ├── save.ts         Pattern: Memento + migration     schema version + migrate (PC-16)
    │   │   ├── telemetry.ts    Pattern: Ring buffer             event ≤100KB local (PC-15)
    │   │   └── i18n.ts         Pattern: Registry                chỉ EN ở bản nộp (PC-19)
    │   ├── platform/         cổng ra nền tảng — nơi DUY NHẤT biết SDK
    │   │   ├── types.ts        Pattern: Interface (Strategy)    Storage · Ads · Lifecycle
    │   │   ├── nullAdapter.ts  Pattern: Null Object             standalone: localStorage, không ad
    │   │   ├── playgamaAdapter.ts · ytgameAdapter.ts · sdkAdapter.ts
    │   │   └── index.ts        Pattern: Factory                 chọn adapter theo môi trường
    │   ├── render/           Phaser — MỎNG, chỉ hiển thị + nhận input
    │   │   ├── scenes/         Boot · Title · Map · Play · Score · Shop · End
    │   │   ├── components/     SheetView · OptionCard · StarRow · InkBadge
    │   │   └── theme/paperTheme.ts  Pattern: Registry           theme giấy theo chương
    │   ├── ui/               cầu nối dùng component @game/core (không tự vẽ lại nút/panel)
    │   └── main.ts           entrypoint: chọn adapter → boot scene
    ├── config/               chapters.json · skins.json · stars.json · album.json  (CẤU HÌNH = DỮ LIỆU)
    ├── public/raw/           ảnh WAN (giấy, hoa văn, huy hiệu) + sfx mp3 — <512KB/file
    ├── tests/                logic/*.test.ts (vitest) + fixtures
    └── index.html · playgama.html · ytgame.html · vite.config.ts · package.json
```

## 2. Pattern ↔ file (bắt buộc)

| File | Pattern | Vì sao (biến thiên đã biết) | Cấm |
|---|---|---|---|
| `logic/rational.ts` | Value Object | so khớp vị trí lỗ phải CHÍNH XÁC (float là gốc lỗi cũ) | dùng `number` cho toạ độ lỗ |
| `logic/foldRules.ts` | Registry + Strategy | thêm kiểu gấp/cắt mới = thêm **1 dòng dữ liệu** | chuỗi `if/else` theo kiểu gấp |
| `logic/generator.ts` | Factory + Seed | mọi màn sinh từ seed, tái lập cho test | dùng `Math.random()` |
| `logic/levelState.ts` | State machine | trạng thái màn hữu hạn, phải test được | boolean rời rạc rải rác |
| `logic/progression.ts`, `economy.ts` | Registry | thêm chương/skin/huy hiệu = thêm dữ liệu | hardcode số chương/skin trong scene |
| `logic/save.ts` | Memento + migration chain | schema sẽ đổi khi thêm tính năng | đọc/ghi save rải rác trong scene |
| `platform/*` | Strategy + Null Object | ≥3 nền tảng; standalone không có SDK | `if (nền tảng === ...)` trong logic |
| `render/scenes/*` | MVC mỏng (view) | đổi hiển thị không phá luật | gọi SDK trực tiếp; tự viết lại component core |
| `render/theme/paperTheme.ts` | Registry | 8 chương, thêm theme = thêm dữ liệu | hardcode HEX trong scene |

## 3. Ranh giới 1 CHIỀU (kiểm bằng máy)
```
config (dữ liệu)  →  logic (thuần)  →  platform (interface)  →  render  →  main
```
- ``game/src/logic/` **cấm** import: `phaser`, `window`, `document`, `@game/sdk`, `platform/*`. Cổng kiểm: grep + test chạy trong môi trường Node thuần.
- `game/src/render/` cấm chứa luật nghiệp vụ (không tự tính đáp án — chỉ hiển thị `LevelSpec` do `logic` đưa).
- Chỉ `game/src/platform/` được biết tên nền tảng.

## 4. Hợp đồng type (mức khung — không phải implementation)
- `LevelSpec { seed, folds[], action (punch|cut), holes[], options[4], correctIndex, difficulty, timerOn }`
- `PlatformAdapter { storage.get/set, ads.showRewarded/showInterstitial/available, lifecycle.onPause/onResume/mute }`
- `SaveV1 { version, progress{n, stars{}}, ink, ownedSkins[], activeSkin, album[], badges[], ghost{}, streak{}, top5[], masterUnlocked }`
- `LevelResult { level, correct, usedHint, firstTry, ms, inkEarned }`

## 5. Cổng kiểm trước khi báo "xong" batch
1. `cd game && npm run typecheck` — 0 lỗi.
2. `npm run test:logic` — vitest xanh (đề luôn có đáp án, seed ổn định, sao, mở khoá, save/migrate).
3. `grep -rn "phaser\|@game/sdk" game/src/logic` → **rỗng**.
4. `grep -rn "Math.random" game/src/logic` → **rỗng**.
5. Không file nào trong `game/src/logic` có `if/else` ≥3 nhánh (phải là bảng tra).
6. `npm run build` — bundle <5MB, 0 network call (kiểm bằng `validate.py` của pipeline).
