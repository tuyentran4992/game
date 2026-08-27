# Prompt code M6 "Crumple King" — fun-gate prototype (paste vào Claude Code)

```
TẠO PROTOTYPE FUN-GATE "CRUMPLE KING" — chơi được trong hôm nay, art placeholder.
Repo gốc: /data/youtube-playables. Tạo thư mục MỚI M6-Crumple-King/game/ (Vite + TS + pnpm).
KHÔNG sửa file nào khác, KHÔNG commit/push.

Bối cảnh: prototype bóp giấy & ném — đọc M6-Crumple-King/README.md.

Yêu cầu:
- pnpm create vite (vanilla-ts), cài phaser@4.2.1 + matter-js.
- 1 tờ giấy ở giữa: MESH grid 5×7 point bodies + constraints (nhìn như tấm trắng có nếp gấp
  vẽ line). Pointer CHỤM 2 góc bất kỳ kéo lại gần (hoặc tap 2 điểm góc rồi kéo) → khi 2 điểm
  đủ gần, THÈM ràng buộc kéo chúng sát nhau (giấy "nếp" nhỏ lại, phình mặt). Lặp lại: mesh
  co dần 4 cấp: phẳng → bán crumple → viên. Mỗi cấp bóp: âm ràn rật (synth), viên méo
  (wobble) khi va chạm — đổi restitution theo cấp.
- Đủ viên (cấp cuối): kéo-thả ném = impulse theo véc-tơ kéo. Sọt giấy bên phải trên bàn,
  xa dần sau mỗi quả trúng. Sọt = tĩnh, mở trên. Trúng: +100×combo, tiếng "rột" đã tai,
  viên tự spawn cái mới phẳng để bóp tiếp (combo giữ). Trượt: combo về 0.
- HUD: điểm, combo, timer 60s → overlay tổng kết + Restart. Không menu/save/SDK.
Gate: pnpm dev không lỗi console, bóp→ném→trúng/tuột phản hồi rõ.
BÁO LẠI: đường dẫn + lệnh chạy + điều đã cắt xén.
```
