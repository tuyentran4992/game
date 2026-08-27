# M5 Prototype Fun Gate — "Peel!" & "Crumple King"

> **Ngày:** 27/08/2026 · **Trạng thái:** 🚧 CHỜ prototype → anh Tuyền chơi → fun gate
> **Đây KHÔNG phải SPEC đủ 5 file.** Theo `docs/ARCHITECTURE.md` §5 bước 1: chỉ prototype placeholder,
> SPEC chính thức chỉ viết khi anh chốt VUI. Folder tạm: `prototypes/m5/`, KHÔNG tạo `games/`.

## Bối cảnh chọn concept (đã research catalog Playgama 27/08)

| Genre bị loại vì bão hòa | Bằng chứng |
|---|---|
| Merge/Suika | ≥4 bản, M3 vừa reject |
| Block puzzle 1010 | category có **610 games**, "Neon Block Blast" trùng gần tuyệt đối với g4 |
| Sort | Flood It, Good Sort, Nuts Puzzle... |
| Untangle | 6+ bản |
| Eraser/DOP | 7+ bản "Delete One Part" |
| Rewind runner | 8+ bản time-loop/revvin |

Hai concept đạt sau lọc: **động từ cốt lõi chưa có trên catalog** + chơi 10 giây biết vui +
code nhẹ (input/vật lý, không cần AI art). Mỗi prototype ≤ 1 ngày, placeholder art.

---

## Concept A — "Peel!" (ASMR gọt vỏ) — ⭐ recommend làm trước

**Động từ cốt lõi:** TUỐT — một nhát dao liền mạch, không đặt/xếp/ghép gì cả.

**Gameplay loop (1 phút):**
1. Trái cây 3D-giả (ellipse shaded) giữa màn hình, dao theo con trỏ.
2. Kéo dao từ cuống xuống đáy theo đường cong quanh quả → vỏ bong thành **dải ribbon cuộn** theo vệt dao.
3. Nhát liền mạch không nhấc tay = vỏ dài → combo "PERFECT PEEL" ×2, ribbon văng ra cuốn tròn satisfying.
4. Nhấc tay giữa đường / lệch khỏi vỏ = **rách**, mất streak, tiếng "toạc" khó chịu.
5. Quả lộ ruột bóng mượt + nước bắn (particle) = phần thưởng thị giác.
6. 60 giây, peel càng nhiều quả điểm càng cao → leaderboard daily.

**Vì sao vui (giả thuyết cần fun gate xác nhận):** cảm giác tuốt liền tay + âm thanh rạo rực =
ASMR có skill ceiling (đường cong phải bám quả). Nỗi sợ "rách" tạo tension như dao cắt xà phòng.

**Scope prototype 1 ngày (placeholder hết):**
- Phaser 4, canvas 9:16, không SDK, không save.
- Quả = hình cầu ellipse + màu; vỏ = **dải mesh 2 tam giác/segment** cuộn quanh, peel = cập nhật
  góc bao phủ theo vệt pointer; rách = reset segment cuối.
- Ribbon văng: 20-segment strip bay ra với spring + cuộn (không cần physics lib).
- Âm: beep tổng hợp qua @game/core audio synth (rào rạo = white noise có envelope).
- HUD: streak, perfect count, timer 60s. Hết giờ = màn hình tổng kết GIẢ.
- 3 quả: táo (dễ), xoài (dài), dưa (to, chậm).
**KHÔNG làm:** level design, meta, art đẹp, powerup, ngôn ngữ.

**Tiêu chí fun gate:** anh chơi 60 giây, ít nhất 1 lần "ồ" vì dải peel liền mạch dài + muốn chơi lại ngay.

---

## Concept B — "Crumple King" (bóp giấy & ném)

**Động từ cốt lõi:** BÓP (biến dạng) rồi NÉM (physics) — cặp cảm giác chưa có trên catalog.

**Gameplay loop:**
1. Tờ giấy A4 phẳng giữa màn hình. Mỗi cú vuốt CHỤM (pinch kéo 2 góc lại) → giấy gấp/nắn nhỏ hơn,
   viên to dần theo số lần bóp (4 → 3 → 2 → 1 → VIÊN).
2. Kéo-thả ném vào sọt xa dần + vòng bonus giữa đường (gió thổi, vật cản quay).
3. Paper ball méo thật lúc va chạm (wobble deformation), âm ràn rật.
4. Liên tiếp nhiều quả trúng = combo; ném trúng vòng bonus × điểm.
5. 60 giây leaderboard daily.

**Vì sao vui:** squish trước khi flick thỏa mãn 2 bản năng (phá + ngắm), viên to = thoả hiệp
"ném đã nhưng khó trúng" → quyết định strategy.

**Scope prototype 1 ngày:** Matter.js (đã có trong M3) — giấy = cluster box bodies + constraints,
mỗi cú chụm siết constraints; ném = impulse; sọt = static bodies. Placeholder: chữ nhật trắng,
không art. Cùng bộ loại trừ HUD/save/meta như Concept A.

**Tiêu chí fun gate:** cú ném đầu tiên trúng sọt phải "đã"; nếu thấy like ném giấy thường → fail.

---

## Thực hiện & quyết định

- **Làm:** 2 prototype trong 1 repo tạm `prototypes/m5/peel/` và `prototypes/m5/crumple/`
  (Vite + Phaser, chạy `pnpm dev` mỗi cái). Code: anh Tuyền (Claude Code local) — em không đụng.
  Prompt code cho từng con: xem `REFACTOR` style — scope đã đủ chặt, cần em soạn prompt paste thì bảo.
- **Sau fun gate:**
  - 1 con VUI → tạo `games/<slug>/` chuẩn, viết **5 file SPEC đầy đủ** (theo `spec-authoring`),
    rồi polish art (đường A programmatic trước, WAN nếu cần).
  - Cả 2 chán → quay lại bảng concept (Crumple/Loop Crew/idea mới), vẫn chưa tốn quá 2 ngày/game.
- **Nộp:** kênh đầu sau polish = **Reddit Devvit** (dễ nhất, 1 bot mọi game), Playgama sau khi
  check trùng lại theo `docs/SUBMISSIONS.md`.
- Không commit/push hộ anh — luật cũ.
