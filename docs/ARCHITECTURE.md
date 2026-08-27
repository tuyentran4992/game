# Game Factory — Kiến trúc tổng thể (v2, 2026-08-27)

> **Nguồn sự thật cho MỌI game và MỌI agent.** AGENTS.md tham chiếu file này.
> Bài học nền tảng: M3 "Juicy Merge" bị Playgama reject (clone) trong khi Reddit Devvit vẫn mở → kiến trúc phải phục vụ **đa nền tảng, mỗi kênh một đường sống riêng**.

## 1. Nguyên tắc cốt lõi

1. **1 source → N nền tảng.** Mỗi game build ra: `standalone` (dev/QA) · `playgama` · `reddit` (Devvit) · `ytgame` (YouTube Playables). Không bao giờ fork code theo platform — chỉ khác entry + SDK backend.
2. **Dùng chung là nguồn duy nhất.** CẤM copy `pipeline/` hoặc SDK vào trong game. Bug sửa 1 lần ở `packages/`, mọi game nhận.
3. **Meta progression thuộc về factory, không thuộc về game.** Daily/achievements/skins/continue/save-migration = `@game/meta` (pure TS). Game mới cắm vào, không viết lại.
4. **Mỗi nền tảng một kênh nộp, một hồ sơ.** Trước khi nộp BẤT KỲ kênh nào: check trùng tên + check trùng gameplay trên catalog kênh đó (xem `docs/SUBMISSIONS.md`).
5. **Prototype phải CHƠI VUI trước khi đẹp.** QA gameplay (fun pass) là gate cứng trước khi đầu tư art/packaging — bài học M3 v2 "Potion Panic": đúng checklist anti-clone nhưng chơi chán → dừng sớm, không nộp.

## 2. Sơ đồ thư mục đích

```
game-factory/                    # pnpm workspace
├── packages/
│   ├── core/       @game/core   # Button/Modal/ScoreText/Particle, GameTheme,
│   │                            #   AudioManager (Web Audio synth), GameEngine, InputManager
│   ├── sdk/        @game/sdk    # Universal SDK — detection: Reddit Devvit → Playgama
│   │                            #   Bridge → ytgame → Mock(local). API: initialize/saveData/
│   │                            #   loadData/sendScore/getLeaderboard/showAd/pause
│   ├── meta/       @game/meta   # ★ MỚI — trích từ M3: daily-challenge, achievements,
│   │                            #   continue(+rewarded), skins, save schema + migration, combo
│   └── pipeline/                # Python DUY NHẤT: scaffold · validate · package
│                                #   (mọi game cùng 1 schema yaml, game-specific field optional)
├── games/<slug>/                # ★ game TƯƠNG LAI (M5+): g5-xxx → games/xxx
│   ├── specs/                   #   5 file (SPEC/DESIGN-SPEC/DATA-MODEL/TEST-CASES/E2E-TESTS)
│   │   └── <version>/           #   versioned nếu pivot (bài học M3: specs/1-…, specs/2-…)
│   ├── game/
│   │   ├── src/config/          #   MỌI số tuned (TS, typechecked) — scene cấm magic number
│   │   ├── src/logic/           #   pure TS, 0 Phaser, vitest cover 100%
│   │   ├── src/render/          #   Phaser adapter (Graphics/sprite/FX) — mỗi piece 1 file
│   │   ├── src/scenes/          #   MỎNG (<400 dòng/scene): state machine + wire
│   │   ├── src/ui/              #   GameTheme per-game
│   │   └── dist/<platform>/     #   output build theo platform
│   └── games/<slug>.yaml        #   metadata cho pipeline validate/package
├── M1/ M2/ M3/                  # thế hệ cũ — FREEZE (không migrate, không tính nợ)
├── g4-neon-grid/                # thế hệ monorepo đầu — giữ, cleanup dần
├── scripts/
│   ├── verify_game.sh           # gate: typecheck → vitest → build all platforms
│   └── tools/                   # gen_sprites/gen_audio THAM SỐ HÓA (1 lệnh mọi game)
└── docs/
    ├── ARCHITECTURE.md          # file này
    ├── DESIGN-SYSTEM.md         # chuẩn visual cấp business
    ├── SUBMISSIONS.md           # ★ sổ nộp game đa kênh + pre-submit checklist
    ├── playgama-integration.md
    └── reddit-devvit-integration.md
```

## 3. Ranh giới các tầng (bất di bất dịch)

