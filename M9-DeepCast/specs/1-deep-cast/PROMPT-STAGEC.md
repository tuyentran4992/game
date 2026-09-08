# STAGE C: GAMEPLAY CLARITY — game hiện tại "không cạnh tranh được với Playgama/YouTube Playables" (phán quyết của boss sau khi chơi thật)

Stage A (bug) đã xong. Stage B (render) ĐÃ HỦY — sai ưu tiên. Vấn đề sống còn bây giờ: người chơi mới KHÔNG HIỂU game trong 5 giây đầu, và không có phần thưởng cảm xúc sớm. Benchmark hyper-casual 2025-2026: "no tutorial – everything is intuitive", "instant immersive", hành vi cơ học phải TỰ GIẢI THÍCH bằng hình, không phải bằng chữ.

Dự án: `/data/youtube-playables/M9-DeepCast/game/`. Đọc `specs/1-deep-cast/SPEC.md` + `DESIGN-SPEC.md` trước (có trong repo).

## CHẨN ĐOÁN SUPERVISOR ĐÃ XÁC MINH BẰNG CODE (đừng điều tra lại, sửa thẳng)
1. Title screen chỉ có PLAY — không một chữ nào về cách chơi. Player vào game mù hoàn toàn.
2. Hint in-game chỉ fire theo ngữ cảnh cá giật, và CÓ TYPO: `ui/overlays.ts:134` 'HOLD to NIN...' → sửa thành tiếng Anh chuẩn ('HOLD to give line — wait it out!').
3. Goal không nhìn thấy: mục tiêu $2000 để gọi voi, voi ở đâu, cần gì — HUD có gauge tròn không nhãn, BEST cô độc.
4. Thời gian tới reward cảm xúc đầu tiên QUÁ DÀI: median dive 30.7s. Player hyper-casual chỉ cho game ~10 giây trước khi quit.
5. Không telegraph: cá sắp cắn? không biết. Cá gì đang móc? đáng bao nhiêu? không biết. Dây thẳng đơ vô cảm.

## YÊU CẦU THIẾT KẾ (implement TẤT CẢ — chúng là 1 thể thống nhất: "readable push-your-luck")
### A. 3-second self-teaching opening
Thay title screen bằng **interactive demo**: lưỡi câu đung đưa + bàn tay ghost tự giữ-thả theo chu kỳ (Phaser tween), dây xuống → cá cắn → tiền bay lên. Player THẤY luật trước khi bấm. Nút PLAY đổi nhãn thành "HOLD & RELEASE". KHÔNG vẽ art mới — dùng đúng sprite có sẵn.
### B. HUD goal legibility
- Progress bar MONEY $0→$2,000 với icon whale ở đầu phải — "đủ tiền thì voi lên" thấy bằng mắt
- Gauge dây: nhãn "TENSION" + màu xanh→vàng→đỏ khi căng, rung khi sắp đứt (fx/ có juice sẵn, nối vào)
- Thước độ sâu bên phải với 4 mốc dải (REEF/WRECK/VENTS/TRENCH) — biết đang ở đâu, xuống nữa gặp gì
### C. Telegraph + reward sớm (QUAN TRỌNG NHẤT cho retention)
- Cá sắp cắn: ~1.2s trước attach, "!" nhấp nháy tại vị trí cá + dây rung — đọc dữ liệu `state.fish` đã có trong render, KHÔNG random mới, KHÔNG đổi deterministic core
- Con cá ĐẦU TIÊN mỗi ván phải cắn trong 4–6 giây: được phép chỉnh spawn rules cho dive đầu (test GC + sim 40 seed vẫn phải xanh — nếu vỡ gate cân bằng thì tinh chỉnh lại, không được bỏ gate)
- Mọi catch: floating "+$XX" to rõ, tier màu theo value; thêm combo/streak đọc được (3 liên tiếp = nhân hệ thị visible)
### D. Feel của dây (lý do boss chê "xấu" gộp ở đây)
Dây chính là curve võng (catenary/bezier nhiều đoạn) + wiggle khi cá giật — sửa `render/lineRender.ts`, không đụng logic hook.

## RÀNG BUỘC SẮT
- Assets public/assets + manifest: chỉ tích hợp, CẤM vẽ art mới, CẤM đổi file asset
- src/core deterministic: 0 Math.random trong core (FX/render được dùng thời gian/Math.sin)
- Button/router stage A giữa nguyên HÀNH VI (PLAY 1-click <500ms, TRY AGAIN 1-click, sonar) — `python3 scripts/qa_input.py` phải còn ALL PASS (server dist port 5209)
- Chống god class: ≤300 dòng/file, scene ≤250 — dán `find src -name '*.ts' -exec wc -l {} + | sort -rn | head -5` vào báo cáo; file mới chia module ngay từ đầu
- GATE CUỐI PHẢI XANH: `node node_modules/typescript/bin/tsc --noEmit` (0 lỗi) → `node node_modules/vitest/vitest.mjs run` (19+) → `node scripts/sim.ts 40` (win 20–60%, median dive 25–70s, breaks ≤2, money ≥450) → `node node_modules/vite/bin/vite.js build` (<4MB) → qa_input ALL PASS
- KHÔNG commit/push — supervisor verify độc lập rồi deploy Netlify
- Nếu hết turn: ưu tiên theo thứ tự C → A → B → D (telegraph + early reward là sống còn), và báo rõ mục nào xong/chưa

## BẰNG CHỨNG HÌNH (bước cuối)
Playwright chụp 4 cảnh lưu `assets/v3_*.png`: (1) title demo có ghost hand, (2) giây đầu dive có "!" telegraph, (3) catch đầu tiên với +$XX bay, (4) TRENCH với progress bar + whale goal. Tự chấm từng mục A–D (0–10, trung thực — đừng tự cho 10).
