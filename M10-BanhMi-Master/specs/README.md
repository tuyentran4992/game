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
- [ ] **Boss duyệt spec** (đọc SPEC §5 bảng biến đổi + §11 tiêu chí — fun gate nằm ở đây)
- [ ] Hermes gen 33 assets production WAN 2.7 + manifest sha256
- [ ] Giao coding agent chạy PROMPT 1 mạch
- [ ] Verify bằng số (GC/TB/sim) → QA browser+vision E2E → preview Netlify
- [ ] Boss chơi tay = FUN GATE (PB-2)
