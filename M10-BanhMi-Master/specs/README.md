# M10 "Banh Mi Master" — specs
Quán bánh mì đường phố Việt: **order flash 1 lần rồi biến mất — nấu bằng trí nhớ**.
Ý tưởng 09/09/2026 (boss chốt hướng 1 food-decorate, Hermes tự research + tự viết spec — không qua company, lệnh 09/09).

## File
| File | Vai |
|---|---|
| `SPEC.md` | Luật chơi, vòng lặp, win/lose, biến đổi trong ca, anti-clone |
| `DATA-MODEL.md` | Nguồn SỐ duy nhất: 12 nguyên liệu, 8 khách, order gen, scoring, WAIT!, rank |
| `DESIGN-SPEC.md` | Art-theme per-game, layout 720×1280, danh mục 33 asset WAN, data-testid, juice |
| `TEST-CASES.md` | GC-01..14 vitest + TB-01..06 build gates + sim harness 40 seed 2 bot |
| `E2E-TESTS.md` | Hermes QA sau build: 16 functional + 6 visual gate + 5 usability + 5 platform |
| `CATALOG-CHECK.md` | PB-5 anti-clone evidence (0 bản cùng mechanic trên Playgama/Playables) |
| `PROMPT.md` | Gói 1-mạch cho coding agent — CHỈ chạy SAU KHI assets production đã gen |

## Trạng thái PHASE 0 (gate trước khi code — luật boss 08/09)
- [x] Research market + anti-clone (09/09)
- [x] 5 file spec + catalog-check + PROMPT (09/09)
- [x] Boss duyệt + lệnh bổ sung 09/09: **không browser test (code test thôi) · TDD · anti god class · Claude Code model qwen3.8-flash**
- [ ] Hermes gen 37 assets production WAN 2.7 + manifest sha256 (`scripts/gen_assets_m10.py`)
- [ ] Giao coding agent (qwen3.8-flash) chạy PROMPT 1 mạch — TDD RED→GREEN
- [ ] Verify bằng số (GC 14/14 + TB 6/6 + sim 40 seed 2 bot) — gate CHÍNH, không browser
- [ ] Deploy preview Netlify → **boss chơi tay = FUN GATE (PB-2)**
