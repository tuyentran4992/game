# B1a — TỔNG HỢP 3 PHIÊN REVIEW (13/09/2026)

**Cổng máy: PASS** — `typecheck` 0 lỗi · `test:logic` **127/127** (7/7 file) · 10.000 đề phân biệt trong 8,7s.
**Kết luận của Hermes: KHÔNG coi B1a là xong** — còn 1 FAIL nghiệp vụ + 2 FAIL kiến trúc/hợp đồng phải vá trước B1b.

## 3 phiên (chạy song song qua harness, chỉ-đọc)
| Phiên | Góc | Lượt | Phút | Cost | Báo cáo |
|---|---|---|---|---|---|
| 3a-code | code đúng/sai (C1-C12) | 29 | 9,8 | $1,65 | CÓ |
| 3b-stress | tấn công/fuzz (F1-F8) | 33 | 11,0 | $1,63 | CÓ |
| 3c-arch | kiến trúc/pattern (A1-A15) | 27 | 6,7 | $0,86 | CÓ |

So với **cách chạy cũ** (3 phiên tương tự, không harness): 445 lượt · cache 9,85M token · **0 báo cáo** (log rỗng).
Harness: 89 lượt · cache 2,47M token · **3 báo cáo đầy đủ**. ⇒ ~4,5× ít lượt hơn, và lần đầu có kết quả đọc được.

## FAIL đồng thuận (≥2 phiên cùng báo — coi là FAIL THẬT)
| # | Vấn đề | Bằng chứng | Phiên |
|---|---|---|---|
| F-1 | **`chainFor` nuốt cấu hình âm thầm**: `?? CHAIN_ROWS[0]` biến `foldCount` 4/5 (và `FoldKind` mới) thành 1 nếp/`'H'` mà không báo lỗi | `generator.ts:113-119`, `generator.ts:496` (`FOLD_KINDS`), `foldRules.ts:225` (`LINE_AXIS` Partial) | 3a · 3b · 3c |
| F-2 | **validator không ràng buộc `answerHoles` ↔ `action`**: `sourcesOf = Math.max(1, ...)` ⇒ đề "4 lỗ nhưng 0 điểm đục" / punch rỗng vẫn `ok=true` | `validator.ts:73-74` | 3b · 3a |
| F-3 | **Test tự tham chiếu oracle (F8)**: lấy chính hàm `src/` làm chuẩn ⇒ lỗi hình học/validator không bị bắt | `generator.test.ts:165-176` · `validator.test.ts:38-43` · `generator-10000.test.ts:103` | 3b |

## FAIL có bằng chứng tái hiện (1 phiên báo, nhưng đo được)
| # | Vấn đề | Bằng chứng | Phiên |
|---|---|---|---|
| F-4 | **`LevelSpec.folds` lộ mảng cache nội bộ** ⇒ scene `sort/push` vào spec là đổi đề cùng seed (tái hiện `'V,V'` → `'H,H'`) — phá PC-02/ADR-03 ở tầng tích hợp | `generator.ts:116` + `types.ts:35` | 3c |
| F-5 | **"Cắt góc" chỉ là 1 điểm góc**, khác `corner_cut()` của oracle `g01_fold_sim.py` (4 điểm / 24 cluster) | `generator.ts` (nhánh cut) vs `g01_fold_sim.py` | 3a |
| F-6 | `generator.ts` **546 dòng / 5 trách nhiệm**, vượt ngưỡng tự khai 180 dòng 3× | `generator.ts` | 3c |
| F-7 | 2 rule nhiễu dạy học (`forget-last-fold`, `crease-flip`) **đóng góp 0/10.800 ô** ⇒ 94% nhiễu là rải ngẫu nhiên; 93,8% ô nhiễu thuộc `displace` — độ "giống thật" phải đo bằng **vision** | `generator.ts` `DISTRACTOR_RULES` | 3a |
| F-8 | **`shareCode` không có test**; miền NaN/âm vẫn sinh code hợp lệ (`GAP-JDP5F-NaN`) | `generator.ts` `shareCode` | 3a · 3b |

## PASS có SỐ ĐO (đáng tin)
- **F1** fuzz 10.000 đề **seed ngoài lai** ⇒ 0 đề hỏng, 10.000/10.000 đề phân biệt; 6.000 đề cfg ngẫu nhiên ⇒ `minPairDistance` luôn = 6.
- **F3** determinism: 100 lần cùng seed ⇒ **1** hash duy nhất.
- **F5** purity: stub `Math.random`/`Date.now`/`performance.now` thành `throw` ⇒ 220 lượt sinh đề, **0 lời gọi**.
- **F6** 15/15 ca biên (4/2/1/8/4/4/2/6/3, D=2/1, DV=4/3) khớp oracle Python; 640 điểm lưới khớp oracle độc lập.
- **F7** hiệu năng **0,39 ms/đề** (10.000 đề ≈ 3,9s).
- Cổng máy trong phiên 3c: `127 passed (7 files)`, 10.000 đề 8,7s.

## Chi phí
- 3 phiên review qua harness: **$4,15** (từ `logs/metrics.jsonl`: $1,65 + $1,63 + $0,86) + 3 lần smoke $0,06 ⇒ **~$4,21**.
- Các phiên chạy TAY trước harness (test/code/fix/3 review cũ) **không ghi được cost** (file phiên CLI không lưu `total_cost_usd`) ⇒ con số đó chưa tính được, em KHÔNG đoán.
- Cách cũ cho 3 phiên review: cache 9,85M token mà **không ra kết quả** ⇒ tiền mất, không có thông tin.

## Việc chặn B1b (đề xuất vòng fix cuối)
Chặn: **F-1 · F-2 · F-3 · F-4 · F-8**. Batch riêng: **F-6** (tách `generator.ts`) · **F-7** (nhiễu + vision QA) · **F-5** (phải đối chiếu SPEC trước: code sai hay SPEC cố ý đơn giản hoá).
