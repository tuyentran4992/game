Bạn là dev TypeScript — TÁC GIẢ DUY NHẤT của batch B3a (render vòng chơi). Mục tiêu: làm XANH bộ test B3a (`view-b3a-*.test.ts`) + dựng scene chơi thật.

Luật phiên + GÓI NGỮ CẢNH B3a (danh sách file được phép tạo, palette/cỡ chữ có số dòng, thông số animation, 20 testid, hợp đồng logic, cổng) đã nằm trong system prompt. Không cần đọc lại specs/DESIGN-SPEC/E2E — trừ khi pack ghi "đọc từ file thật".

TRƯỚC KHI CODE — kiểm tra tiền đề (làm trước tiên, ≤10 lượt):
1. `ls src/logic/` — phải có `levelState.ts` + `progression.ts` (B1b) và `i18n.ts` + `save.ts` + `economy.ts` (B1c); `ls src/platform/` phải có adapter + `?debug` hooks (B2). **Thiếu file nào ⇒ DỪNG, BÁO blocked kèm danh sách thiếu + hàm cần dùng. CẤM tự viết tạm logic/i18n/ad trong scene.**
2. `grep -n "export" src/logic/levelState.ts src/logic/i18n.ts src/platform/index.ts` — lấy TÊN HÀM THẬT, gọi đúng chữ ký. Pack nêu hợp đồng dự kiến; file thật là chân lý.

PHẠM VI FILE: đúng danh sách pack §1 (`src/render/**` + `src/ui/testids.ts` + sửa `src/main.ts` + test của bạn nếu test sai hợp đồng — báo trước khi sửa test).

RÀNG BUỘC CỨNG:
- **CHỈ ĐỌC logic**: scene nhận LevelSpec + snapshot máy trạng thái để vẽ. CẤM tính lại nghiệp vụ: không so `correctIndex`, không đếm lỗ, không suy sao, không tự quyết unlock/undo eligibility. Mọi chuyển state qua dispatch của `levelState`; mọi chuỗi qua `t(...)` (PC-19 — grep literal display-string = 0, whitelist theo pack §7).
- **CẤM gọi mạng** (PC-15): không fetch/XHR/WebSocket/EventSource/importScripts, không URL http(s) trong mã chạy được. Ads/lifecycle/storage chỉ qua `PlatformAdapter` (Null Object standalone — ad absent ⇒ ẩn nút, không crash, không đỏ lỗi).
- **Testid**: dựng `src/ui/testids.ts` theo tiền lệ M10 (`/data/youtube-playables/M10-BanhMi-Master/game/src/ui/testids.ts` — xem 15 dòng đầu, model `registerTestid(id,x,y,w,h)` + `markCanvas` + `window.__pcTestids`); MỌI element trong danh sách 20 tên pack §6 phải được register với rect thật ≥44px chiều chạm, cập nhật sau resize.
- **Layout**: camera 1920×1080 `Phaser.Scale.Fit` + cột playfield 720 (pack §2 ⚠️: dựng theo tỷ lệ chiều cao camera, không copy pixel trục dọc mockup). Không scrollbar — canvas tràn viewport, body overflow hidden trong index.html nếu cần (được sửa index.html tối thiểu).
- **Animation đúng số pack §5** (đó là hợp đồng test — không đổi): mở bung 140ms ease-out/so le 110ms (4 lớp=470ms·8 lớp=910ms), pop lỗ 250ms so le 60ms, explain ≥700ms (vệt 500 + blend 200), breathe 1→1,02 yoyo 1,2s lặp 2 nhịp idle≥5s chỉ màn dạy luật, màn kế trượt 400ms, shake ≤4px, chạm scale 0,96.
- **Không win screen** (PC-09): sau state `correct`, PlayScene tự dựng tờ màn kế (LevelSpec màn kế đã sinh sẵn — gọi logic, không pre-gen 120 màn, DM:375) + đúng 1 nút UNFOLD.
- **Buffer input khi animate** (PC-05): ô disabled alpha 0.6, cú bấm chuyển cho `levelState` buffer — scene không tự bỏ rơi input.
- Mất focus (PC-17): subscribe lifecycle B2 ⇒ pause tween + timer qua cùng 1 nguồn; resume tiếp đúng frame.
- 1 file 1 trách nhiệm, header `// Pattern: <tên>` theo STRUCTURE §2; scene không quá ~250 dòng ⇒ tách component/theme ra file riêng; ≥3 nhánh ⇒ bảng tra.
- CẤM: `npm install`, sửa `package.json`/`vite.config.ts`/`src/logic/**`/`src/platform/**`/`docs/**`/`specs/**`, commit/push, `any`/`@ts-ignore`, `console.log` còn sót, đọc node_modules.

TEST ĐỎ VÔ NGHĨA: nếu test B3a assert sai số so với pack (sai chính tả/vi phạm DS đã chốt) ⇒ BÁO, sửa theo pack, ghi chú trong báo cáo. Nếu test bắt behaviour ngoài khả năng Phaser thật (vd đo FPS) ⇒ đánh dấu `.skip` + giải trình, không xoá test.

TRƯỚC KHI BÁO XONG (bắt buộc, đúng thứ tự, ĐÚNG 1 LẦN mỗi lệnh cuối phiên):
```
cd /data/youtube-playables/M11-Gap/game
npm run gate            # typecheck + test:logic + gate-smell ⇒ dán tail -20 output THẬT
npm run build           # ⇒ dán tail -15 (0 lỗi; bundle size thật)
```
Gate đỏ ⇒ sửa rồi chạy lại, không báo cáo khi chưa xanh. Nếu sau 2 lần gate vẫn đỏ vì lỗi ở file batch khác (logic/platform) ⇒ BÁO rõ file:dòng chặn, không sửa hộ.

BÁO CÁO CUỐI (ngắn, bằng số): file đã tạo/sửa · bảng 20 testid → file:dòng đăng ký · output `npm run gate` + `npm run build` (dán thật) · số it() trước/sau · mọi chỗ lệch pack + lý do · việc KHÔNG LÀM ĐƯỢC (nếu có).
