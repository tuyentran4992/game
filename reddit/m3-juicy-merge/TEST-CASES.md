# M3-R: TEST-CASES — "Juicy Merge" Reddit Devvit

> **Port tests.** Focus on Reddit-specific features: Redis, API, splash screen.

---

## 1. REDIS TESTS

| TC ID | Mô tả | Input | Expected |
|-------|-------|-------|----------|
| REDIS-01 | Save score | POST /api/score {score:100, userId:"test"} | {saved:true} |
| REDIS-02 | Get score | GET /api/score/test | {score:100} |
| REDIS-03 | Save higher score | POST /api/score {score:200, userId:"test"} | {saved:true} |
| REDIS-04 | Save lower score (không ghi đè) | POST /api/score {score:50, userId:"test"} | {saved:true}, GET vẫn 200 |
| REDIS-05 | Get non-existent user | GET /api/score/nonexist | {score:0} |
| REDIS-06 | Leaderboard | GET /api/leaderboard | Array top 10, sorted desc |

---

## 2. SPLASH SCREEN TESTS

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| SPLASH-01 | Splash hiển thị đúng | Title "Juicy Merge", button "▶ Play" |
| SPLASH-02 | Tap Play → expanded view | Chuyển sang game.html |

---

## 3. GAMEPLAY TESTS (tái dùng từ M3)

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| GAME-01 | Drop fruit → physics fall | Fruit rơi vào bucket |
| GAME-02 | 2 fruits cùng loại chạm → merge | Merge thành bậc lớn hơn |
| GAME-03 | Fruit quá danger line → game over | Modal hiển thị |
| GAME-04 | Score tính đúng | Score tăng theo merge |
| GAME-05 | Retry → reset game | Score về 0, bucket rỗng |

---

## 4. COVERAGE

| BR | TC |
|----|----|
| RDM-01 | GAME-01 → GAME-05 |
| RDM-02 | REDIS-01 → REDIS-05 |
| RDM-03 | REDIS-06 |
| RDM-06 | (E2E test) |