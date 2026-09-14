Bạn là REVIEWER ĐỘC LẬP cho batch B5 — KIẾN TRÚC ĐÓNG GÓI. **CẤM SỬA FILE TRONG REPO** (thí nghiệm A7: copy `check-bundle.mjs` sang /tmp rồi sửa ở đó).

Định dạng output nằm trong gói review. **CHECKLIST B5-ARCH ở dưới thay cho checklist logic trong gói** — chấm A1..A15, mỗi mục 1 dòng `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng / số đo |`. Chỉ đọc: `game/tools/check-bundle.mjs`, `game/metadata/metadata.json`, `games/paper-crease.yaml`, `game/package.json`, `game/vite.config.ts`, entrypoints `*.html`, `src/platform/*` (nếu đã có ở B2), và ghi nhớ CẤM sửa pipeline.

- A1 Tách tầng ở packaging: check-bundle KHÔNG chứa luật nghiệp vụ game; pipeline `packages/pipeline/` KHÔNG bị sửa (`git status`/`git diff --stat` trong `/data/youtube-playables` — dán kết quả, chỉ tính file pipeline).
- A2 1 file 1 trách nhiệm: `check-bundle.mjs` làm đúng 4 nhóm kiểm đã khai (debug/network/size/asset-path), không lẫn nhiệm vụ metadata.
- A3 Cổng có THẬT: luật trong `check-bundle.mjs` khớp luật pack B5 (dẫn chứng từng rule bằng số dòng).
- A4 Rule = BẢNG DỮ LIỆU: thêm 1 pattern cấm phải sửa ≤1 chỗ khai báo (đếm chỗ phải sửa); if/else dây ≥3 nhánh theo pattern ⇒ FAIL.
- A5 Phép thử mở rộng (làm trong /tmp): thêm 1 kênh thứ 4 `newchan` giả định ⇒ phải sửa bao nhiêu file? >3 (kịch bản: thêm script build + snapshot + whitelist channel + metadata) ⇒ ghi rõ từng file, FAIL nếu phải sửa code check-bundle chứ không thêm dữ liệu.
- A6 Không abstraction thừa: channel/đường dẫn hardcode trùng nhiều lần ⇒ điểm danh.
- A7 Config là dữ liệu: version khai báo ĐÚNG 1 Nơi (package.json), metadata/không hardcode; ngưỡng (1.6MB/5MB/512KB) là hằng số đặt tên, không rải magic number (grep count).
- A8 Ngưỡng nằm ngoài logic: luật kênh (ytgame sạch URL, playgama whitelist bridge) tách khỏi trình duyệt file.
- A9 DRY giữa check-bundle và verify_game.sh/pipeline: trùng kiểm có chủ đích (nhiều tầng) ⇒ OK; trùng luật ĐO bằng nhau 2 chỗ khác số ⇒ FAIL (dán 2 số).
- A10 Không side-effect ẩn: script build không ghi đè snapshot của kênh khác (kiểm: build 2 mode liên tiếp, snapshot mode 1 không đổi md5 — chạy trong /tmp-copy nếu repo đang bận).
- A11 Lỗi đúng tầng: build fail ⇒ cổng báo ở bước build, không để check-bundle im lặng "PASS" trên thư mục rỗng (thử: chạy check trên /tmp/empty ⇒ exit ≠ 0?).
- A12 Không `catch {}` nuốt lỗi trong check-bundle (grep `catch` — dán dòng).
- A13 Không hardcode đường dẫn tuyệt đối/username/tên máy trong script + metadata; tên kênh/không bịa trong ytgame build (grep "GẤP").
- A14 Config yaml metadata khớp schema pipeline (đối chiếu keys với `packages/pipeline/src/config.py:validate_config` — đọc để đối chiếu, không sửa).
- A15 Thước đo cuối: nộp kênh thứ 3 (giả định CrazyGames) phải sửa: 1 script build mới + 1 mục bảng rule + 1 thư mục metadata — nếu phải đụng >3 file CŨ ⇒ FAIL kiến trúc.

Tin nhắn CUỐI = bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Số thật, ngắn. ≤25 lượt; hết giờ ⇒ chấm A1/A3/A4/A7/A10 trước.
