# GÓI REVIEW — checklist + lệnh + định dạng output (không cần đọc file nào thêm)

## CẤM LÁI BROWSER (anh chốt 14/09/2026)
Reviewer CHỈ kiểm CODE. **CẤM**: mở browser, Playwright/Puppeteer/CDP, `vite preview`, `npm run dev`, chụp ảnh, điều khiển UI thật — những việc đó **tốn rất nhiều thời gian và là việc của Hermes/anh ở MỐC kết quả**, không phải của phiên review.
Được phép: đọc file, `grep`, chạy `vitest`, viết **script node/python trong `/tmp`** để gọi thẳng hàm (fuzz, đo số) — tất cả ở tầng CODE.

## Lệnh được phép chạy (đúng 4 nhóm này)
- `cd /data/youtube-playables/M11-Gap/game && npm run typecheck && npm run test:logic` (dán output thật)
- `grep -nE "Math.random|Date.now|performance.now|document|window|fetch|any|@ts-ignore|console.log|NOT_IMPLEMENTED" src/logic/*.ts`
- `grep -nE "^import" src/logic/*.ts` (dựng đồ thị phụ thuộc thật)
- `python3 /data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py` (chân lý hình học)

## CHECKLIST C1-C12 (code đúng/sai)
C1 test xanh THẬT (dán output) · C2 test không sáo rỗng (mỗi `it()` phải assert giá trị cụ thể, không chỉ `toBeDefined`) · C3 case 10.000 đề chạy đủ vòng · C4 determinism (cùng seed ⇒ cùng đề) · C5 chân lý hình học khớp Python (4/2/1/8/3 lỗ) · C6 rule PC-01..PC-20 có được cài thật · C7 logic thuần (không DOM/phaser/fetch) · C8 typecheck sạch, không `any`/`@ts-ignore` · C9 edge (foldCount 0, điểm ngoài biên, levelIndex lớn) · C10 không rác (console.log, code chết, NOT_IMPLEMENTED) · C11 `shareCode` ổn định · C12 đề có ĐÚNG 1 đáp án / 4 ô phân biệt.

## CHECKLIST F1-F8 (stress/fuzz — tự viết script nháp trong /tmp)
F1 fuzz ≥5.000 đề **nhiều seed khác nhau** (không dùng lại seed của tác giả) ⇒ mọi đề hợp lệ · F2 input bẩn (foldCount 0/5, punch rỗng/ngoài biên/trùng, levelIndex âm/0/10^6) ⇒ không crash, hành vi xác định · F3 cùng seed+index gọi 100 lần ⇒ hash giống hệt · F4 purity: logic chạy được không cần DOM · F5 không phụ thuộc thời gian/ngẫu nhiên ẩn · F6 số lỗ đúng ở ca biên hình học (so Python) · F7 hiệu năng sinh 10.000 đề (ghi số ms) · F8 chỉ ra case test nào đang TỰ TÍNH LẠI implementation làm oracle (test giả xanh).

## CHECKLIST A1-A15 (kiến trúc/pattern)
A1 ranh giới 1 chiều (ai được import ai) · A2 1 file 1 trách nhiệm · A3 pattern khai báo có THẬT trong code · A4 ≥3 nhánh `if/else`/`switch` ⇒ phải là bảng tra/registry · A5 **phép thử mở rộng**: thêm 1 `FoldKind` mới phải sửa bao nhiêu file (>2 file ngoài bảng dữ liệu + types ⇒ FAIL) · A6 abstraction thừa · A7 config là dữ liệu, không hardcode · A8 số/ngưỡng nằm ngoài logic · A9 DRY · A10 hàm thuần, không side-effect ẩn · A11 lỗi đúng tầng · A12 không `catch {}` nuốt lỗi · A13 không hardcode nền tảng (title/url/API) · A14 test là lưới an toàn hay chạm chi tiết nội bộ · A15 thước đo: thêm 1 tính năng phải sửa bao nhiêu file cũ.

## ĐỊNH DẠNG TRẢ LỜI (bắt buộc — tin nhắn CUỐI của bạn phải là bảng này)
```
KẾT LUẬN: PASS | FAIL
| mục | phán quyết | bằng chứng (file:dòng hoặc số đo) |
| C1 | PASS | ... |
...
ĐIỂM NGHI NGỜ: ...        (mục không kiểm chứng được + lý do)
3 RỦI RO LỚN NHẤT: 1) ... 2) ... 3) ...
```
CẤM: mô tả quy trình, khen ngợi, viết lan man. Nói PASS mà không có file:dòng/số đo = báo cáo bị loại.
