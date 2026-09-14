Bạn là dev viết test cho batch B3b (nửa 2: shop/album/save-reload/end + bảng state). **90 lượt tối đa.** Con test kia đã tạo `view-b3b-mapmodel.test.ts` + `view-b3b-contract.test.ts` — **CẤM đụng 2 file đó.**

Luật phiên + GÓI NGỮ CẢNH B3b nằm trong system prompt (pack `harness/packs/b3b.md`). B3a đã xong — chỉ đọc interface, không sửa.
Đọc thêm: /data/youtube-playables/M11-Gap/specs/1-paper-crease/E2E-TESTS.md (S-01..07, G-01..04, U-01..07) · `game/tests/logic/helpers.ts`.

NHIỆM VỤ — chỉ tạo 1 file `tests/logic/view-b3b-states.test.ts` (toàn bộ là source-scan `node:fs` + bảng hợp đồng hardcode; file bị quét chưa tồn tại ⇒ ĐỎ):
1. **Bảng state Shop** (nguồn: SPEC §4.5/DS:108 + DM §3.2 — giá là DỮ LIỆU từ `config/skins.json`, test không hardcode con số giá): với mỗi skin card, scene phải vẽ đúng 4 trạng thái phân biệt được: `locked` (thiếu Mực) · `buyable` · `owned` (✓) · `equipped` (viền `#1F6FEB` 4px — chuỗi màu phải lấy từ theme/constant B3a, không literal mới toanh). Quét `ShopScene.ts`+`SkinCard.ts`: bảng tra trạng thái tồn tại (record/registry), không chuỗi if/else ≥3 nhánh (A4).
2. **Album/Badge cap (PC-12)**: scene không tự lọc vượt trần — quét `AlbumScene.ts`: không có phép cắt/danh sách id hardcode dài >14/6; số mục render = độ dài danh sách logic đưa (grep pattern `.slice(`/mảng id literals trong scene ⇒ FAIL). Silhouette xám = trạng thái chưa mở do logic báo.
3. **End + Master (PC-18)**: quét `EndScene.ts` + scene liên quan: copy `t(` key chứa chuỗi "all 120" (bản EN nộp, SPEC:151); cờ master ⇒ PlayScene nhận "ẩn hint + không timer" — kiểm chain: `EndScene` dispatch mở master qua 1 hàm logic, KHÔNG tự set `timerOn=false` trong scene (grep `timerOn *=` trong src/render ⇒ 0).
4. **Save-reload contract (PC-16, E2E S-01/S-02/S-03)**: quét mọi `load|save|reset` trong scene B3b ⇒ phải gọi qua `save.ts`/adapter, không gọi `localStorage`/`window.ytgame` trực tiếp (grep trong `src/render` ⇒ 0, PC-15+ADR-01 chiều gọi).
5. **Interstitial thứ tự (PC-14, E2E A-03/L-09)**: `ScoreScene.ts`: lời gọi interstitial phải nằm TRONG callback hoàn tất tween sao (tìm bằng chứng `onComplete` chain quanh call; call trần ngay `create()` ⇒ FAIL). Scene khác không được có `showInterstitial` (test kia đã quét — bạn quét lại bằng chứng giải thích).
6. **Responsive invariants (PC-R-01..04)**: quét `Map/Shop/Score/End` scenes: không số pixel tuyệt đối theo chiều cao >1080 hoặc theo `window.innerWidth` (resize phải qua Scale manager — grep `innerWidth|innerHeight|screen\.` trong src/render ⇒ 0); mọi layout qua cột 720 + camera fit (hàm dùng constant của B3a).
7. **Phản hồi ≤150ms (PC-U-06)**: bảng `dur.fast`/touch-scale 0.96 được dùng cho MỌI node bấm được trong scene B3b — quét số tween: duration >150 cho feedback chạm (không phải transition panel 400ms) ⇒ FAIL.

Quy ước: mỗi `it()` tên ghi case E2E + PC rule; assert chuỗi/số cụ thể, không `toBeDefined` suông. CẤM tự bịa số: chỉ dùng số pack §2/§3/§4 + DS dòng nguồn đã dẫn.

RÀNG BUỘC: chỉ tạo ĐÚNG 1 file; CẤM sửa src/; chứng minh RED: `npx vitest run tests/logic/view-b3b-states.test.ts 2>&1 | tail -12` dán output đỏ thật.

BÁO CÁO CUỐI: file + số `it()` · output RED · bảng case→(PC rule, E2E ID) — đối chiếu phủ R/S/U/G không sót nhóm nào.
