# M4: DATA-MODEL — "Neon Grid" (Block Puzzle)

> Tool không database (game client-side). Mô tả cấu trúc dữ liệu LOGIC: grid, shapes, scoring, daily challenge, achievements, skins, power-ups, save schema.

---

## 1. CẤU TRÚC DỮ LIỆU CORE

### 1.1 Grid State
```
Grid = CellState[][]
CellState = number | null  // null = trống, 0-6 = index màu
Grid: 8×8 (GRID_SIZE = 8)
```

### 1.2 Shape (Block)
```
Shape = { cells: number[][], color: number }
// cells: 1=filled, 0=empty. color: 0-6 (palette index)
// 13 shape definitions (xem SPEC.md §6)
```

### 1.3 Position
```
Position = { row: number, col: number }
```

### 1.4 Game State (runtime)
```
GameState = {
  grid: Grid
  score: number
  isGameOver: boolean
  currentPieces: Shape[]
  linesCleared: number
  combo: number
  movesLeft: number          // daily mode: lines target
  isDailyMode: boolean
  powerUps: {                // remaining free uses
    undo: number             // default 3/game
    shuffle: number          // default 0 (rewarded only)
    bomb: number             // default 0 (rewarded only)
    extraSlot: number        // default 0 (rewarded only)
  }
}
```

---

## 2. SCORING
```
points = linesCleared × 100 × (1 + combo × 0.5)
All-clear bonus: points ×= 2
level = floor(score / 500) + 1
```

---

## 3. META PROGRESSION

### 3.1 Daily Challenge
```
DailyChallenge = {
  seed: number              // dateToSeed(YYYYMMDD)
  goalType: 'lines' | 'score'
  goalValue: number         // 10 + dayOfWeek (lines)
  completed: boolean
  rewardSkinId: number      // skin to unlock on complete
  attemptsUsed: number      // 1 free + rewarded
}
```

**Seed algorithm:** `hashInt(YYYYMMDD)` → deterministic piece sequence cho daily mode.

### 3.2 Achievement
```
Achievement = {
  id: string                // ACH-01 ... ACH-15
  name: string
  description: string
  condition: {
    type: 'score' | 'combo' | 'lines' | 'allClear' | 'shapes' | 'daily' | 'powerup'
    value: number
  }
  rewardSkinId: number | null
  unlocked: boolean
}
```

### 3.3 Skin
```
Skin = {
  id: number                // 0-6
  name: string
  unlocked: boolean
  unlockCondition: string   // display text
  palette: {
    gridColor: number       // HEX
    blockColors: number[]   // 7 colors
    accentColor: number
  }
}
```

### 3.4 Power-up (runtime)
```
PowerUp = {
  type: 'undo' | 'shuffle' | 'bomb' | 'extraSlot'
  freeUses: number          // per game
  remainingFree: number     // current game
  rewardedAd: boolean       // true = use rewarded ad when free exhausted
}
```

---

## 4. SAVE SCHEMA

### 4.1 Full Save Data
```json
{
  "version": 1,
  "score": 4200,
  "achievements": {
    "ACH-01": true,
    "ACH-02": true,
    "ACH-03": false,
    ...
  },
  "skins": {
    "unlocked": [0, 1],
    "activeSkin": 1
  },
  "daily": {
    "lastDate": "2026-08-26",
    "completed": false,
    "attemptsUsed": 0
  },
  "stats": {
    "totalScore": 15000,
    "totalLines": 320,
    "totalGames": 45,
    "shapesUsed": [12, 8, 15, 5, 3, 7, 10, 2, 4, 6, 9, 11, 1],
    "powerUpsUsed": {
      "undo": 12,
      "shuffle": 3,
      "bomb": 5,
      "extraSlot": 1
    }
  }
}
```

### 4.2 Load Strategy
1. Try Playgama bridge.storage.get() → fallback localStorage.
2. Nếu không có save → default state (skin 0 unlocked, no achievements).
3. Version check: nếu version cũ → migrate (hiện tại chỉ v1).

---

## 5. FLOW: META PROGRESSION

### 5.1 Daily Challenge Flow
```
1. Start screen → tap "DAILY"
2. Gameplay khởi tạo với daily seed
3. HUD hiện daily progress: "Clear N lines [████░░]"
4. Mỗi lần clear → update progress
5. Đạt goal → popup "DAILY COMPLETE! Reward: Skin X"
6. Tap CLAIM → unlock skin, save daily.completed = true
7. Game over → save daily.attemptsUsed++
8. Attempts hết → rewarded ad để thêm attempt
```

### 5.2 Achievement Check Flow
```
1. Game over → check all achievements
2. For each uncompleted achievement → check condition
3. Nếu đạt → unlock, popup "🏆 NEW! Achievement Name"
4. Nếu có reward skin → unlock skin
5. Save achievements state
```

### 5.3 Skin Apply Flow
```
1. Skin select → tap skin → preview
2. Tap APPLY → save activeSkin
3. Gameplay → render grid + blocks với palette của skin
```

---

## 6. DESIGN DECISIONS

| Decision | Rationale |
|----------|-----------|
| Daily seed deterministic | Công bằng cho mọi người chơi, cùng thử thách |
| 15 achievements | Đủ để giữ chân 2-3 tuần, không quá nhiều |
| 7 skin | Mỗi skin 1 phong cách riêng, đủ đa dạng |
| Power-up rewarded ad | Monetize không intrusive |
| Undo free 3 lần/game | Không phạt người chơi mới, vẫn khuyến khích xếp chiến lược |
| Stats tracking | Dữ liệu cho future leaderboard / social features |

---

## 7. PERFORMANCE

- Grid operations: O(64) per frame — negligible.
- Achievement check: 15 conditions, O(1) each — sau game over, không ảnh hưởng gameplay.
- Skin palette: 7 pre-defined, O(1) lookup.
- Save: async, < 10ms, only on game over + achievement unlock.