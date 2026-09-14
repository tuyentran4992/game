# GÓI NGỮ CẢNH B3b — render vòng tiến trình: Map · Score · Shop · End (+ Album/Huy hiệu/Settings)

> Batch phủ PC-07/PC-11/PC-12/PC-18 (BATCH-PLAN.md:26). Mốc verify: **M2 — trọn vòng tiến trình** (BATCH-PLAN.md:15).
> Chạy SAU B3a: dùng lại `src/ui/testids.ts`, `src/render/theme/paperTheme.ts`, component, palette — KHÔNG định nghĩa lại.
> Mọi số TRÍCH từ `specs/1-paper-crease/DESIGN-SPEC.md` (DS) / `SPEC.md` / `DATA-MODEL.md` (DM), kèm số dòng. CẤM tự đổi số.

## 0. Stack và hiện trạng kế thừa từ B3a
- phaser ^4.2.1 + vite ^5.4 + TS strict (`noUnusedLocals`+`noUnusedParameters`). Camera 1920×1080 `Scale.FIT`, playfield cột 720px (DS:35-36). Registry testid theo tiền lệ M10 (`registerTestid(id,x,y,w,h)` + `window.__pcTestids`).
- B3a đã dựng: Boot/Title/Play + components SheetView/OptionCard/StarRow/InkBadge + theme registry. B3b đọc các file đó, chỉ sửa `src/main.ts` để đăng ký scene mới + navigation thật thay stub.

## 1. File ĐƯỢC PHÉP tạo/sửa
| File | Pattern (STRUCTURE.md:45-55) | Trách nhiệm |
|---|---|---|
| `src/render/scenes/MapScene.ts` | view | §4.3 Level map + **Settings modal** (`testid-set-*`) — menu hub |
| `src/render/scenes/ScoreScene.ts` | view | §4.4 Chapter score card (dùng GameOverPanel 480×560, DS:57) |
| `src/render/scenes/ShopScene.ts` | view | §4.5 Shop 8 skin (lưới 2×4, DS:108) |
| `src/render/scenes/AlbumScene.ts` | view | §4.5 Album ≤14 + huy hiệu ≤6 (DS:109) — vào từ Shop/map, KHÔNG cảnh mới trong STRUCTURE ⇒ khai báo thêm 1 dòng vào STRUCTURE khi code (tiền lệ B1a prompts/B1a-2-code.md:7) |
| `src/render/scenes/EndScene.ts` | view | §4.6 End screen + Master (DS:111-112) |
| `src/render/components/MapNode.ts` | view | ô màn 168×168 + cụm sao 32px + trạng thái khoá |
| `src/render/components/SkinCard.ts` | view | card skin 260×300: preview + giá + ✓/đang dùng |
| `src/render/components/BadgeIcon.ts` | view | huy hiệu ⌀96 |
| `src/render/viewmodel/mapModel.ts` | pure view-model (Hermes chốt thêm — KHÔNG import Phaser) | `buildMapModel(chapters, stars, unlockState) -> 8 tab × 15 node` — sắp xếp dữ liệu `progression` cho scene vẽ, 0 luật mới |
| `game/tests/logic/view-b3b-*.test.ts` | vitest node | test `mapModel.ts` + bảng màu/ khoá của `SkinCard/BadgeIcon` (mọi file trong mục này cấm import phaser ⇒ chạy được trong `test:logic`) |
| `src/main.ts` | composition root | thêm scene registration — 0 luật |

ĐƯỢC PHÉP sửa minimally ở file B3a: `src/main.ts` (đăng ký scene), navigation stub trong `TitleScene.ts` (nút Shop → `ShopScene` thật). CẤM sửa logic/animation B3a — lỗi Title (vd "Continue — Level n", PC-S-01) ⇒ ghi NỢ B3a, không sửa hộ (BATCH-PLAN.md:37 "Không ai tự sửa hộ").
CẤM sửa: `src/logic/**`, `src/platform/**`, `docs/**`, `specs/**`, `package.json`, `vite.config.ts`.

