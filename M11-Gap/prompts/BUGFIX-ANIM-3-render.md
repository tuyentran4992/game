# BUGFIX HOẠT CẢNH — VÒNG 3: LÀM TẦNG VẼ ĐỌC STATE MỖI KHUNG (phạm vi hẹp, ≤70 lượt)

## Số đo THẬT của Hermes (Playwright, bản build hiện tại) — đây là chẩn đoán, không phải phỏng đoán
```
VÀO MÀN (0.2s/khung):
  t=0.2s px_đổi=    -1   phase=folding  foldProgress=1  holeCount=1
  t=0.6s .. 1.0s px_đổi=0            phase=folding
  t=1.0s px_đổi=    0   phase=folded
  t=1.2s px_đổi= 45858  ← giật 1 cú rồi đứng im
CHỌN ĐÁP ÁN:
  t=0.15s px_đổi=-1  phase=explaining  layerScales=[1,1,1,1]  holeCount=4
  t=0.30s px_đổi=40415 phase=result    layerScales=[1,1,1,1]  ← giật, KHÔNG có nội suy
```
Và ở lần đo trước: `__pcMotion` báo `foldProgress 0 → 0.24 → 0.46 → 0.91 → 1`, `layerScales [1,1,1,1] → [1,1,1,0.03] → [1,1,0.15,0] → [0.18,0.18,0,0] → [0,0,0,0]`.

⇒ **KẾT LUẬN: state animation CHẠY ĐÚNG, nhưng HÌNH VẼ không đổi theo từng khung** ⇒ mắt người không thấy chuyển động (chỉ thấy 1 cú giật lúc kết thúc). Thêm nữa: vào màn mất ~1,2s mới thấy đề (chậm hơn bản đang push ~1s).

## VIỆC PHẢI LÀM
### A. Một đường vẽ duy nhất đọc `motion` MỖI KHUNG (đây là gốc của lỗi)
- `SheetView` phải có **một hàm `draw(motion)`** được gọi **mỗi frame** (Phaser `update()`/`preUpdate()` hoặc `scene.events.on('update')`), vẽ lại tờ giấy từ **giá trị hiện tại** của `motion` (`foldProgress` khi gấp vào, `layerScales[]` khi mở bung, `holeCount` cho lỗ đục hiện dần).
- CẤM cách "vẽ lại khi đổi phase": mọi chuyển động phải là **nội suy theo khung**, không nhảy.
- Tham chiếu đúng cách MVP đã làm (vẽ theo tham số tiến trình mỗi frame):
  `/data/shared-board-agent-waves/game-gap-giay/prototype/gap-playtest.html` → `drawFoldPunch(canvas, folds, punch, tf, tp)` và `animateUnfold()` (vẽ `drawUnfold(..., t)` trong `requestAnimationFrame`, `dur = 900 + folds.length*250`).
### B. Số/thời lượng
- Gấp vào + đục lỗ khi vào màn: **tổng 0,5–0,7s**, xong phải vào chơi được ngay (phase `ready`). Hiện tại 1,2s và đứng im — phải hết.
- Mở bung khi trả lời: mỗi lớp `head 140ms`, so le `layerStep 110ms`, rồi lỗ `stagger 60ms`/`pop 250ms` (bảng số GIỮ NGUYÊN, test đang khoá).
### C. Sửa 1 lỗi typecheck còn lại
`tests/logic/scene-boot.test.ts(90,20): error TS2554: Expected 1 arguments, but got 2` → sửa cho khớp chữ ký thật (không `as any`, không `@ts-ignore`).
### D. Giữ nguyên hợp đồng QA
`window.__pcMotion = { phase, foldProgress, layerScales, holeCount }` cập nhật **mỗi khung**, chỉ ở kênh dev/standalone (kênh nộp vẫn 0 debug surface).

## NGHIỆM THU (Hermes sẽ chạy, bạn tự kiểm trước bằng lý luận + test)
Hermes chụp ảnh liên tiếp 0,2s/khung trong 3s ở màn chơi và yêu cầu:
1. **Vào màn**: có **≥4 khung liên tiếp** đổi >2.000 px (nội suy thật), và tổng thời gian tới lúc chơi được **≤1,0s**.
2. **Chọn đáp án**: `layerScales` phải đi qua **≥3 mốc khác nhau** (ví dụ 0,2 → 0,6 → 1) và ảnh phải đổi ở **≥3 khung** liên tiếp.
3. `npm run gate` XANH; `bash scripts/build-channels.sh` xong; 3 kênh `check-bundle` PASS (**kiểm mtime artifact mới**).
Dán output thật: `npm run gate`, `bash scripts/build-channels.sh`, 3 lệnh `check-bundle`.

## Luật phiên
Sửa được `src/**`, `tests/**`, `index.html`. CẤM `specs/**`, `harness/**`, commit/push, browser. **Nếu sắp hết lượt: dừng ở mốc gate xanh + ghi rõ còn gì** (đừng bỏ dở file đang viết) — quan trọng hơn là chạy hết mọi thứ.
