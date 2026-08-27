# SPEC — M6 "Crumple King" v1

> Slug: `crumple-king` · Engine: Phaser + matter (point constraints) · 9:16 portrait · 1 tay cái
> Trạng thái: **vượt fun gate trước khi code đầy đủ** (xem ../README.md)
> Convention: `specs/1-<tên>`; gameplay bị từ chối → `specs/2-<tên>`, code cũ đóng băng.

## 1. Elevator pitch
Bóp tờ giấy bằng hai ngón cho đến khi nó ROẠCH thành nắm tròn, rồi flick ném vào sọt. Ném trúng sọt giấy — không quả bóng nào cả, đó là một bài kiểm tra khả năng bóp giấy.

## 2. Đối tượng & phiên chơi
- Khách: lướt giải trí ngắn; hook "thứ mọi người đều làm khi buồn chán".
- Phiên: mỗi lần ném 5–10s; loop "bóp → ném → giấy mới rơi xuống" không deadline.

## 3. Core loop (một lần ném)
```
tờ giấy A4 phẳng rơi xuống → kéo 2 ngón vào giữa (pinch/drag góc)
   → 4 mức nhàu (phẳng → nhăn → vón → tròn chặt), mesh co lại thật
→ đủ chặt (area < ngưỡng) → nhả = flick: vector = tốc độ kéo cuối
   → giấy bay (rơi tự do + wobble + xoáy nhẹ) → nảy thành thật khi chạm
   ├─ vào sọt → +100, sọt rung + "SPOOLED!", compaction bonus
   └─ ra ngoài → giấy nằm nhăn trên sàn, quăng vào sọt bằng drag để cứu
→ tờ mới rơi xuống; miss 3 lần liên tiếp → sọt tiến gần 1 bước
```

## 4. Cơ chế & số (config placeholder)
| Tham số | Giá đầu | Ghi chú |
|---|---|---|
| Mức nhàu | 4 (phẳng/nhăn/vón/tròn chặt) | area giảm 100/65/40/25% |
| Điều khiển | 2 finger hoặc drag 1 góc về tâm | scale mesh + thêm wrinkle lines |
| Flick | thả khi velocity > 2px/frame | hướng = vector thả; power = min(v, vmax) |
| restitution | 0.1 phẳng → 0.35 chặt | giấy chặt nảy như bóng nhẹ |
| Sọt | ngang 22% màn, cao 18%; mỗi 5 điểm +8% xa/di động | rung + hân hoan khi trúng |
| Điểm | 100 + 50×(mức nhàu lúc ném) + streak ×25 | vụn bay khi nhàu xong |
| Cứu | kéo giấy lạc vào sọt (không điểm) | không punish — keep flowing |

## 5. Feel & juice (KHÔNG được cắt)
- Âm bimbim-bimbim bóp giấy theo tốc độ kéo (pitch variance), "rắc" khi lên mức nhàu mới.
- Wobble trên không = giao điểm wrinkle dao động; chạm sàn/cạnh = nảy + vụn.
- Sọt rung khi ném trúng + chữ pop "CRUMPLE KING!" khi max combo.
- Giấy nhàu trông THẬT: 12 wrinkle line ngẫu nhiên cố định khi spawn.

## 6. UI/HUD (prototype)
Không menu — vào bóp luôn. HUD: điểm + streak góc phải, "ném!" khi đủ chặt. (Menu/save/SDK chỉ sau fun gate.)

## 7. Tiêu chí Fun Gate
1. Phát ném TRÚNG đầu tiên phải "đã" — đó là toàn bộ trò chơi.
2. Bóp thấy giấy nhàu thật (mesh co lại + tiếng nhàu), không phải square teo lại.
3. Muốn thử xem bóp chặt hơn ném có xa hơn không.
→ Anh chơi + report. Fail = đóng băng folder.

## 8. Anti-clone
Động từ chính KHÔNG phải: fold-paper (Cat Game), basket throw với BÓNG (saturated), bin shuffle golf. Hook = biến dạng mesh + flick chính tờ giấy. Kiểm catalog `crumple|bóp giấy|paper toss` trước khi nộp; ghi `docs/SUBMISSIONS.md`.

## 9. Sau fun gate (scope v1 chính thức)
`@game/sdk` · chế độ endless + daily challenge cùng layout · paper physics upgrade (VertexMesh thật nếu placeholder đủ vui) · art thật + DESIGN-SPEC · TEST-CASES/E2E · packaging Reddit + Playgama.
