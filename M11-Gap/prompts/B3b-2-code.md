Bạn là dev TypeScript — TÁC GIẢ DUY NHẤT của batch B3b (render vòng tiến trình). Mục tiêu: làm XANH bộ test B3b (`view-b3b-*.test.ts`) + dựng scene tiến trình thật.

Luật phiên + GÓI NGỮ CẢNH B3b (file được phép tạo, palette/testid/bố cục có số dòng, hợp đồng logic, cổng) đã nằm trong system prompt. B3a đã xong — kế thừa `src/ui/testids.ts` + components + theme, KHÔNG định nghĩa lại.

TRƯỚC KHI CODE — kiểm tra tiền đề (≤10 lượt):
1. `ls src/logic/` phải có `progression.ts`, `economy.ts`, `save.ts`, `records.ts`, `i18n.ts`; `src/platform/` có adapter + lifecycle. Thiếu ⇒ DỪNG, BÁO blocked kèm hàm cần dùng. CẤM viết tạm nghiệp vụ trong scene.
2. `grep -n "export" src/logic/progression.ts src/logic/economy.ts src/logic/save.ts src/render/theme/paperTheme.ts src/ui/testids.ts` — lấy TÊN HÀM/CHỮ KÝ THẬT. File thật là chân lý, pack chỉ dự kiến.
3. Đọc nhanh `src/render/scenes/PlayScene.ts` + `TitleScene.ts` (B3a) để nối navigation đúng chiều (`scene.start('Map')` v.v.), không sửa hành vi của chúng.

PHẠM VI FILE: đúng pack §1 (`src/render/scenes/{Map,Score,Shop,Album,End}Scene.ts`, `components/{MapNode,SkinCard,BadgeIcon}.ts`, `viewmodel/mapModel.ts`, `src/main.ts`, test của mình nếu test sai hợp đồng — báo trước). Được sửa minimally: stub Shop trong `TitleScene.ts` → scene thật; thêm dòng AlbumScene vào STRUCTURE nếu chưa (khai báo lại trong báo cáo). CẤM sửa file logic/platform/animation B3a — lỗi phát hiện ở B3a ⇒ ghi NỢ, không sửa hộ.

RÀNG BUỘC CỨNG:
- **CHỈ ĐỌC logic**: map không tự tính khoá (nhận `locked`/sao từ progression qua `mapModel`); shop không tự cộng/trừ Mực (economy trả kết quả mua ⇒ scene vẽ); score không tự tổng sao (logic đưa số); end không tự mở Master (dispatch + cờ `master_unlocked`). CẤM biểu thức nghiệp vụ trong scene (đây là mục reviewer C-R1 chấm).
- **CẤM gọi mạng** (PC-15); save/storage chỉ qua hàm B1c + adapter; interstitial chỉ qua `platform.ads` với callback, và CHỈ ở ScoreScene, chỉ sau tween sao xong (PC-14/DS:105). Ad từ chối/không có (Null Object) ⇒ luồng chạy tiếp, 0 exception.
- **Testid**: đăng ký ĐỦ 14 tên pack §5 qua `registerTestid` (kể cả prefix động `{1..8}`/`{i}`/`{n}`), rect thật ≥44px chạm; nút Settings (`testid-set-*`) nằm trong modal của MapScene.
- **Layout**: reuse camera Fit + cột 720 của B3a; map lưới 5×3 ô 168×168 + tab pill 200×72 cuộn ngang; shop 2×4 card 260×300; album 4 cột 200×200 + badge ⌀96; score panel 480×560; safe area ≥16px. Sống ở 9:16→32:9, không khoá hướng, resize giữa màn không reset dữ liệu (R-04: chỉ layout, không sinh lại model).
- **Text qua `t()`** (PC-19): mọi chuỗi hiển thị là key i18n; copy EN nộp đúng pack §3 ("Chapter complete", "You unfolded all 120", "Next chapter", "View map", điều kiện khoá "12/15 ★"); không display-string literal, không tiếng Việt trên UI.
- **Master (PC-18)**: nút `testid-end-master` dispatch mở master; PlayScene tự ẩn hint/timer theo cờ logic — B3b không đụng code PlayScene.
- **Reset save** (S-02): modal xác nhận 2 bước, gọi save API B1c; kết quả (về màn 1, giữ skin) do logic trả — scene chỉ vẽ + điều hướng Title.
- 1 file 1 trách nhiệm, header `// Pattern:`; scene ≤~250 dòng ⇒ tách component; ≥3 nhánh ⇒ bảng tra; CẤM `any`/`@ts-ignore`/`console.log` sót/`npm install`/sửa package.json/commit/push.

TRƯỚC KHI BÁO XONG (đúng thứ tự, ĐÚNG 1 LẦN mỗi lệnh cuối phiên):
```
cd /data/youtube-playables/M11-Gap/game
npm run gate            # typecheck + test:logic + gate-smell ⇒ dán tail -20 output THẬT
npm run build           # ⇒ dán tail -15 (bundle size thật, <5MB)
```
Gate đỏ do lỗi file batch khác ⇒ BÁO file:dòng chặn, không sửa hộ. Test B3b bắt điều ngoài khả năng Phaser ⇒ `.skip` + giải trình.

BÁO CÁO CUỐI: file đã tạo/sửa · bảng 14 testid → file:dòng · output `npm run gate` + `npm run build` (dán thật) · bảng PC-07/11/12/18 → hàm scene gọi · việc KHÔNG LÀM ĐƯỢC + NỢ ghi nhận (nếu có).
