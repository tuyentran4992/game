# NHIỆM VỤ: ĐIỀU TRA + SỬA M9 DEEP CAST (2 stage — làm xong A mới xét B)

Dự án: `/data/youtube-playables/M9-DeepCast/game/` — game câu cá lặn 1 màn, logic ĐẠT gate rồi (tsc 0 lỗi, 18/18 vitest, sim win 35%, build OK). Boss chê hình ảnh + input. Có 2 BUG ĐÃ CHẨN ĐOÁN BẰNG SỐ + 1 CÂU HỎI KIẾN TRÚC.

## HIỆN TRẠNG GIT (đọc trước khi sửa gì)
Working tree CÓ DIFF CHƯA COMMIT ở 3 file: `src/ui/overlays.ts`, `src/scenes/GameScene.ts`, `src/render/hud.ts` — supervisor để WIP: chuyển button từ container-hitArea (loại, không tin cậy) sang scene-level tap router (`routeTap` + `sonarHit`). NÓ CHƯA ĐƯỢC TEST ĐẾN NƠI CHỐT. Quyền của bạn: hoàn thiện, viết lại, hoặc bỏ WIP này — miễn là hết bệnh và không phá gate.

## BUG 1 — limbo: ván không bao giờ kết thúc (CRITICAL, đã repro deterministic)
Repro: `cd /data/youtube-playables/M9-DeepCast/game && node --experimental-strip-types scripts/repro-limbo.ts` (chạy được, file có sẵn).
Chuỗi bằng chứng từ sim thuần:
- t=7.2s: hook về tới y=106, `stepMode` (src/core/rules.ts ~dòng 163) tự set `idle`
- tick.ts ~dòng 209: `if (hookY <= SURFACE_Y + 2 && hookMode !== 'idle') resolveSurface(state)` → idle đã được set TRƯỚC nên guard `!== 'idle'` chặn mãi mãi
- Hệ quả: `resolveSurface` không bao giờ chạy → `startDive` không được gọi → diveCount không tăng, money không trừ fuel → air=0 lặp vô hạn, KHÔNG có 'lose'
- `startDive` (rules.ts ~121) là đường NẠP FUEL_COST duy nhất; `GameScene.resolveSurface()` gọi `startDive(state)` thiếu cost → kể cả khi hết limbo, fuel loop vẫn leak. Kiểm tra CẢ HAI chỗ, sửa thành 1 nguồn sự thật.
Yêu cầu: sim 40 seed phải chứng minh MỌI ván kết thúc (win|lose) trong < 400s sim-time; thêm 1 vitest tái hiện chuỗi "hold 2.5s → nhả → phải về tới lose-when-out-of-fuel".

## BUG 2 — button: container hitArea không fire (PLAY chậm, TRY AGAIN chết)
Bằng chứng Playwright (viewport 420×746, device scale 1): pointer đúng tâm PLAY (game coord 240,458) → scene-level listener NHẬN (pointerdown counter tăng) nhưng `Container.on('pointerdown')` KHÔNG fire, dù `hitArea` được báo tồn tại. Đây là bệnh custom Rectangle hitArea trên Container (tọa độ âm). TRY AGAIN: không bao giờ ăn → chết.
Sửa theo hướng WIP routeTap (quyết rồi — KHÔNG quay lại container.setInteractive cho UI):
- `routeTap(screenX, screenY, phase, usedContinue)` đã có trong overlays.ts — nó nhận **screen coord** (pt.position.x/y), KHÔNG dùng coord camera-scroll (lệch khi camera lặn)
- Vùng bấm phải NỚI ≥ 260×80 px và TRÙNG KHỚP hình nút thật (đo từ chính code dựng nút, đừng đoán số)
- Sonar: `hud.sonarHit()` tương tự, screen coord, depth 26 overlay phải không chặn pointer
- QUAN TRỌNG mobile: `touch-action: none` đã có trong index.html; thêm `user-select:none` + ensure `pointerup` vẫn chạy khi overlay đang mở (nhả nút không được để `holding=true` treo)
VERIFY BẰNG PLAYWRIGHT THẬT (cài sẵn python playwright, chromium có): mở `http://127.0.0.1:5209/` (đã có server), tap PLAY **1 click** → `phase==='diving'` trong <500ms; chơi tới lose (đo bằng cách set `state.air=0` qua evaluate để ép nhanh) → tap TRY AGAIN 1 click → `dives` về 0 + phase diving. In số đo latency từng nút.

## CÂU HỎI 3 (STAGE B — chỉ làm sau khi A xanh): Phaser vs Three.js + GSAP
Boss: "game làm bằng phaser xấu quá, dùng threejs và gsap được không".
Nhân xét của supervisor: phần "xấu" em ghi nhận được = banding nền (đãvá một phần bằng water_veil gradient), dây câu thẳng cứng, fish nhỏ hơn hook. Ảnh chụp bằng chứng: `/data/youtube-playables/M9-DeepCast/assets/` (g2_deep.png, final_vents.png, live_check.png — coi trước khi kết luận).
Việc của bạn:
1. Đánh giá thẳng: nâng trần视觉 trong Phaser được không (shader post-fx cho gradient mượt, render dây bằng curve võng + wiggle, sprite scale theo spec)? Nếu ĐƯỢC → làm luôn trong Phaser, nêu lý do, dừng.
2. Nếu KHÔNG đủ (kết luận phải có luận cứ kỹ thuật, không cảm tính) → dựng renderer mới bằng **three.js (OrthographicCamera 2D, sprite atlas từ assets đã commit — CẤM vẽ art mới, CẤM đổi asset) + GSAP cho UI/transition**. BẤT KHẢ XÂM PHẠM: `src/core/`, `src/systems/`, `src/data/` giữ nguyên API (sim + 18 test đang xanh; sim chạy engine-agnostic). Bundle sau build < 4MB (hiện tại ~2.5MB, three nhẹ hơn phaser nhưng cộng thêm gsap).
3. Dù chọn đường nào: giữ kiến trúc chống god class — file .ts ≤300 dòng, scene ≤250, cuối bài dán `find src -name '*.ts' -exec wc -l {} + | sort -rn | head -5`.

## Ràng buộc chung
- Asset production đã commit trong `public/assets/` + manifest sha — chỉ tích hợp, không chế
- Core deterministic: 0 `Math.random` trong src/core (FX/render được phép)
- Sau mọi thay đổi: `tsc --noEmit` 0 lỗi → `vitest run` 18+ pass → `vite build` OK → sim 40 seed còn trong gate (win 20–60%, median dive 25–70s, breaks ≤2, money ≥450) →Playwright check input latency như trên
- KHÔNG commit/push — supervisor verify rồi làm việc đó
- Báo cáo cuối: nguyên nhân gốc từng bug (file:dòng), số đo latency button trước/sau, lựa chọn render + luận cứ, output wc -l, output 4 gate. Nếu hết turn khi chưa xong stage B thì DỪNG Ở ĐÂU phải để code ở trạng thái build+xanh gate ở đó.
