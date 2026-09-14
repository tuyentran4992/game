# BUGFIX — MẤT HOẠT CẢNH GẤP GIẤY & MỞ BUNG (chủ dự án báo, đã đo bằng máy)

## 1. Hiện tượng (đo được, không phải cảm tính)
Probe Playwright chụp 5 khung hình liên tiếp rồi đếm pixel đổi (>8/255):
```
vào màn +120ms  → 45.852 px đổi
vào màn +300ms  →      0 px đổi   ← đứng hình
vào màn +600ms  →      0 px đổi
vào màn +1200ms →      0 px đổi
bấm đáp án +0ms     → 100.551 px đổi
bấm đáp án +150ms   →       0 px đổi   ← đứng hình
bấm đáp án +400ms   →       0 px đổi
bấm đáp án +800ms   →       0 px đổi
bấm đáp án +1600ms  →  29.305 px đổi  (UI kết quả, không phải mở bung)
```
⇒ **Vào màn**: giấy hiện ra đã gấp sẵn, KHÔNG có hoạt cảnh gấp + đục lỗ.
⇒ **Trả lời**: tờ giấy nhảy sang trạng thái mở trong ~150ms, KHÔNG có mở bung từng lớp.

## 2. Chuẩn tham chiếu (bản MVP chủ dự án đã duyệt — phải khôi phục ĐÚNG hoạt cảnh này)
`/data/shared-board-agent-waves/game-gap-giay/prototype/gap-playtest.html`
- `drawFoldPunch(canvas, folds, punch, tf, tp)` — "animation ĐỀ BÀI: gấp giấy rồi đục lỗ": tiến trình `tf` gấp từng nếp, rồi `tp` cho lỗ đục hiện ra.
- `animateUnfold()` — mở bung với `dur = 900 + folds.length * 250` ms, vẽ theo tiến trình `t` 0→1.
- Bảng số của bản mới (DESIGN-SPEC §7 / `anim/unfoldPlan.DUR`): `head 140 · layerStep 110 · holeStagger 60 · pop 250`.

## 3. Nghi vấn cần kiểm (đọc code để XÁC ĐỊNH, đừng sửa mù)
- `PlayScene.openSpec()` gọi `sheet.fold(folds)` rồi `delayedCall(DUR.head=140ms) → go(ready)`: không có bước "gấp vào" nào được phát; có thể `fold()` đặt thẳng trạng thái cuối.
- `PlayScene.reveal()` → `sheet.unfold(unfoldPlan(layers), tail)`: tween CÓ được tạo (`delay: row.startMs`, `duration: row.layerDurMs`) nhưng **không tạo chuyển động nhìn thấy**. Kiểm: (a) giá trị khởi tạo của tween có BẰNG giá trị đích không (⇒ không có gì để chạy); (b) `arrange()`/`paint()` có ghi lại vị trí/scale cuối NGAY sau khi tween được tạo không; (c) object được tween có phải chính object đang nhìn thấy không (layer vs ảnh/ghost/bản vẽ khác).

## 4. YÊU CẦU SỬA
1. **Vào màn**: có hoạt cảnh **gấp giấy vào** rồi **lỗ đục hiện ra** (theo `tf`, `tp` như MVP), tổng ~0,6-0,9s; trong lúc đó khoá chạm như hiện tại.
2. **Trả lời**: **mở bung từng lớp** đúng bảng `unfoldPlan` (mỗi lớp `head 140ms`, so le `layerStep 110ms`), xong mới tới `popHoles` (`stagger 60ms`, `pop 250ms`) hoặc `explain` khi sai — như code đang mô tả.
3. Không đổi luật nghiệp vụ, không đổi số trong bảng (số đã đúng).

## 5. HỢP ĐỒNG KIỂM CHỨNG (bắt buộc — để Hermes nghiệm thu được, không sửa giả)
Thêm **cửa QA đo hoạt cảnh** giống `testid` đang có: cập nhật mỗi khung hình một object toàn cục
`window.__pcMotion = { phase, foldProgress, layerScales: number[], holeCount }`
- CHỈ tồn tại ở kênh **dev/standalone** (kênh nộp vẫn phải 0 debug surface — `check-bundle` phải PASS; dùng đúng cơ chế dead-code đã có).
- Hermes sẽ: vào màn → đọc `__pcMotion.foldProgress` vài lần → phải thấy **giá trị tăng dần 0→1** (không nhảy thẳng); bấm đáp án → `layerScales` phải có **≥3 giá trị khác nhau tăng dần** cho 4 lớp, và `holeCount` tăng dần.
- Kèm test thuần số trong repo: bảng `unfoldPlan(layers)`/fold-in phải cho **các mốc trung gian phân biệt** (không phải 1 bước nhảy).

## 6. Cổng
- `npm run gate` XANH · `scripts/build-channels.sh` chạy hết · 3 kênh `check-bundle` PASS (**nhớ kiểm mtime artifact mới hơn lúc bắt đầu**).
- CẤM sửa `specs/**`, `harness/**`; KHÔNG commit/push.
