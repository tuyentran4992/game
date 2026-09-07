# Slice Studio — TEST-CASES (freeze anchors · TDD theo subcard)

**Nguyên tắc:** 4 file freeze (`geom/path.ts`, `geom/slice.ts`, `core/scoring.ts`, `core/engine.ts`) + `__tests__/tierA.test.ts` 22/22 KHÔNG SỬA — mọi test mới dựng TRÊN public API đã có, không nới assert cũ. Dev tự verify số §5.6 trước khi xin review; QA đối chiếu số, không cày lại (COMPANY §5.6).

---

## 1. TEST NEO FREEZE (phải xanh TRƯỚC + SAU mọi subcard — regression gate)

| ID | Neo | Assertions giữ nguyên | Khi nào chạy |
|---|---|---|---|
| A-1 | `tierA.test.ts` | 22/22 PASS nguyên văn | trước mỗi merge subcard |
| A-2 | tsc | 0 error | mỗi build |
| A-3 | verify_game.sh M8-SliceStudio | 5/5 (tsc/vitest/build/asset manifest/boot) | trước bàn giao + trước nộp |

## 2. TEST MỚI THEO SUBCARD (TDD phân tầng §5.3)

### S2 level polish — TDD-A (RED-FIRST bắt buộc)
| ID | Case | Input → Expected |
|---|---|---|
| S2-T1 | validateLevels mở rộng vẫn chặn | thêm field hiển thị `flavor` → mọi assert cũ của validateLevels KHÔNG đổi; flavor: string EN ≤48 ký tự |
| S2-T2 | data integrity sau polish | `validateLevels(LEVELS)` = [] (0 lỗi) — path/shape/noGo/thresholds bit-cùng giá trị (snapshot so sánh object qua JSON) |
| S2-T3 | difficulty curve không bị trôi | script đọc LEVELS: pathLen L1=440±1px, tổng góc rẽ L8=2.73±0.05 rad, wobbleWeight L9=2, noGo L11=[44,54], thresholds M2=[55,75,95] — neo con số §6 SPEC |
| S2-T4 | mục tiêu phụ clean-skip L10 | engine hiện có: clean skip (nhả trước đỏ + tiếp sau) → excludeIdx không null + score.pct không bị đỏ kéo xuống (dùng TraceEngine thật, không mock engine) |

### S4 SDK/save — TDD-A (RED-FIRST — pure logic của save)
| ID | Case | Input → Expected |
|---|---|---|
| S4-T1 | reducer save | input result {stars:2,pct:81} level 5 vào save {stars[5]:3} → stars[5] GIỮ 3 (chỉ max) + unlockedLevel không đổi |
| S4-T2 | unlockedLevel chỉ tăng | save {unlocked:7} + result level 5 → vẫn 7; result level 8 3★ → 8 |
| S4-T3 | fullRunGhost cờ | streak 12 + level 12 ghost → fullRunGhost=true; streak đứt level 9 → false |
| S4-T4 | schema version | default save thiếu v → migrate về v1 default (không crash) |
| S4-T5 | serialize atomic | 1 object 1 lần ghi — spy ghi đếm 1 call/save event |
| S4-T6 | mock storage tròn trịa | save→load qua MockBackend/localStorage mock → JSON deep-equal |

### S1 art — TDD-B (qua interface typed + boundary QA)
| ID | Case | Kiểm chứng |
|---|---|---|
| S1-T1 | theme-config = data thuần | import → mọi hex là number, đủ 8 field interface Theme, KHÔNG import Phaser (grep) |
| S1-T2 | mask vs hit-shape ≤5% | test đọc config art: polygon mask render vs ellipse shape — lệch diện tích ≤5% (đúng kill-condition parent) |
| S1-T3 | atlas manifest | asset manifest verify rào 4 bắt được mọi atlas; 0 file load runtime ngoài atlas |
| S1-QA | vision boundary | QA soi screenshot 4 chương: palette đúng bảng DESIGN-SPEC §2, core reveal sắc, nửa hình tách đôi có hạt |

### S3 audio — TDD-B (WebAudio — không assert được "nghe", assert cấu trúc)
| ID | Case | Kiểm chứng |
|---|---|---|
| S3-T1 | config thuần | audio-config.ts KHÔNG import Phaser/DOM; mọi freq/gain/dur là số trong min/max khai báo |
| S3-T2 | voice chỉ thêm | grep synth.ts: chữ ký `slice/reveal/ghost/chunkLost` KHÔNG đổi (so diff param) |
| S3-T3 | muted no-op | Synth.muted=true → gọi mọi voice không throw, không tạo node |
| S3-QA | boot không lỗi | boot check console 0 error + gain master 0.5 đúng config |

### S4 part B — TDD-B (wiring)
| ID | Case | Kiểm chứng |
|---|---|---|
| S4-T7 | boot qua Mock | standalone boot → initialize() Mock path, loadData không throw khi storage rỗng |
| S4-T8 | visibilitychange save | dispatch event → saveData gọi đúng 1 lần (spy) |

### S5 UX/copy — TDD-B
| ID | Case | Kiểm chứng |
|---|---|---|
| S5-T1 | copy map EN thuần | copy-en.ts: mọi string ASCII EN, ≤3 từ (regex test), không dấu tiếng Việt |
| S5-T2 | popup có nút đóng | EndScene DOM/canvas element: nút close hit-region ≥44px, testid `btn-close` (TEST-FIELDS) |
| S5-QA | vision | 1 tay chạm được: nút trong bottom 40% màn 9:16; 0 chữ đè nhau |

### S6 PB-3 gate — checklist (không viết code game)
| ID | Gate | Số chốt |
|---|---|---|
| S6-1 | verify_game.sh | 5/5 + tierA 22/22 + tsc 0 |
| S6-2 | boot browser thật | headless Chrome 0 console error + testid game-canvas hiện |
| S6-3 | compliance C-1…C-8 | 8/8 PASS (E2E-TESTS.md) |
| S6-4 | smoke onboarding bot | ≤10 phút: 10 run người-mới (mô phỏng kéo lệch vừa) qua L1 sống ≥30s — bot CHỈ smoke, không gate độ vui (PB-3b) |

## 3. ĐỊNH NGHĨA "BROKEN" TRƯỚC KHI TEST (economy-designer rule)

- **BROKEN curve:** 1 trong 12 level có t3 đạt được bởi trace thẳng tay không (sim: điểm = 90%) tại level cong (L6–9) → wobble phạt không hoạt động.
- **BROKEN save:** xoay/visibility event sau khi cắt mà loadData thấy unlockedLevel tụt → FAIL S4.
- **BROKEN art:** mask vs ellipse >5% (S1-T2) → game "cắt hụt" theo cảm giác —FAIL trước QA vision.
- **BROKEN compliance:** bất kỳ mục C-* nào đỏ → KHÔNG nộp (PB-3 + Playgama reject án lệ).
