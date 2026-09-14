# M11 — Paper Crease · BATCH-PLAN (chia nhỏ để không quá tải)

> Luật: **mỗi batch = 1 tầng** · mỗi batch có **cổng kiểm chạy bằng máy** · mỗi batch chạy **4 bước ĐỘC LẬP**:
> **1) viết test trước (RED) → 2) code tới khi xanh → 3a) REVIEW-1 code đúng/sai → 3b) REVIEW-2 kiến trúc & design pattern**.
> Hai phiên review độc lập nhau, mỗi phiên session mới, **cấm sửa code**, chỉ báo cáo kèm `file:dòng`.
> Checklist: `REVIEW-1-CODE.md` (C1-C12) · `REVIEW-2-ARCHITECTURE.md` (A1-A15).
> Model: **qwen3.8-flash** (anh chốt 13/09). Prompt NGẮN, tham chiếu file.
> **Hermes KHÔNG verify từng bước** (anh chốt 13/09: *"verify kết quả như người dùng cuối thôi"*). Claude chạy trọn 4 bước của batch;
> Hermes chỉ **verify ở MỐC kết quả** như người chơi thật: mở game trên browser, chơi thử, chụp ảnh + vision, đo số (load, bundle, console), rồi anh chơi tay duyệt cảm giác.

## Mốc verify (end-user, không phải từng bước)
| Mốc | Sau batch | Hermes làm gì |
|---|---|---|
| **M1 — game chơi được** | B1a·B1b·B1c·B2·B3a | mở build standalone trong browser thật, chơi 5-10 màn như người mới, chụp ảnh + vision, đọc lỗi console, đo load/bundle → trình anh chơi tay |
| **M2 — trọn vòng tiến trình** | B3b | chơi xuyên chương: map/sao/shop/save/reload, vẫn chụp ảnh + vision |
| **M3 — art & juice** | B4 | art QA 5 câu (DS §4.5) + vision trên build thật |
| **M4 — bản nộp** | B5 | unzip-serve-chơi-thử + `validate.py` + `verify_game.sh`, rồi pre-submit gate |

| Batch | Nội dung | Rule phủ | Cổng kiểm |
|---|---|---|---|
| **B1a** | Lõi hình học: `rational` · `foldRules` · `generator` · `validator` (+`types`) | PC-02/03/04 | `npm run test:logic` xanh · grep `Math.random`=rỗng · case 10.000 đề |
| **B1b** | Máy trạng thái màn + tiến trình: `levelState` · `progression` | PC-01/05/06/07/09/10 | vitest + đối chiếu bảng §6.1 |
| **B1c** | Kinh tế & lưu trữ: `economy` · `save` · `records` · `telemetry` · `i18n` | PC-11/12/15/16/19 | vitest save/migrate/hỏng + grep 0 chuỗi hardcode |
| **B2** | Nền tảng: `platform/*` 4 adapter + debug hooks `?level/?seed/?ad=mock` | PC-13/14/17/20 | grep 0 call mạng · boot standalone 0 lỗi console |
| **B3a** | Render vòng chơi: Boot·Title·Play + animation **mở bung từng lớp** | PC-05/09 | build + Playwright E2E nhóm B/O/L (ảnh + vision) |
| **B3b** | Render vòng tiến trình: Map·Score·Shop·End + album/huy hiệu | PC-07/11/12/18 | build + Playwright E2E nhóm R/S/U/G |
| **B4** | Art + juice: em gen asset WAN → Claude tích hợp + SFX/particle | DESIGN-SPEC §4-5 | art QA 5 câu (DS §4.5) + vision |
| **B5** | Build 3 nền tảng + validate/package + metadata nộp | PC-14/15 + luật kênh | `verify_game.sh` + `validate.py` + unzip-serve-chơi-thử |

Trạng thái: **B1a — bước 1 (viết test) đang chạy 13/09**.

