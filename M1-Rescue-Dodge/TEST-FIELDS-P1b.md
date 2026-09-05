# TEST-FIELDS — t_ec2e1a6c (UPG2-P1b telegraph debut + "CH3 · NIGHT RAID")

QA bấm/soi bằng testid gắn qua `setData('testid', ...)` trong scene GameplayScene.

## Testid MỚI (P1b — 2 cái, không đổi testid cũ nào — N3)

| testid | selector / cách đọc | Ý nghĩa |
|---|---|---|
| `debut-telegraph` | Text trực tiếp của scene, `data.get('testid') === 'debut-telegraph'` | Telegraph "loại ong mới lần đầu xuất hiện": nền đỏ (#E74C3C) + padding, text trắng EN. Visible đúng khi `engine.debutAt(elapsed)` trả DebutWindow mở (`[firstSeenAt, until)`, cfg `debutSparseSec` = 2.0s ≥ sàn telegraph 1.2s). Text theo loại: speedy = "NEW: FAST BEE INCOMING!", zigzag = "NEW: ZIGZAG BEE INCOMING!", swarm = "NEW: SWARM BEE INCOMING!". Ẩn khi cửa sổ đóng + khi phiên mới (không trôi sang ván sau). |
| `swarm-warning-text` | Text BÊN TRONG container `swarmWarningPopup` (quét 1 cấp container), `data.get('testid') === 'swarm-warning-text'` | Text trong banner cảnh báo bão ong. Lần trigger swarm ĐẦU trong phiên (swarm debut — `result.swarmDebut` từ director) = "CH3 · NIGHT RAID"; các lần sau về "⚠️ SWARM INCOMING! ⚠️". |

## Cách đọc nhanh từ console (window.__game)

```js
// telegraph debut
__game.scene.getScene('GameplayScene').children.list.find(o => o.getData && o.getData('testid') === 'debut-telegraph')?.text
__game.scene.getScene('GameplayScene').children.list.find(o => o.getData && o.getData('testid') === 'debut-telegraph')?.visible
// text banner swarm (nằm trong container)
__game.scene.getScene('GameplayScene').children.list.find(o => o.list)?.list.find(o => o.getData && o.getData('testid') === 'swarm-warning-text')?.text
```

## Kịch bản QA cần (deterministic)

1. Ván mới, chưa gặp loại nào → `debut-telegraph` ẨN (visible=false).
2. Quãng 30–45s lần đầu speedy xuất hiện → telegraph "NEW: FAST BEE INCOMING!" hiện đúng trong cửa sổ dữ liệu, biến mất khi cửa sổ đóng.
3. Lần đầu zigzag (level ≥ 10) → telegraph "NEW: ZIGZAG BEE INCOMING!".
4. Lần trigger swarm đầu phiên → banner đỏ hiện "CH3 · NIGHT RAID"; lần swarm sau → về "⚠️ SWARM INCOMING! ⚠️".
5. Chết + retry → telegraph ẨN ngay ở ván mới (không trôi từ ván cũ).

## Testid cũ giữ nguyên (N3 — diff rỗng)

`start-btn, tutorial-text, game-canvas, score-label, level-label, level-popup, level-popup-sub, combo-popup, record-popup, final-score, best-score, retry-btn, continue-btn` + các testid test wiring trước đó — không testid nào bị đổi/xoá.
