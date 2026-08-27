# YouTube Playables Games — AGENTS.md

> Hướng dẫn cho AI agents (Hermes, Claude Code, ...) làm việc với project này.

## Kiến trúc

```
game-factory/                    # Monorepo (pnpm workspace)
├── packages/
│   ├── core/       @game/core  — UI components (Button, Modal, ScoreText, Particle)
│   ├── sdk/        @game/sdk   — Universal SDK: Reddit → Playgama → ytgame → Mock
│   └── pipeline/               — Python pipeline (validate, package)
├── g4-<game>/                  — Game mới (monorepo, multi-platform build)
├── M3-Juicy-Merge/             — Game cũ (standalone)
├── M2-Color-Sort/              — Game cũ (standalone)
└── M1-Rescue-Dodge/            — Game cũ (standalone)
```

## 1 Source, Multiple Platform

Từ M4 trở đi, mỗi game build ra nhiều platform từ 1 source:

```bash
cd g4-<game>
pnpm run build              # Build ALL platforms
pnpm run build:playgama     # Playgama (+ CDN bridge)
pnpm run build:standalone   # Local dev
pnpm run build:ytgame       # YouTube Playables
```

Output: `dist/` với `index.html`, `playgama.html`, `ytgame.html` + shared assets.

## @game/sdk — Universal SDK

**File:** `packages/sdk/src/`
**Priority detection:** Reddit Devvit → Playgama Bridge → ytgame → Mock (local)

```ts
import { sdk } from "@game/sdk";
await sdk.initialize();
sdk.saveData({ score: 100 });
const lb = await sdk.getLeaderboardEntries();
```

## Game convention

| Layer         | Mô tả                                              |
| ------------- | -------------------------------------------------- |
| `src/logic/`  | Pure TS, 0 Phaser dependency. Testable via vitest. |
| `src/scenes/` | Phaser scenes, mỏng (orchestrate).                 |
| `src/render/` | Phaser adapter (vẽ Graphics, grid, blocks).        |
| `src/ui/`     | GameTheme interface (per-game theme).              |
| `src/audio/`  | Web Audio API synth (không file MP3).              |

## Stack

- **Engine:** Phaser 4.2.1 (vite + TS, WebGL)
- **SDK:** @game/sdk (Reddit/Playgama/ytgame/Mock)
- **UI:** @game/core (Button, Modal, ScoreText, Particle)
- **Build:** pnpm workspace, Vite multi-page
- **Test:** vitest (logic layer)

## Quy tắc

1. Code TIẾNG ANH, SPEC tiếng Việt (cho anh Tuyền đọc).
2. Đọc SPEC trước, code sau (5 file: SPEC/DESIGN-SPEC/DATA-MODEL/TEST-CASES/E2E).
3. Logic game = pure TS, tách khỏi Phaser (render adapter pattern), UI/UX chuẩn studio game chuyên nghiệp.
4. Mỗi game có `GameTheme` riêng (ko dùng shared tokens).
5. Meta progression: Daily Challenge + 15 Achievements + 7 Skins + Power-ups.
6. Mobile-first: portrait 720×1280 (9:16), touch input, Scale.FIT.
7. Chỉ push khi anh Tuyền nói "push đi em".