## Luật khi REVIEW FAIL (chốt 13/09)
1. **FAIL nhỏ** (naming · dead code · thiếu edge · comment thừa) → 1 vòng fix: prompt NGẮN chỉ nêu đúng mục FAIL + bằng chứng `file:dòng`, cấm đụng thứ đã PASS; xong chạy lại **2 phiên review MỚI**.
2. **FAIL kiến trúc** (ranh giới 1 chiều sai · A5 phép thử mở rộng hỏng · A15 "sửa >3 file" · pattern khai báo không thật) → **DỪNG batch, sửa KHUNG trước** rồi mới đi tiếp (không để thành nợ REFACTOR).
3. **FAIL nghiệp vụ** (rule chưa implement · chân lý hình học sai) → KHÔNG sửa vội: xác định **SPEC sai hay code sai** (SPEC sai ⇒ sửa SPEC + ghi lý do; code sai ⇒ fix).
4. **Tối đa 2 vòng fix/batch** — fail vòng 2 ⇒ DỪNG, báo anh, đề xuất hạ scope / đổi cách / đổi model (glm-5.2). Không sa lầy.
5. **Không ai tự sửa hộ**: Hermes không sửa tay code; reviewer cấm sửa code (giữ tính độc lập) — sửa luôn là phiên riêng do Hermes ra prompt.
6. **"Chưa làm" ≠ FAIL**: mục thuộc batch sau ghi vào danh sách NỢ theo batch.
7. **Review là ý kiến thứ hai, không phải chân lý**: nếu reviewer báo FAIL sai (bắt lỗi "code thừa" nhưng là quyết định sản phẩm) ⇒ Hermes ghi lý do + bằng chứng và bỏ qua mục đó.
8. Mỗi vòng fix ghi `FIX-ROUND-N.md` trong module (đếm lỗi theo nhóm để chỉnh prompt/quy trình).

## Prompt ledger (mỗi dòng = số prompt/session giao Claude)

| Batch | Nội dung | Prompt test | Prompt code | Prompt review | Tổng | Trạng thái |
|---|---|---|---|---|---|---|
| **B1a** | Lõi hình học: rational·foldRules·generator·validator | 1 | 1 | 3 | 5 | ✅ test xong (1 con) · code đang chạy · review chưa |
| **B1b** | Máy trạng thái màn + tiến trình: levelState·progression | 2 | 1 | 3 | 6 | chờ |
| **B1c** | Kinh tế/lưu trữ: economy·save·records·telemetry·i18n | 2 | 1 | 3 | 6 | chờ |
| **B2** | Nền tảng: 4 adapter + debug hooks | 2 | 1 | 3 | 6 | chờ |
| **B3a** | Render vòng chơi: Boot·Title·Play + animate mở từng lớp | 2 | 1 | 3 | 6 | chờ |
| **B3b** | Render tiến trình: Map·Score·Shop·End | 2 | 1 | 3 | 6 | chờ |
| **B4** | Art + juice (em gen asset WAN trước) | 0 | 1 | 2 | 3 | chờ |
| **B5** | Build 3 nền tảng + validate/package + metadata | 0 | 1 | 2 | 3 | chờ |
| | **TỔNG** | **11** | **8** | **22** | **41** | + 2-4 prompt fix nếu review FAIL |

Quy ước: test & review = swarm (mỗi con 1 hướng, không đụng nhau) · code = 1 con (một tác giả) · B4/B5 không tách test vì cổng là art-QA/package-gate của Hermes.
Kế hoạch 3 bước ban đầu (1 test + 1 code + 2 review) đã đổi thành **swarm**: 2 test + 1 code + 3 review cho các batch lõi.

## Quy ước đẩy code (anh chốt 13/09)
**Không push lắt nhắt.** Làm hết các vòng fix + gate + review, **khi xong mới push 1 lần** (kèm báo cáo review trong cùng commit).
Nhánh làm việc: `m11/b1a-core-geometry`. Không đẩy thẳng `main` khi worktree M10 còn thay đổi chưa commit.
