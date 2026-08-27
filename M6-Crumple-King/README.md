# M6 — "Crumple King" · Bóp giấy & ném · Prototype Fun-Gate Spec

> **Ngày:** 27/08/2026 · **Trạng thái:** 🚧 prototype → fun gate (chưa phải game chính thức)
> Spec chi tiết: `specs/1-crumple-king/SPEC.md`. Fun gate pass → viết nốt DESIGN-SPEC/DATA-MODEL/TEST-CASES/E2E vào cùng folder.

## Động từ cốt lõi: BÓP rồi NÉM
Hai cảm giác nối liền nhau trên cùng một vật thể: vuốt chụm tờ giấy cho đến khi thành viên, rồi kéo-ném vào sọt. Catalog Playgama 27/08: game *ném* đầy, game *squeeze* có, nhưng **không game nào biến dạng vật thể rồi mới ném nó** — cặp mechanic chưa ai ghép.

## Gameplay loop (60 giây)
1. Tờ giấy phẳng giữa màn hình. Chụm 2 góc kéo lại → giấy **gấp/nếp**, phình mặt. Lặp 4 cấp: phẳng → bán crumple → **viên**.
2. Mỗi cú bóp: âm ràn rật (synth), viên rung/méo.
3. Viên xong: kéo-thả ném → impulse theo véc-tơ. Sọt giấy bên phải, **xa dần sau mỗi quả trúng**.
4. Trúng: +100 × combo, tiếng "rột" đã tai, giấy mới spawn để bóp tiếp (giữ combo). Trượt: combo về 0.
5. Viên to = ném đã nhưng khó trúng → người chơi tự trade-off số cú bóp.

**Vì sao vui (giả thuyết cần gate xác nhận):** thỏa mãn 2 bản năng (phá + ngắm); vật lý méo thật lúc va chạm là payoff; escalating distance tạo tension.

## Scope prototype (placeholder hết, ≤1 ngày)
Phaser 4.2.1 + matter-js + Vite + TS. Giấy = mesh point-bodies + constraints, mỗi cú chụm thêm ràng buộc siết; sọt = static bodies. Art placeholder (hình chữ nhật trắng + nếp line). **KHÔNG:** level, meta, save, SDK, wind/obstacle bonus ring (để giai đoạn sau nếu gate pass).

## Tiêu chí FUN GATE
Cú ném **đầu tiên trúng sọt phải "đã"**. Nếu cảm giác chỉ như "ném giấy thường" → fail, vào kho.

## Prompt code
`CODE-PROMPT.md` — paste vào Claude Code local (thư mục game: `M6-Crumple-King/game/`).
