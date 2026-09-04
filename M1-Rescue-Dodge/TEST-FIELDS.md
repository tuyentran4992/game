# TEST-FIELDS — t_8f6172c4 (UPG2-V-H1 delta-bar Start)

QA bấm/soi bằng testid gắn qua `setData('testid', ...)` trong scene.

## Màn Start (StartScene)

| testid | selector / cách đọc | Ý nghĩa |
|---|---|---|
| `delta-bar` | object Text trong StartScene, `data.get('testid') === 'delta-bar'` | Dòng "<N> POINT(S) TO BEAT YOUR BEST" dưới nút Play. Visible CHỈ khi delta = bestScore − lastScore > 0; ẩn (visible=false) khi vừa lập kỷ lục / delta 0 / chưa từng chơi. Vị trí: giữa màn, playBtnY + 30 + 18. |

Testid cũ KHÔNG đổi/xoá (N3): `start-btn`, `cat-idle`, `game-canvas`, v.v. giữ nguyên — diff chỉ thêm.

## Cách đọc nhanh từ console (window.__game)

```js
__game.scene.getScene('StartScene').children.list.find(o => o.getData && o.getData('testid') === 'delta-bar')?.text
__game.scene.getScene('StartScene').children.list.find(o => o.getData && o.getData('testid') === 'delta-bar')?.visible
```

## Kịch bản QA cần (deterministic)

1. Ván 1 thua điểm 0, best 0 → dòng ẨN (delta 0).
2. Ván sau có điểm < best (vd best 120, score 83) → Start hiện "37 POINTS TO BEAT YOUR BEST".
3. Vừa lập kỷ lục (score > best cũ, saveBest xong) → Start dòng ẨN.
4. Nút Play vẫn là CTA nổi nhất; delta-bar không interactive (không chặn tap Play).
