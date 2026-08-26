# M4: DATA-MODEL — "Neon Grid" (Block Puzzle)

> **Tool không database (game client-side).** File này mô tả cấu trúc dữ liệu LOGIC: grid state, shape format, scoring, save schema.

---

## 1. CẤU TRÚC DỮ LIỆU

### 1.1 Grid State
```
Grid = CellState[][]
CellState = number | null
  - null: ô trống
  - number (0-6): index màu block (xem DESIGN-SPEC §1.3)

Grid: 8×8 (GRID_SIZE = 8)
  grid[row][col] — row 0=trên cùng, col 0=trái nhất
```

### 1.2 Shape (Block)
```
Shape = {
  cells: number[][]   // 2D matrix: 1=filled, 0=empty
  color: number       // 0-6 (index vào blockColors palette)
}

13 shape definitions:
  mono:       [[1]]                    // 1×1
  domino_h:   [[1,1]]                  // 1×2
  domino_v:   [[1],[1]]                // 2×1
  l_bent:     [[1,0],[1,1]]            // L-shape
  l_reverse:  [[0,1],[1,1]]            // L-reverse
  triple_h:   [[1,1,1]]                // 1×3
  triple_v:   [[1],[1],[1]]            // 3×1
  o:          [[1,1],[1,1]]            // 2×2
  t:          [[1,1,1],[0,1,0]]        // T-shape
  l:          [[1,1,1],[1,0,0]]        // L 4-cell
  j:          [[1,1,1],[0,0,1]]        // J 4-cell
  i_h:        [[1,1,1,1]]              // 1×4
  i_v:        [[1],[1],[1],[1]]        // 4×1
```

### 1.3 Position
```
Position = { row: number, col: number }
```

### 1.4 Game State (runtime)
```
GameState = {
  grid: Grid                    // 8×8 grid hiện tại
  score: number                 // điểm hiện tại
  isGameOver: boolean           // true khi kẹt
  currentPieces: Shape[]        // 3 block dự trữ
  linesCleared: number          // tổng số line đã clear
  combo: number                 // combo streak (reset khi không clear)
}
```

---

## 2. SCORING

### 2.1 Công thức
```
points = linesCleared × 100 × (1 + combo × 0.5)

linesCleared = rowsCleared + colsCleared (trong 1 lần đặt)
combo: số lần clear liên tiếp (không clear → reset về 0)

All-clear bonus (grid rỗng hoàn toàn sau khi clear):
  points ×= 2
```

### 2.2 Level
```
level = floor(score / 500) + 1
```

### 2.3 ScoreEvent
```
ScoreEvent = {
  linesCleared: number    // tổng line clear
  rowsCleared: number     // số hàng clear
  colsCleared: number     // số cột clear
  combo: number           // combo hiện tại
  pointsEarned: number    // điểm được thưởng
}
```

---

## 3. SAVE SCHEMA

### 3.1 localStorage / Playgama bridge
```json
{
  "score": 4200,
  "version": 1
}
```

- Chỉ lưu best score (không lưu board state).
- Key: `game_save` (localStorage) / bridge.storage (Playgama).
- Version: dùng cho future migration (hiện tại = 1).

### 3.2 Load strategy
1. Try Playgama bridge.storage.get() → fallback localStorage.
2. Nếu không có save → return `{ score: 0 }`.

---

## 4. FLOW: ĐẶT BLOCK

```
1. User tap piece card → selectedPieceIndex = index
2. User tap grid position → screenToGrid(screenX, screenY) → Position
3. canPlace(grid, shape, position) → boolean
4. Nếu hợp lệ:
   a. grid = placeShape(grid, shape, position)  // mutate copy
   b. result = clearLines(grid)                  // check hàng/cột đầy
   c. Nếu result có cleared:
      - combo++
      - score += scorePlacement(clearedRows, clearedCols, combo, isEmpty)
      - grid = result.grid
      - Animation: particle burst + score popup
   d. Nếu không cleared: combo = 0
   e. Remove piece khỏi currentPieces
   f. Nếu currentPieces rỗng → pickPieces() sinh 3 mới
   g. canPlaceAny(grid, currentPieces) → false → game over
```

---

## 5. DESIGN DECISIONS

| Decision | Rationale |
|----------|-----------|
| Grid 8×8 | Block Blast standard, vừa cho mobile |
| 13 shapes, 7 colors | Đủ đa dạng, không quá nhiều |
| Không lưu board state | Game ngắn, restart nhanh, chỉ cần best score |
| Logic = pure TS | Test không cần DOM/Phaser, dễ đổi engine sau |
| 3 pieces per turn | Block Blast standard, giữ nhịp game |
| Combo reset khi không clear | Khuyến khích xếp chiến lược, không spam |

---

## 6. PERFORMANCE

- Grid operations: O(8×8) = 64 cells, negligible.
- Shape generation: O(1), 13 shapes pre-defined.
- Save/load: async, < 10ms.
- Không cần worker/optimization cho game casual.