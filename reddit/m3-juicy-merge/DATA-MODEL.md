# M3-R: DATA-MODEL — "Juicy Merge" Reddit Devvit

> **Port of M3.** Data model cho Reddit platform: Redis storage, API schema.

---

## 1. REDIS SCHEMA

### Score
```
Key:    score:{userId}
Value:  string (number)
TTL:    none (persistent)
```

### Leaderboard
```
Key:    leaderboard
Type:   Redis Sorted Set
Member: userId
Score:  highScore
```

---

## 2. API CONTRACT

### POST /api/score
Save user's score (only if higher than existing).

```json
Request:  { "score": 4200, "userId": "t3_abc123" }
Response: { "saved": true }
```

### GET /api/score/:userId
Get user's high score.

```json
Response: { "score": 4200 }
```

### GET /api/leaderboard
Get top 10 scores.

```json
Response: [
  { "userId": "t3_abc123", "score": 4200, "rank": 1 },
  { "userId": "t3_def456", "score": 3100, "rank": 2 }
]
```

---

## 3. GAME STATE (runtime, client-side)

```
GameState = {
  score: number
  isGameOver: boolean
  currentFruit: number    // index 0-14
  nextFruit: number
  bucket: Fruit[]         // fruits in bucket
  combo: number
}
```

---

## 4. DESIGN DECISIONS

| Decision | Rationale |
|----------|-----------|
| Redis thay localStorage | localStorage clears on app update |
| Devvit Payments thay ads | Reddit không có ad SDK cho Devvit |
| Leaderboard Sorted Set | Redis native, O(log N) |
| Giữ nguyên Phaser 3 | Template dùng Phaser 4 nhưng M3 code Phaser 3 |