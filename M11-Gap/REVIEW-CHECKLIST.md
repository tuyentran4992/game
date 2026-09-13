# M11 — REVIEW = 3 phiên ĐỘC LẬP, SONG SONG (mỗi phiên 1 góc, không đụng nhau)

| Phiên | Góc | Checklist | Prompt mẫu |
|---|---|---|---|
| **Review-1** | **Code có ĐÚNG không** (nghiệp vụ, test thật, PC-xx, chân lý hình học) | `REVIEW-1-CODE.md` (C1-C12) | `prompts/B1a-3a-review-code.md` |
| **Review-2** | **Tấn công**: stress/fuzz/input bẩn/determinism/purity/hiệu năng | `REVIEW-3-STRESS.md` (F1-F8) | `prompts/B1a-3b-review-fuzz.md` |
| **Review-3** | **Kiến trúc & design pattern** (ranh giới, 1 file 1 trách nhiệm, pattern thật, phép thử mở rộng) | `REVIEW-2-ARCHITECTURE.md` (A1-A15) | `prompts/B1a-3c-review-arch.md` |

Luật chung: session MỚI · **cấm sửa code** · kết luận kèm `file:dòng` + output lệnh thật · thiếu dữ kiện ⇒ ghi `KHÔNG KIỂM CHỨNG ĐƯỢC`.
Hermes gom 3 báo cáo → **dedupe**: mục 2-3 phiên cùng báo FAIL = FAIL thật; 1 phiên báo FAIL = Hermes tự soi lại (chống false-positive).
