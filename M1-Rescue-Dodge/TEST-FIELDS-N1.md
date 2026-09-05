# TEST-FIELDS.md — [UPG2-N1] t_79d2b77d (fe-dev)

Card này là card **config hoá** (MechanicsConfig) — KHÔNG thêm/sửa element UI nào,
nên **không có data-testid mới**. N3 diff testid trước/sau = **RỖNG**
(grep toàn `src/` trước @ 386fffb và sau @ cf3adfe — bằng chứng trong [REVIEW]).

Bộ testid hợp đồng QA giữ nguyên từ T1f (xem TEST-FIELDS.md của card trước):
- `game-canvas`, HUD (`score-label`, `level-progress`, ...), popups, `retry-btn`...

Điểm QA nên soi khi boot check (không đổi testid, chỉ khẳng định hành vi nguyên trạng):
| Màn | Cách kiểm | Kỳ vọng |
|---|---|---|
| Gameplay | vuốt/tap/arrow đổi làn | phản hồi tức thì như cũ (inputBufferMs = 0); tween 120ms + delay 35ms + ease cubic.out không đổi cảm giác |
| Gameplay | ong spawn liên tục | cadence y cũ (1.35/0.38/0.0035/0.10 qua config) |
| Gameplay | speedy/fat xuất hiện | tốc độ tương đối y cũ (1.18/1.0/0.72) |