| Tầng | Dependency | Test | Ví dụ |
|---|---|---|---|
| `packages/*` | SDK backend = platform-specific; còn lại pure | vitest trong package | `@game/sdk` handler |
| `src/config/` | không import gì | typecheck là đủ | heat rates, scores, quota |
| `src/logic/` | chỉ import `config` + `@game/meta` | **vitest, deterministic seed** | merge graph, settle, orders |
| `src/render/` | Phaser + logic types | QA browser/vision | BucketRenderer, OrbSprite, HeatRing |
| `src/scenes/` | tất cả, nhưng **mỏng** | E2E (Hermes Playwright+vision) | Gameplay = state machine |

Quy tắc chống god-class: scene > 600 dòng là **báo đỏ** — tách manager (InputController, HudManager, MergeProcessor, EffectsManager) như pattern `g4` đang làm.

## 4. Multi-platform build & nộp

```
vite build --mode <platform>   # standalone | playgama | reddit | ytgame
```
- **Reddit Devvit**: `devvit playtest/deploy` — ít ràng buộc originality nhất, leaderboard qua server riêng (Hono+Redis trong `game/src/server/`). **Kênh nộp ĐẦU TIÊN khi nghi ngờ bị clone.**
- **Playgama**: bắt buộc Game Ready event + save qua Bridge SDK, minimize-mute, globe ngôn ngữ, grep catalog trước (đã có 4+ Suika clone + trùng tên làm M3 reject).
- **YouTube Playables**: chưa mở indie rộng; giữ qua Mediacube/publisher khi IAP bật (cuối 2026).
- Trước MỌI submission, chạy `docs/SUBMISSIONS.md` §checklist.

## 5. Quy trình mỗi game (factory pipeline)

1. **Concept** → chơi được ngay bằng placeholder (spike ≤ 1 ngày) vào thẳng `<GameFolder>/game/` (vd `M5-Peel/game/`) → **fun gate: anh Tuyền chơi thử, OK mới đi tiếp**. Spec + prompt nằm trong `<GameFolder>/specs/1-<slug>/` (SPEC.md + PROMPT.md — prompt code đi kèm đúng version spec của nó). KHÔNG tạo `prototypes/` hay file prompt rời ở folder game, KHÔNG hardcode đường dẫn absolute của máy cá nhân vào prompt/docs — repo tự detect cwd.
2. SPEC 5 file (spec-authoring) + anti-clone check theo TỪNG nền tảng định nộp.
3. Code theo bước, mỗi bước verify độc lập (typecheck/vitest/build/browser).
4. Art: mặc định programmatic (`@game/core` tokens) → WAN sprite chỉ khi duyệt.
5. QA browser + vision thật (§E2E-TESTS) — "chạy được" ≠ "đẹp" ≠ "vui".
6. `verify_game.sh` + `pipeline validate` + package **từng platform**.
7. Nộp theo `SUBMISSIONS.md`; reject → pivot nhanh, đóng băng spec vào `specs/<n>-<tentru>/`, KHÔNG xóa.

## 6. Nợ cần trả (thứ tự ưu tiên)

| # | Việc | Khi nào |
|---|---|---|
| 1 | `docs/SUBMISSIONS.md` + pre-submit checklist | **Xong hôm nay** (file này kèm) |
| 2 | Xóa `platforms/` rỗng trong g4 (dead scaffolding) | khi cleanup g4 |
| 3 | Extract `@game/meta` từ M3 (move + re-export, test cũ pass) | trước M5 |
| 4 | Thống nhất 1 `packages/pipeline`, xóa copy trong M1/M3 | trước M5 |
| 5 | `create-game` scaffold → `games/<slug>` chuẩn mới | M5 |
| 6 | M1–M3: freeze, chỉ đụng khi anh Tuyền yêu cầu | — |

## 7. Bài học đã chốt (không lặp lại)

- **Reject vì clone là reject GAMEPLAY, không phải art.** Đổi tên/màu/sprite không cứu được. Pivot = đổi động từ cốt lõi hoặc dừng.
- **Fun gate trước polish gate.** Đầu tư code + art + packaging cho bản không vui = lãng phí 1 vòng tuần.
- **Không có kênh nào là "duy nhất".** Reddit/Playgama/ytgame mỗi kênh duyệt theo luật riêng; slide khi 1 kênh reject.
- **Dùng chung nhưng đừng vội lift sớm.** Chỉ đẩy lên `packages/` khi có game thứ 2 cần (quy tắc "rule of two") — trừ SDK/pipeline/meta đã proof.
