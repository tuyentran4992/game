# M5 — "Peel!" · ASMR gọt vỏ · Prototype Fun-Gate Spec

> **Ngày:** 27/08/2026 · **Trạng thái:** 🚧 prototype → fun gate (chưa phải game chính thức)
> Spec stage 1: `specs/1-peel/SPEC.md` + prompt `specs/1-peel/PROMPT.md`. Cuốn chiếu: anh verify PASS → em mở `specs/2-peel/` (spec đầy đủ), cải tiến → `specs/3-...`.

## Động từ cốt lõi: TUỐT
Một nhát dao liền mạch từ cuống xuống đáy — không đặt/xếp/ghép. Kiểm catalog Playgama 27/08: tìm "peel" **không game nào** lấy gọt vỏ làm cơ chế chính (genre chỉ thắng trên mobile app, chưa ai port lên web). Empty niche thật.

## Gameplay loop (60 giây)
1. Trái cây giữa màn hình (ellipse shaded), dao theo con trỏ.
2. Kéo dao quanh quả → slice nào lưỡi đi qua bán kính hợp lệ → vỏ **BONG** thành dải ribbon cuộn; phần peel lộ ruột bóng + nước bắn.
3. Nhấc tay giữa đường / lệch mép = **RÁCH**: ribbon dừng, flash đỏ, mất streak, tiếng "toạc".
4. Đủ ≥90% vòng = "PERFECT PEEL" ×2 streak, ribbon văng xoáy tròn.
5. Peel xong → quả kế spawn (táo → xoài → dưa, to dần chậm dần). Hết 60s → tổng kết → leaderboard daily (giai đoạn sau).

**Vì sao vui (giả thuyết cần gate xác nhận):** tuốt liền tay + ASMR có skill ceiling; nỗi sợ "rách" tạo tension như dao cắt xà phòng; clip PERFECT PEEL tự viral.

## Scope prototype (placeholder hết, ≤1 ngày)
Phaser 4.2.1 + Vite + TS, canvas 9:16, nền tối. Quả programmatic, ribbon = 20-segment spring tự viết (không lib), audio WebAudio synth. HUD điểm/streak/timer. **KHÔNG:** level design, meta, save, SDK, art đẹp, đa ngôn ngữ.

## Tiêu chí FUN GATE
Anh chơi 60 giây: ít nhất **1 lần "ồ"** vì dải peel liền mạch dài + **muốn chơi lại ngay**. Fail → concept vào kho, không polish.

## Prompt code
`specs/1-peel/PROMPT.md` — paste vào Claude Code local, code vào `M5-Peel/game/`.
