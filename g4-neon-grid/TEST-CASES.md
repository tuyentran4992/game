# M4: TEST-CASES (Unit Tests) — "Neon Grid" (Block Puzzle)

> **Dành cho dev.** Chạy `pnpm test` trong `g4-neon-grid/` — vitest với pure TS logic (không cần DOM/Phaser).

---

## 1. BOARD LOGIC TESTS

### 1.1 Grid Operations

| TC ID | Mô tả | Input | Expected |
|-------|-------|-------|----------|
| BOARD-01 | Tạo grid rỗng | — | 8×8, tất cả null |
| BOARD-02 | Đặt block 1×1 hợp lệ | grid rỗng, shape mono, pos(0,0) | true |
| BOARD-03 | Đặt block out-of-bounds | grid rỗng, pos(8,8) | false |
| BOARD-04 | Đặt block chồng lên ô đã có | grid[0][0]=0, shape mono pos(0,0) | false |
| BOARD-05 | Đặt block 2×2 | grid rỗng, shape O, pos(0,0) | grid[0][0]=0, grid[0][1]=0, grid[1][0]=0, grid[1][1]=0 |
| BOARD-06 | placeShape không mutate gốc | grid rỗng, place → original[0][0] | null (giữ nguyên) |

### 1.2 Clear Logic

| TC ID | Mô tả | Input | Expected |
|-------|-------|-------|----------|
| CLEAR-01 | Clear 1 hàng đầy | grid[0] full | clearedRows=[0], grid[0] empty |
| CLEAR-02 | Clear 1 cột đầy | grid[:][0] full | clearedCols=[0], grid[:][0] empty |
| CLEAR-03 | Clear 2 hàng cùng lúc | grid[0], grid[1] full | clearedRows=[0,1] |
| CLEAR-04 | Clear 2 cột cùng lúc | grid[:][0], grid[:][1] full | clearedCols=[0,1] |
| CLEAR-05 | Clear cả hàng + cột | grid[0] full + grid[:][0] full | clearedRows=[0], clearedCols=[0] |
| CLEAR-06 | Không clear khi chưa đầy | grid[0] có 1 ô trống | clearedRows=[] |
| CLEAR-07 | Clear sau khi clear rồi đặt lại | clear → đặt → clear lại | OK |

### 1.3 Game Over Detection

| TC ID | Mô tả | Input | Expected |
|-------|-------|-------|----------|
| GAMEOVER-01 | Grid đầy + 1 piece | grid full, pieces=[mono] | canPlaceAny=false |
| GAMEOVER-02 | Grid rỗng + 1 piece | grid rỗng, pieces=[O] | canPlaceAny=true |
| GAMEOVER-03 | Grid gần đầy + piece vừa vặn | grid 1 ô trống, piece mono | canPlaceAny=true |
| GAMEOVER-04 | Grid gần đầy + piece không vừa | grid 1 ô trống ko đủ chỗ, piece 2×2 | canPlaceAny=false |

### 1.4 Valid Positions

| TC ID | Mô tả | Input | Expected |
|-------|-------|-------|----------|
| POS-01 | Mono trên grid rỗng | grid rỗng, shape mono | 64 positions |
| POS-02 | O (2×2) trên grid rỗng | grid rỗng, shape O | 49 positions |
| POS-03 | I (4×1) trên grid rỗng | grid rỗng, shape i_v | 40 positions |
| POS-04 | Mono trên grid 1 ô đã có | grid[0][0]=0, shape mono | 63 positions |

---

## 2. SHAPES TESTS

| TC ID | Mô tả | Input | Expected |
|-------|-------|-------|----------|
| SHAPE-01 | pickPieces trả 3 pieces | pickPieces() | length=3 |
| SHAPE-02 | Mỗi piece có cells + color | pickPieces() | cells.length>0, color in [0-6] |
| SHAPE-03 | Có 13 shape definitions | getAllShapes() | length=13 |
| SHAPE-04 | rotateShape 90° | [[1,0],[1,1]] | [[1,1],[1,0]] |
| SHAPE-05 | rotateShape 180° (2 lần) | xoay 2 lần | shape gốc |

---

## 3. SCORING TESTS

| TC ID | Mô tả | Input | Expected |
|-------|-------|-------|----------|
| SCORE-01 | 1 line, no combo | 1, 0, false | 100 |
| SCORE-02 | 2 lines, no combo | 2, 0, false | 200 |
| SCORE-03 | 1 line, combo 1 | 1, 1, false | 150 |
| SCORE-04 | 2 lines, combo 2 | 2, 2, false | 400 |
| SCORE-05 | 1 line, all-clear | 1, 0, true | 200 |
| SCORE-06 | 0 lines | 0, 0, false | 0 |
| SCORE-07 | formatScore | 4200 | '4,200' |
| SCORE-08 | getLevel | 0 | 1 |
| SCORE-09 | getLevel | 1200 | 3 |

---

## 4. COVERAGE MATRICES

### 4.1 Business Rule × TC

| BR | TC |
|----|----|
| NG-01 | BOARD-02, BOARD-03, BOARD-04 |
| NG-02 | SHAPE-01, SHAPE-02 |
| NG-03 | CLEAR-01 → CLEAR-07 |
| NG-04 | GAMEOVER-01 → GAMEOVER-04 |
| NG-05 | SCORE-01 → SCORE-06 |
| NG-08 | (E2E test) |
| NG-09 | (E2E test) |

### 4.2 Edge Cases

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| EDGE-01 | Grid rỗng + clearLines | clearedRows=[], clearedCols=[] |
| EDGE-02 | Grid 1 cell + clear | 1 hàng 1 cột cùng clear |
| EDGE-03 | Shape tất cả 0 (empty) | cells toàn 0 = không đặt được gì |
| EDGE-04 | pickPieces với seed cố định | deterministic output |