## 2. Palette + typography — như B3a §2 (bản tóm tắt, DS §1)
`#1F6FEB` primary (4,63:1 với trắng) · `#1554B8` dark · grad `#1F6FEB→#4C8DF5` · `#F5B301` accent (cấm chữ nhỏ) · nền `#FFF7E8→#EADFC4` (chữ mực 12,1:1 / 9,73:1) · `#FFFFFF` paper · `#17324D` ink (13,13:1 trên giấy) · `#9FB3C8` crease · success `#2ECC71`/danger `#E74C3C` chỉ fill lớn+icon (DS:19-29). Chữ tương tác ≥18px, không có cỡ mới (DS:99,150). Token `type/sp/radius/shadow/dur/z` lấy nguyên từ DESIGN-SYSTEM tầng 1 (DS:13). Safe area ≥16px, chạm ≥44×44 (DS:37). Tỷ lệ sống: 9:16 · 3:4 · 1:1 · 4:3 · 16:9 · 21:9 · 32:9 (DS:38).

## 3. Bố cục từng màn (số từ DS §4.3–4.6)
**Map (DS:102)**: 8 tab chương pill **200×72** cuộn ngang (`testid-map-chapter-{1..8}`) → lưới **5 cột × 3 hàng** ô **168×168** radius.md (`testid-map-node-{n}`) + cụm sao **32px** dưới ô. Chương khoá: ô xám + ổ khoá + dòng điều kiện **"cần 12/15 ★"** (`testid-map-locked`) — KHÔNG bắt full sao (PC-07, DM:245). Settings modal mở từ `testid-btn-menu`: `testid-set-sound` · `testid-set-mute` · `testid-set-reset` (confirm 2 bước, PC-16/PC-17). Một nguồn sự thật: state mute của settings ≡ `testid-btn-sound` HUD (E2E PC-P-03).
**Score card (DS:104-105)**: GameOverPanel **480×560** — tổng sao chương (cụm sao 48px, `testid-scorecard-stars`) · thời gian chơi chương · kỷ lục cá nhân (ghost, DM:96) · 2 nút `testid-scorecard-next` ("Next chapter") + "View map". **Điểm DUY NHẤT interstitial được phép**, và chỉ sau khi panel + sao animate xong (PC-14, SPEC:84).
**Shop (DS:107-108)**: lưới **2×4** card **260×300** (`testid-shop-skin-{i}`), preview tờ giấy hoa văn + **giá Mực** (`testid-shop-price`) dưới; đã mua = dấu ✓; đang dùng = viền `primary` 4px; không đủ Mực = nút disabled, bấm không trừ tiền (TC-INC-02). Chỉ 1 loại tiền = Mực Gấp, không đường tiền thật (PC-11).
**Album (DS:109)**: lưới **4 cột** mẫu **200×200** — đã mở đủ màu / chưa mở silhouette xám (`testid-album-item-{i}`) + hàng huy hiệu **⌀96**, ≤6 (`testid-badge-{i}`). Trần cứng: album ≤14, badge ≤6 (PC-12, DM:251-253) — scene đọc danh sách đã mở từ logic, KHÔNG tự cấp.
**End (DS:111-112)**: tổng sao /120 (`testid-end-total-stars`) · tổng thời gian · copy **"You unfolded all 120"** · nút `testid-end-master` mở vòng Master (PC-18 — bắt buộc khai báo hết nội dung cho Playables). Reload tại end screen ⇒ Title vẫn "Continue" hợp lệ, không kẹt loop (E2E PC-G-04).

## 4. Animation B3b (DS §5 — chỉ phần màn này dùng)
| Anim | Thông số | Dòng |
|---|---|---|
| Sao đạt (score card + map node) | `dur.pop` scale 1→1,15→1 + particle `#F5B301` | DS:125 |
| Streak/Mực tăng | floating text "+2" bay lên **400ms** + fade, màu `#F5B301` | DS:128 |
| Mở tab chương / vào node | `dur.fast` (chạm ô scale 0,96 feedback tức thì ≤150ms — PC-U-06) | DS:126 |
| Panel Score | vào theo `dur.slow` 400ms; interstitial CHỈ sau khi animate xong | DS:105,123 |
KHÔNG đổi thông số B3a (mở bung 140ms/110ms v.v. thuộc PlayScene).

