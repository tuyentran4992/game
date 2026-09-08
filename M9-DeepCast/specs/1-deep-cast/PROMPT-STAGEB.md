# STAGE B: NÂNG TRẦN HÌNH ẢNH — luận cứ Phaser vs Three.js + GSAP, rồi làm

Stage A (fix limbo + tap-router buttons) ĐÃ XANH và deployed: tsc 0, 19/19 vitest, sim 40 seed win 35% trong gate, PLAY 183ms / TRY AGAIN 150ms 1-click, https://deep-cast-m9.netlify.app live. Đừng đụng lại logic core đã đạt gate.

Boss chốt: "game làm bằng phaser xấu quá, sử dụng threejs và gsap được ko". Giao bạn trả lời bằng LUẬN CỨ rồi THỰC THI.

## Vision QA bản hiện tại: 7/10 — lỗi còn lại (đã chụp, xem ảnh: /data/youtube-playables/M9-DeepCast/assets/v2_mid.png v2_deep.png)
1. Dây câu chính xuống sâu **thẳng đơ** — thiếu võng catenary + wiggle khi giật
2. **2 seam ngang cứng** (mặt nước↔thân nước, thân nước↔seabed) + god-rays lặp pattern đều → ảo giác phân dải
3. Vòng dây dưới thuyền tròn đều vô lý; glow chữ DEEP CAST bẩn; **răng cưa/pixel lộn xộn ở rìa sprite cá to** (cá ngừ, bạch tuộc, marlin) lệch phong cách với nền vector phẳng
4. Bố cục vùng giữa trống (BEST/gauge cô độc), gauge tròn thiếu nhãn → người chơi không biết nó đo gì; cá kiếm cắm vào seabed không bóng đổ

## QUY TRÌNH (bắt buộc theo thứ tự)
### Bước 1 — Luận cứ (viết ra file `specs/1-deep-cast/RENDER-DECISION.md`)
Với MỖI lỗi 1–4 ở trên, trả lời: Phaser (canvas2d/webgl renderer có sẵn) xử lý được không, bằng kỹ thuật gì, chi phí bao nhiêu dòng code? Three.js + GSAP có hơn không, hơn ở đâu, đổi giá gì?
Kết luận CHỌN 1 trong 2 đường:
- **(A) Ở lại Phaser, nâng render**: sửa được ≥3/4 lỗi với < ~600 dòng diff → chọn A. (Gợi ý kỹ thuật không bắt buộc: lineRender dùng bezier/catmull curve nhiều đoạn + time-varying sag; worldRender thay band ảnh bằng 1 gradient texture dựng code phủ full cột nước, xóa seam; text glow bằng bitmap mask sạch hơn shadowLayer; smoothing=true + mipmap cho sprite.)
- **(B) Rewrite renderer Three.js(ortho 2D) + GSAP**: chỉ khi chứng minh được ≥2 lỗi KHÔNG THỂ sửa tử tế trong Phaser. Chi phí chấp nhận được của B: giữ nguyên 100% `src/core|systems|data` (engine-agnostic, API contract bất khả xâm phạm), thay layer `src/render|scenes` bằng three.js; GSAP chỉ cho UI tween/transition. Bundle sau build < 4MB. Thời gian: nếu B > 1/3 số turn còn lại của bạn thì DỪNG, giao tiếp bằng cách: viết RENDER-DECISION.md giải thích + stub module `render3d/` tách sẵn interface, báo "chọn B, chưa kịp làm" — KHÔNG làm nửa vời 2 renderer song song.

### Bước 2 — Thực thi đường đã chọn
Ràng buộc sắt (như mọi khi):
- Assets trong public/assets + manifest: chỉ tích hợp, CẤM vẽ art mới, CẤM đổi file asset (trừ script numpy post-process đã kiểm chứng kiểu fix_vents)
- Core deterministic: 0 Math.random trong src/core (FX/render được phép dùng time/Math.sin)
- Button/router Stage A: giữa nguyên hành vi (qa_input.py phải còn ALL PASS sau khi sửa — chạy lại: `python3 scripts/qa_input.py` với server dist chạy port 5209)
- Chống god class: ≤300 dòng/file, scene ≤250 — dán `find src -name '*.ts' -exec wc -l {} + | sort -rn | head -5` vào báo cáo
- Gate cuối phải xanh: `tsc --noEmit` → `vitest run` (19+) → `sim 40 seed` (win 20–60%, median dive 25–70s, breaks ≤2, money ≥450) → `vite build` → `qa_input.py ALL PASS`

### Bước 3 — Bằng chứng hình
- Build + serve dist tại 127.0.0.1:5209 (pkill server cũ trước), chạy Playwright: 3 screenshot cùng kịch bản cũ (title / mid-water có cá / sâu 400–600m) lưu `assets/v3_*.png`
- Tự chấm 4 mục 1–4 hết hay chưa, so v2, nêu điểm tự chấm (trung thực, đừng tự cho 10)

## Báo cáo cuối (bắt buộc đủ)
1. Đường chọn A hay B + luận cứ từng lỗi (tóm tắt từ RENDER-DECISION.md)
2. 4 gate + qa_input số đo
3. wc -l top 5
4. v3 screenshots đường dẫn + tự chấm + còn gì xấu
5. KHÔNG commit/push — supervisor verify độc lập rồi mới deploy Netlify.
