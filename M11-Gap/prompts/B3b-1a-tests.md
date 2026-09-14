Bạn là dev viết test cho batch B3b (render vòng tiến trình: Map·Score·Shop·End + Album/Huy hiệu). **90 lượt tối đa.** B3a đã xong — `src/ui/testids.ts`, `src/render/theme/paperTheme.ts`, components đã tồn tại: ĐỌC interface của chúng, CẤM sửa file B3a.

Luật phiên + GÓI NGỮ CẢNH B3b nằm trong system prompt (pack `harness/packs/b3b.md`) — bố cục có số đo, 14 testid, hợp đồng logic đều ở đó kèm số dòng.

Đọc thêm:
- /data/youtube-playables/M11-Gap/specs/1-paper-crease/E2E-TESTS.md §1.4+1.7+1.8+1.9 (nhóm R, S, U, G)
- /data/youtube-playables/M11-Gap/game/tests/logic/helpers.ts + 2 file test view-b3a (để KHÔNG trùng tên file)
- /data/youtube-playables/M11-Gap/game/src/render/ui testids: `sed -n 1,30p src/ui/testids.ts` (chữ ký registerTestid thật)

NHIỆM VỤ — chỉ tạo 2 file test (import PHẢI ĐỎ vì scene/mapModel chưa tồn tại):
1. `tests/logic/view-b3b-mapmodel.test.ts` — cho `src/render/viewmodel/mapModel.ts` (pure, 0 phaser):
   - `buildMapModel(chapters, starsString, unlockFlags)` trả 8 chương × 15 node: mỗi node `{levelIndex, chapter, stars:0..3, locked:boolean}`.
   - Fixture chuỗi 120 ký tự sao (pattern '3'.repeat(12)+..., theo DM:89): 11 sao chương 1 ⇒ chương 2 `locked:true`; đúng 12 ⇒ `locked:false` (PC-07 ngưỡng 12/15 — hàng đợi đã chốt, không bắt full); 15 ⇒ mở.
   - Skip = 0 sao: node chưa chơi `stars:0`, không chặn node sau (PC-07, E2E PC-S-05).
   - Mở khoá MỘT CHIỀU: 12→11 sao (chơi lại mất sao) + cờ đã-mở ⇒ node vẫn `locked:false` (TC-PRG-07).
   - Input bẩn: chuỗi sao dài 119/121, ký tự 'x' ⇒ throw lỗi RÕ hoặc fallback có chủ đích — chọn 1 hành vi, ghi comment contract, assert ĐÚNG hành vi đã chọn (không assert cả hai).
   - Master: `buildMapModel(..., {master:true})` ⇒ sao đọc từ chuỗi `master_stars` riêng, campaign không đổi (PC-18, DM:103).
2. `tests/logic/view-b3b-contract.test.ts` — source-scan `node:fs` trên `src/render/scenes/{Map,Score,Shop,Album,End}Scene.ts` + `src/render/components/{MapNode,SkinCard,BadgeIcon}.ts`:
   - **Testid contract B3b**: phủ ĐỦ 14 tên pack §5 (chép bảng hardcode vào test, pattern `testid-map-chapter-`, `testid-shop-skin-`… là prefix động ⇒ assert chuỗi template tồn tại).
   - **i18n PC-19**: không display-string literal ngoài whitelist; copy EN chốt phải nằm trong `t(` keys: "Chapter complete", "You unfolded all 120", "Next chapter", "View map", "cần 12/15 ★" ⇒ bản EN "12/15 ★", giá Mực format.
   - **CẤM tính lại nghiệp vụ**: không `=== 12`, không `stars +=`, không giá skin số nguyên hardcode (giá đọc từ `config/skins.json` qua economy) trong scene Map/Shop/End. Cho phép số hình học (200×72, 168, 260×300, ⌀96…). 1 biểu thức tính nghiệp vụ ⇒ FAIL.
   - **CẤM mạng**: grep fetch/XHR/WebSocket/sendBeacon trong file B3b ⇒ 0 (PC-15).
   - **Interstitial đúng chỗ**: chuỗi gọi `showInterstitial` chỉ xuất hiện trong `ScoreScene.ts` (và sau callback thưởng) — có ở scene khác ⇒ FAIL (PC-14).

Mỗi `it()` assert giá trị cụ thể. Comment đầu file trace case E2E: **R-01..04 · S-01..07 · U-01..07 · G-01..04** (E2E-TESTS.md:55-115) — ngưỡng 12 sao ⇒ S-04; master không hint ⇒ G-02; end copy ⇒ G-01.

RÀNG BUỘC: chỉ tạo 2 file; CẤM sửa src/; chứng minh RED: `npx vitest run tests/logic/view-b3b-mapmodel.test.ts tests/logic/view-b3b-contract.test.ts 2>&1 | tail -12` dán output đỏ.

BÁO CÁO CUỐI: 2 file + số `it()` · output RED · bảng case→(PC rule, E2E ID).