## 5. `data-testid` thuộc B3b — 14 tên (SPEC:140-146)
`testid-map-chapter-{1..8}` · `testid-map-node-{n}` · `testid-map-locked` · `testid-scorecard-stars` · `testid-scorecard-next` · `testid-shop-skin-{i}` · `testid-shop-price` · `testid-album-item-{i}` · `testid-badge-{i}` · `testid-set-sound` · `testid-set-mute` · `testid-set-reset` · `testid-end-total-stars` · `testid-end-master`
(Kế thừa từ B3a: `testid-btn-menu`, `testid-btn-sound`, `testid-title-play`, `testid-title-shop` — B3b dùng, không đăng ký lại.) Thiếu tên ⇒ reviewer FAIL.

## 6. Hợp đồng dữ liệu — scene CHỈ ĐỌC từ logic (không tự tính)
- `progression.ts` (B1b): sao từng màn, tổng sao chương, **ngưỡng mở khoá ~12/15** (PC-07; đã mở rồi không tụt khoá — TC-PRG-07), skip=0 sao.
- `economy.ts` (B1c): `ink`, mua/equip skin theo `config/skins.json` (giá là dữ liệu, scene không hardcode — TC-INC-01), album ≤14/badge ≤6 dedupe (TC-INC-05/06). Mọi phán quyết mua được/không lấy từ logic trả về, scene chỉ vẽ.
- `save.ts` + `records.ts` (B1c): object save `m11.save` có `version` (DM:82), `current_level` cho Continue, ghost + `wall` top-5 cho score card (DM:96-97); reset-save và hành vi save hỏng (về màn 1, **giữ skin đã mua** qua `m11.wardrobe` — DM:75,174) là việc của logic — scene chỉ gọi + vẽ kết quả.
- `i18n.ts` (B1c): `t(key)` — copy EN: "Chapter complete" · "You unfolded all 120" · "Continue — Level {n}" (SPEC:149-151; TC-I18-03).
- `platform/index` (B2): `ads.showInterstitial` qua policy layer (PC-14 — vị trí trí ad do logic quyết, scene không tự gọi SDK), `storage` cho save. CẤM scene chạm `window.ytgame`.
- Scene CẤM: tự cộng sao/tổng sao, tự kiểm 12/15, tự tính giá skin, tự cấp badge/hint — chỉ đọc field đã tính. Chưa có hàm ⇒ BÁO blocked, không viết tạm trong scene.

## 7. Lệnh build / cổng
```
cd /data/youtube-playables/M11-Gap/game
npm run gate          # typecheck + test:logic + gate-smell — ĐÚNG 1 LẦN cuối phiên code
npm run build         # 1 lần; dán tail output; bundle <5MB
grep -rnE "fetch\(|XMLHttpRequest|WebSocket|sendBeacon" src/render src/ui   # ⇒ RỖNG (PC-15)
grep -rn "if (" src/render/scenes/MapScene.ts   # mắt người: điều kiện khoá/chương phải đến từ progression, không so sánh stars tự tính
```

## 8. Bẫy đã biết (E2E nhóm R/S/U/G — bắt buộc đọc E2E-TESTS.md:55-115)
- R-01..R-04: map/score/shop không cắt, không tràn, HUD không đè; **đổi viewport giữa màn không reset đề/state** (R-04) — layout resize chỉ vẽ lại, không sinh lại dữ liệu.
- S-01: reload giữa chương ⇒ "Continue — Level 8" đúng screen (label do TitleScene B3a — B3b verify, fail thì ghi nợ B3a). S-02: reset save ⇒ màn 1, sao 0, mực 0, **skin đã mua vẫn sở hữu**. S-03: JSON rác ⇒ không crash, không spam console. S-04/S-05: map đủ 8 tab, điều kiện khoá hiển thị, skip=0 sao không chặn tiến trình. S-06: save có `version`, ≤100KB, không chứa đề. S-07: album + badge sáng đúng 1 sau khép chương.
- U-01..U-07: không nút mơ hồ, 1 click sang màn, không chữ cắt/elip-e mất nghĩa ở 9:16 nhỏ nhất, contrast đọc trong 1s, không "ảo giác nút", phản hồi ≤150ms, 1 hành động chính/màn. **FAIL nhóm U chặn ship** (E2E:151).
- G-01..G-04: end screen khai báo hết nội dung; Master **ẩn hint, không timer**, sao vòng chính không cộng 2 lần (G-03); thoát được end screen về map/menu (G-04).
- Save debug từ `?level=` phải bị clear sau QA (E2E:176) — không commit ảnh/`out/qa/` vào repo.
