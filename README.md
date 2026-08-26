# YouTube Playables Games

Business: làm **casual HTML5 game** đưa lên [YouTube Playables](https://www.youtube.com/playables) ("Chơi game trên YouTube" — chơi ngay trên app YouTube, không cần tải).

- **Mục tiêu**: dựng **factory pipeline** (Python + AI-gen asset) tạo nhanh nhiều hyper-casual game, xuất bản sớm lên Playables để xây player-base, chờ **IAP bật (cuối 2026 → 2027)** thành dòng doanh thu recurring.
- **Kênh tiền hiện tại**: ads do YouTube tự đặt qua SDK (pre-roll / interstitial / rewarded) — chia doanh thu qua **pilot publisher** (vd Mediacube, Playgama). Game KHÔNG tự nhét ads/IAP.
- **Thị trường**: 2,7 tỷ user YouTube; shelf Playables đang cho game "2–4 tỷ lượt chơi".
- **Stack**: pipeline = **Python 3.11+** (CLI: sinh asset AI, scaffold code, validate, đóng gói). Game output = **Phaser 3 (JS/WebGL)**. Sinh asset = **AI-Box/WAN**.
- **Kiến trúc "1 source, multiple platform"**: `@game/sdk` (universal SDK) + Vite multi-platform build.

## Cấu trúc thư mục

```
/data/youtube-playables/
├── README.md
├── STATUS.md             ← Business status cập nhật
├── docs/                 ← Research, ghi chú nền tảng
├── scripts/              ← Pipeline scripts
├── packages/
│   ├── core/             @game/core — UI components
│   ├── sdk/              @game/sdk — Universal multi-platform SDK
│   └── pipeline/         Python pipeline
├── g4-neon-grid/         ← M4: Block Puzzle (monorepo, multi-platform)
├── M3-Juicy-Merge/       ← M3: Physics Merge (standalone, multi-platform SDK)
├── M2-Color-Sort/        ← M2: Color Sort (standalone)
├── M1-Rescue-Dodge/      ← M1: Rescue Dodge (standalone)
└── reddit/               ← Reddit Devvit ports
```

## Danh sách module

| Module | Mô tả | Status | Kiến trúc |
|--------|-------|--------|-----------|
| M1 | Rescue/Dodge — "Cứu Mèo" | ✅ Complete | Standalone |
| M2 | Color Sort — "Neon Sort" | ✅ Complete | Standalone |
| M3 | Physics Merge — "Juicy Merge" | ✅ Complete, submitted Playgama | Standalone + multi SDK |
| M4 | Block Puzzle — "Neon Grid" | ✅ Code + Build, chờ QA | Monorepo + multi-platform |

## Multi-platform build

Từ M4 trở đi, mỗi game build ra nhiều platform từ 1 source:

```bash
cd g4-neon-grid
pnpm run build              # Build ALL platforms
pnpm run build:playgama     # Chỉ Playgama
pnpm run build:standalone   # Chỉ standalone
```

## Cách chạy game

```bash
# M4 dev
cd g4-neon-grid && pnpm run dev

# M3 dev
cd M3-Juicy-Merge && npm run dev:web

# M1 dev
cd M1-Rescue-Dodge/game && npm install && npm run dev
```

> Lưu ý: `game/dist/`, `node_modules/`, `build/` không đẩy lên git.