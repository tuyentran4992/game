# REVIEW-3 — STRESS / FUZZ / PURITY (góc "tấn công", không phải "đọc code")

> Phiên review ĐỘC LẬP #3 · session MỚI · **CẤM sửa file trong repo** · **KHÔNG copy test có sẵn làm bằng chứng** — phải tự viết script fuzz riêng trong `/tmp` và dán output thật.
> Mục tiêu: tìm ca mà implementation SAI/CHẾT mà test của tác giả không phủ.

| # | Đòn kiểm | Cách làm (dán output) |
|---|---|---|
| F1 | Fuzz nhiều seed | tự sinh ≥10.000 đề với **nhiều seed khác nhau** (không dùng lại 1 seed của tác giả) ⇒ mọi đề hợp lệ: đúng 1 đáp án, 4 phương án phân biệt, khoảng cách ≥ ngưỡng spec |
| F2 | Input bẩn | `foldCount` 0/1/5 · `punchPoints` rỗng/ngoài biên/trùng nhau · `levelIndex` âm/0/1e6 · `useCut`+`useDiagonal` cùng lúc ⇒ hành vi XÁC ĐỊNH, không crash, không trả đề sai |
| F3 | Determinism dưới tải | cùng (seed, levelIndex) gọi 100 lần ⇒ hash giống hệt; đổi thứ tự gọi giữa các màn không đổi kết quả |
| F4 | Purity thật | chạy `npm run test:logic` khi **không có DOM** (môi trường node) · grep `document|window|phaser|@game/sdk` trong src/logic |
| F5 | Ngẫu nhiên/thời gian ẩn | grep `Math.random|Date.now|performance.now|new Date` trong `src/logic` |
| F6 | Ca biên hình học vs bản Python | chạy `python3 game-gap-giay/code/g01_fold_sim.py`, đối chiếu từng ca (4/2/1/8/3 lỗ + ca gấp chéo D) với implementation TS |
| F7 | Hiệu năng | đo thời gian sinh 10.000 đề; >10s ⇒ báo động (kèm số đo) |
| F8 | Test tự-làm-oracle | chỉ ra case nào assert bằng CÔNG THỨC ĐỘC LẬP vs case nào chỉ so với chính implementation (loại sau là vô nghĩa) |

**Kết luận bắt buộc:** liệt kê MỌI ca làm implementation sai/chết + repro tối thiểu (input → output thật vs mong đợi) + 3 rủi ro lớn nhất. Không tìm thấy lỗi thì ghi rõ **đã thử những gì** (để chứng minh đã tấn công thật).
