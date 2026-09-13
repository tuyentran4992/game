# HARNESS — SSOT cho mọi lần gọi Claude Code (M11-Gap)

## 2 tầng SSOT (đừng lẫn)
| Tầng | File | Ai đọc | Tác dụng |
|---|---|---|---|
| Cho **script/người** | `HARNESS.yaml` | `harness/claude_step.py`, `harness/orchestrate.sh` | model · max-turns · tool cấm · variant · cổng · metrics |
| Cho **Claude** | `harness/rules-core.md` + `harness/packs/<batch>.md` | Claude (bơm qua `--append-system-prompt-file`) | luật phiên + hợp đồng của batch |

Claude **không đọc** `HARNESS.yaml`. Script dịch YAML → cờ dòng lệnh.

## Vì sao bơm qua `--append-system-prompt-file` (không phải `CLAUDE.md`)
Đã đo thật (13/09): chạy `--bare` thì **Claude KHÔNG nhận `CLAUDE.md`** (trả lời `KHONG_THAY`); thêm `--append-system-prompt-file` → nhận (`RA_SYSPACK`); bỏ `--bare` + `--add-dir` → nhận (`RA_MD`).
Ta giữ `--bare` (môi trường sạch, không hooks/auto-memory) và bơm luật qua system prompt: **Claude luôn thấy, không phụ thuộc việc nó có chịu Read hay không**, và nằm ở prefix tĩnh ⇒ cache hit cao.

## Lệnh
```bash
# 1 bước (có đo):
python3 harness/claude_step.py --batch B1b --step 2-code --prompt B1b-2-code.md --max-turns 80
# cả chuỗi (test swarm → code → cổng → 3 review song song):
bash harness/orchestrate.sh B1b 0 [variant]
# xem số:
python3 harness/report.py             # tất cả
python3 harness/report.py v0-baseline # chỉ 1 variant
```
Ghi đè tạm: `SKIP_TESTS=1 SKIP_CODE=1 FIX_PROMPT=B1b-2b-fix.md FIX_TURNS=70 SKIP_REVIEW=1 STEP_TIMEOUT=2400 VARIANT=v0-baseline`.

## Thêm batch mới (3 việc)
1. Viết `harness/packs/<batch>.md` — hợp đồng: chữ ký hàm liên quan, chân lý dữ liệu, bẫy đã biết, lệnh. **Ngắn** (≤150 dòng) vì nằm trong mọi request.
2. Viết prompts: `<batch>-1a/1b-tests.md` · `<batch>-2-code.md` · `<batch>-3a-code.md` · `<batch>-3b-stress.md` · `<batch>-3c-arch.md`.
3. Chạy `bash harness/orchestrate.sh <batch>`.

## Đọc metrics (logs/metrics.jsonl)
Mỗi dòng 1 lần chạy: `variant · batch · step · model · turns · duration_s · api_ms · ttft_ms · cost_usd · session_id · ctx_per_turn_max · input_tokens · cache_read · cache_creation · output_tokens · exit`.
- Nguồn số **chính** = event `result` của `stream-json` (usage luỹ kế + num_turns + cost), không đếm tay.
- `ctx_per_turn_max` = ngữ cảnh mỗi lượt (token) — chỉ số quyết định tốc độ; muốn nhanh thì hạ chỉ số này, không phải hạ max-turns.
- `resume_from` + `session_id` để đo đòn E3 (vòng fix dùng `--resume`).

## So A/B đúng cách
Cùng **1 batch**, 2 lần chạy khác `--variant` ⇒ so `turns · duration_s · cost_usd · ctx_per_turn_max` **và** cổng PASS/FAIL + số mục review FAIL. Nhanh hơn mà review FAIL nhiều hơn ⇒ **bỏ variant đó**.

## Variants hiện có
- `v0-baseline`: không bơm luật/gói (đúng cách chạy hôm 13/09 trước harness) — mốc so sánh.
- `v1-harness` (mặc định): bơm `rules-core.md` + `packs/<batch>.md`.

## Mốc so sánh đã đo (baseline, cách cũ không harness)
| Bước | Lượt | Ngữ cảnh/lượt | Phút | tok/phút |
|---|---|---|---|---|
| B1a test | 137 | ~45.000 | 28,7 | ~11.000 |
| B1a code | 181 | ~55.000 | 34,6 | ~10.600 |
| SMOKE qua harness | 2 | 2.781 | 0,15 | ~2.400 (lệnh ngắn, TTFT 3,2s) |
