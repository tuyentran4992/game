# FIX-ROUND-3 — BỆNH ÁN PERF: "game lagg quá, cảm giác ko smooth"

**Ngày:** 2026-09-04
**Người chẩn đoán:** Supervisor (trace code thật + feedback boss chơi tay qua preview tunnel)
**SHA hiện trường:** `cf3d558` (main) — bản boss test
**Trạng thái:** CHỜ CEO gieo cho fe-dev (fix), QA verify, **boss chơi lại (Fun Gate fix-round)**

## 0. Triệu chứng (feedback boss, verbatim)
> "game lagg quá em, cảm giác ko smooth"

Cảm giác = **stutter/khựng theo đợt** (không chỉ fps thấp đều) → khớp với bệnh GC spike + per-frame vector redraw bên dưới.

## 1. NGUYÊN NHÂN GỐC — 5 bệnh, xếp theo độ nặng (bằng chứng file/dòng thật)

### 🔴 A. Vẽ lại vector MỖI FRAME (thủ phạm chính)
File: `game/src/scenes/Gameplay.ts` (~2038 dòng — god file, xem E)
Mỗi frame (60fps) `update()` lặp lại:
| Dòng | Gọi | Chi phí/frame |
|---|---|---|
| L1060 | `drawCatShadow()` (L737-755) | `clear()` + **10 fillEllipse alpha-blend** (vòng lặp steps=10) |
| L1044 | `drawRoadsideProps()` (L769-809) | ~**20 lệnh fillRect/fillTriangle/stroke** |
| L1070 | `updateFeverBar()` → `drawFeverBar()` (L1810+) | clear + bar + L1939 `drawFlameIcon()` polygon |
| L1043 | `drawGroundFlow()` (L719-737) | clear + ~4 lệnh vạch đường |

Phaser `Graphics.clear()` + redraw = CPU tessellate + re-upload GPU buffer **từng frame** → ~40 lệnh vector/frame.

**FIX A (bắt buộc):**
1. Pre-render tĩnh ra texture 1 lần ở `create()`: `drawRoadsideProps`/`drawCatShadow` → `Graphics.generateTexture(key)` rồi dùng `Image`/sprite cuộn (roadside lặp tile).
2. `drawGroundFlow`: dirty-flag — chỉ redraw khi `groundOffset` đổi ≥ 1px (nó đã đổi mỗi frame → thay fillRect di chuyển bằng **2 sprite tile cuộn modulo**, không vẽ lại).
3. `drawFeverBar`/`drawFlameIcon`: dirty-flag — chỉ redraw khi `feverGained/feverActive/flicker` đổi trạng thái (thêm `lastDrawnFever` cache, so sánh trước khi vẽ).

### 🔴 B. KHÔNG object pool — GC khựng từng đợt (đúng cảm giác "ko smooth")
| Dòng | Hàm | Sinh mỗi lần | Tần suất gọi |
|---|---|---|---|
| L603 | `spawnSparkles` | **7 circle + 7 tween** | dodge/nhặt cá/near-miss liên tục (L755, L1629, L1643, L1777) |
| L639 | `spawnBeeExplosion` | **14 circle + 14 tween** | mỗi ong chết |
| L657 | `spawnRunningPuff` | 1 graphics + 1 tween | mỗi 0.26s |
| L1622 | `spawnBee` | container mới + tween, không pool | liên tục |

1 phút chơi = hàng trăm GameObject+tween sinh-hủy = **GC spike**.

**FIX B (bắt buộc):**
1. Tạo pool đơn giản (`Map<string, GameObject[]>` hoặc class `Pool`) cho: sparkles, bee-explosion particles, running-puff, **bee containers**.
2. Tween: dùng lại 1 tween config, `restart()` thay vì create/destroy; hoặc chuyển animation particles sang update thủ công trong loop (rẻ hơn tween cho hạt ngắn).
3. `bee.on('destroy')` → thay bằng `deactivate()` trả về pool (ẩn + reset state), KHÔNG destroy.

### 🟡 C. `updateCatEffects` (L869 → L1241) clear mỗi frame cả khi TẮT
Shield/aura không active vẫn chạy `this.catShieldFx.clear().setAlpha(0)` **mỗi frame**.
**FIX C:** dirty-flag — chỉ clear 1 lần khi chuyển trạng thái on→off (cache `shieldWasActive`).

### 🟡 D. `spawnBee` L1319: `this.bees = this.bees.filter(...)`
Cấp phát array mới mỗi spawn. **FIX D:** lọc in-place (`for` ngược + splice) hoặc giữ pool (gộp với B).

### 🟠 E. GỐC RỄ KIẾN TRÚC: Gameplay.ts 2038 dòng (vi phạm luật tách file >250 dòng)
`update()` ~250 dòng trộn va chạm + effects + render. **KHÔNG sửa trong round này** (rủi ro regression cao, cần round refactor riêng sau khi M1 ổn). Ghi nhận nợ kỹ thuật vào REJECT-LESSONS/STATUS.

## 2. RÀNG BUỘC CHO FE-DEV (bắt buộc)
- **KHÔNG đổi gameplay/balance/số liệu đã qua BALANCE + QA PASS** (spawn rate, tốc độ, hitbox, difficulty ramp giữ nguyên 100%).
- Chỉ tối ưu render/allocation. Hành vi người chơi phải **giống hệt**, chỉ mượt hơn.
- `npm test` xanh + `npm run build` thành công.
- Comment tiếng Việt tối giản, không emoji trong code.
- Diff chỉ chạm `Gameplay.ts` (+ file pool mới nếu tách, vd `src/systems/FxPool.ts`).

## 3. NGHIỆM THU (QA + BOSS)
**QA (máy, được phép):**
1. `npm test` + build xanh.
2. **Đo FPS thật** bằng CDP trong browser (headless): đếm frame qua `requestAnimationFrame` 30s chơi mô phỏng, báo **P50/P95 frame time trước vs sau** — PHẢI có số, mục tiêu: P95 frame time giảm ≥ 30% so với bản `cf3d558`.
3. Đếm allocation: `performance.memory` hoặc số GameObject đang sống sau 60s (mục tiêu: không tăng đơn điệu — pool hoạt động).
4. Regression: gameplay không đổi — so screenshot 3 mốc (0s/30s/60s) vs bản cũ, ong/cá/shield vẫn xuất hiện đúng nhịp.

**BOSS (Fun Gate fix-round, bắt buộc):**
- Anh Tuyền chơi lại bản mới qua preview tunnel (supervisor dựng, PREVIEW-OK theo §2.11).
- Hỏi đúng 1 câu: **"còn laggy không anh?"** — chỉ cần cảm giác smooth, không cần đo.

## 4. CHUỖI
fe-dev (fix A+B+C+D) → QA (test + đo FPS có số) → **dev-lead review + MERGE (độc quyền theo COMPANY-RULES §2 — CEO KHÔNG merge code)** → supervisor dựng preview + PREVIEW-OK §2.11 → **BOSS chơi lại (Fun Gate)** → PASS thì CEO closeout + nộp.
