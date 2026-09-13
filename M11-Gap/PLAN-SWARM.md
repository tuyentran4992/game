# M11-Gap — KẾ HOẠCH SWARM (T0 catalog + retention meta)

> Anh Tuyền duyệt 13/09/2026: **bản v2 đầy đủ — 13 con / 3 lô**. Game GẤP (gấp giấy → đục lỗ → đoán hình mở),
> MVP/fun gate ĐÃ được duyệt. Nguồn tài sản gốc: `/data/shared-board-agent-waves/game-gap-giay/`.

## Luật chung
- Model PIN `aibox / qwen3.8-flash` (delegation.model — anh chốt giữ).
- Mỗi con 1 file đích riêng; bảng tin chung `board.jsonl` (post qua `board_post.py`, có flock).
- Cấm: bịa URL/số · lái browser · chạy build/deploy · sửa file con khác. Bị chặn → ghi `KHONG_KIEM_CHUNG_DUOC`.
- Luật chốt TRƯỚC: **≥3 bản cùng mechanic trên 1 kênh ⇒ KILL/đổi mechanic**.

## Lô 1 — T0, chia theo ĐƯỜNG TÌM (5 con) ✅ ĐÃ THẢ 13/09
| Con | Đường | File đích |
|---|---|---|
| R1 | search nội bộ 4 kênh (≥6 biến thể từ khoá, ≥2 trang) | `t0/R1.json` |
| R2 | duyệt category/tag/new/charts (KHÔNG dùng ô search) | `t0/R2.json` |
| R3 | Google `site:` + check trùng 4 tên ứng viên | `t0/R3.json` |
| R4 | KILLER có quota (≥3 bản trùng hoặc chứng minh ≥6 đường) | `t0/R4.json` |
| R5 | thị trường ngoài 4 kênh (Poki/itch/AppStore/Play) → độ bão hoà | `t0/R5.json` |

Cổng kiểm: `python3 t0/validate_t0.py --file <file>` (schema + nguồn + dedupe + đếm mức-3).

## Lô 2 — RETENTION theo LEVEL, không daily (4 con) — CHỜ LÔ 1 XONG
| Con | Trục (không đè nhau) | File đích |
|---|---|---|
| P1 | Cấu trúc tiến trình level (số màn, ramp, sao, chương/theme) | `retention/P1.json` |
| P2 | Kỷ lục & so kè KHÔNG server (ghost, streak, bảng local, seed chia sẻ) | `retention/P2.json` |
| P3 | Phần thưởng & cosmetic + vị trí rewarded/interstitial hợp lệ | `retention/P3.json` |
| P4 | Nhịp phiên & onboarding 60s + benchmark D1/D7 + cách đo | `retention/P4.json` |

Cổng kiểm: `python3 retention/validate_ret.py --file <file>` (bắt buộc có số neo + nguồn + điều kiện sai + playables_ok).

## Lô 3 — CHẤM (3 con) — CHỜ LÔ 2 XONG
- V1 verify claim PHỦ ĐỊNH của T0 ("kênh X không có bản nào") bằng ≥3 đường khác nhau.
- V2 verify số/nguồn retention + đối chiếu luật Playables từng đề xuất.
- J1 judge rubric chấm 4 phương án retention theo thang điểm (không khen suông).

**Parent (em) hợp nhất** — con không viết bản cuối. Rồi trình anh: GO/KILL · tên · kênh nộp ưu tiên · bảng meta level.

## Việc còn lại sau swarm
Port lõi logic python (`game-gap-giay/code/g01,g08`) sang TS thuần → SPEC 5 file → Claude code MVP factory → QA Playwright + vision → T3 juice → T4 art (em gen WAN) → T5 pre-submit → nộp.
