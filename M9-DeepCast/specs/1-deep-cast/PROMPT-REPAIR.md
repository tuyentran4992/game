# PROMPT REPAIR — M9 Deep Cast (chỉ sửa render, KHÔNG build lại từ đầu)

Game đã có tại `/data/youtube-playables/M9-DeepCast/game/` — logic xong, 18/18 vitest pass, sim win 35%, tsc 0 lỗi, build OK. NHIỆM VỤ DUY NHẤT: sửa lỗi render dưới nước phát hiện qua screenshot Playwright (viewport 420x746, game 480x854 Scale.FIT).

## bằng chứng lỗi (màn PLAY, ảnh `/data/youtube-playables/M9-DeepCast/assets/qa_sheet_ocean.png` là sprite chuẩn để đối chiếu)
1. Vùng nước sâu hiển thị **đen tuyền + chấm trắng kiểu bầu trời sao** thay vì nước xanh tối theo dải độ sâu → nghi bg band (render/worldRender.ts §15-18) kéo nhầm ảnh/dán sai vùng, hoặc tint quá đậm mất chi tiết, hoặc vùng không band nào phủ bị lộ clear-color đen.
2. **Vệt trắng-đen nham nhở ở mép trái** + 1 shape zích-zắc cyan cắt ngang → sprite/thanh nào đó scale sai hoặc texture lặp lòi biên.
3. Thợ câu (boat.png) **cắt mất đầu** ở màn title và **hook/hook_double quá khổ** so thế giới (hook 590x640px ảnh gốc; DESIGN-SPEC §3 quy định display size: hook ≤48px, hook_double ≤64px, boat 320px).

## Yêu cầu
- Đọc `src/render/worldRender.ts`, `src/scenes/*.ts`, `src/ui/overlays.ts`; sửa bằng setDisplaySize đúng DESIGN-SPEC §3, dán band nền phủ kín 0→1300px không hở (band nào lộ đen thì kiểm key texture load có đúng file bg_*.png không — assets load từ manifest, KHÔNG đổi file PNG).
- KHÔNG sửa `src/core/`, `src/systems/`, `src/data/` (logic đã đạt gate). KHÔNG tạo asset mới.
- Sau khi sửa: `node node_modules/typescript/bin/tsc --noEmit && node node_modules/vitest/vitest.mjs run && node node_modules/vite/bin/vite.js build` — cả 3 phải xanh, dán output.
-_in ra số đo cuối: bảng `wc -l` (TB-05) và 3 gate render đã sửa._
