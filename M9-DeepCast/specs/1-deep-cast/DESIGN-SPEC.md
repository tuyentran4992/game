# M9 Deep Cast — DESIGN-SPEC (art production, không prototype)
> Nguồn: SPEC.md v2. Mọi asset là SVG trong `assets/src/` → build thành PNG atlas (pipeline `assets/` của repo). CẤM ảnh AI cho MVP này (deterministic + <4MB).

## 1. STYLE THỐNG NHẤT
- Cartoon đậm viền (stroke 3px, màu #1B2A41), no gradient photoreal.
- Bảng màu: nền nước chuyển dải — Rạn `#2E9BD6→#1F7FBF` · Tăm `#1A63A0→#124E86` · Mực `#0B2F5E→#071F42` (bọc phát quang `#5EF0E6`) · Vực `#041128` + quầng vàng kho báu `#FFD166`.
- HUD màu nổi trên mọi nền: gauge `#FFFFFF` viền `#1B2A41`, fill Oxy `#4ECDC4` / Dây theo mức: <55 `#FFD166`, 55–80 `#FF9F1C`, >80 `#E71D36`, Tiền `#FFE66D`.
- Font: hệ thống bold sans (không webfont). Mọi chữ UI trong game TIẾNG ANH.

## 2. CAMERA & WORLD
- Viewport logic 480×854, world 480×1300 (0=trời, 100..854 mặt nước, 854..1200 biển tính mét = px). Camera follow lưỡi câu, clamp mặt nước. Parallax 2 lớp/nền dải (tốc độ 0.3× và 0.6×).

## 3. DANH MỤC ASSET (production, kích thước px tại scale 1)
| ID | Nội dung | Size | Anim |
|---|---|---|---|
| boat | Thuyền gỗ + ngư phủ (1 người, áo vàng) | 260×120 | bob 2f, rod-bend 3 mức (theo tension), reel-crank 2f |
| hook / hook-double | Lưỡi đơn + mồi giun; lưỡi đôi | 40×56 | sway 2f |
| line | dây câu vẽ bằng Graphics (không sprite), curve Catmull theo tension, màu đổi theo mức tension | — | rung khi >80 |
| fish_01..fish_10 | 10 loài theo dải, mỗi con có hoa văn riêng (sọc/chấm/đốm), mắt to | 48–120×24–64 | swim 2f wiggle đuôi; hooked: xoay vật vùng vẫy, splash |
| whale | Cá Voi Xanh (tier 14) | 240×110 | swim 2f; fight 3f (vẫy đuôi mạnh) |
| shark | Cá Mẹo patrol | 160×54 | swim 2f, hàm hé |
| chest | Rương | 56×44 | sparkle 2f |
| treasure | Kho báu đáy (hòn vàng + ngà) | 200×70 | glow pulse |
| bg_reef/dark/trench | 4 nền dải (tảng san hô, xác tàu chìm, ống khói, hẻm đá + rương nền) | 480×850 ×4 | 0 |
| bubble, splash, sparkle, shadow | FX | nhỏ | particle |
| sonar_ring | vòng quét sonar | 480 ring | sweep scale 0→1, 1 lần/sạc |
| hud_gauges | 3 thanh + 3 tim + label (Graphics+text, không sprite atlas) | — | fill mềm (tween 90ms) |
| win_overlay | Voi nhảy lên boong + confetti | fullscreen | 3f sequence |
| lose_overlay | Thuyền trôi, lưỡi rỗng | fullscreen | 0 |
| title | logo DEEP CAST + cá voi bóng sau nền | fullscreen | bob |

Tổng atlas ≤ 4MB (verify TC-B1).

## 4. BỐ CỤC MÀN HÌNH
- Title: logo giữa, PLAY nút 220×64 `#FFD166` viền đậm, best-score nhỏ dưới.
- Chơi: thuyền neo mép trên (y=854px world, camera luôn thấy mặt nước khi ở gần), HUD trái-phải góc trên, depth-meter cạnh phải (số mét, cập nhật liên tục — chiều sâu là nhân vật chính).
- Sonar button 72×72 phải-dưới khi còn charge (mốc 550m); Cutter không có (bỏ vì không shop).
- DiveResult popup: "CAUGHT!" + danh sách cá + tiền, tự đóng 1.6s.
- Win overlay: hạng S/A/B + tiền + tổng thời gian + CHƠI LẠI. Lose: lý do (OUT OF FUEL / LINES BROKEN) + độ sâu tốt nhất + THỬ LẠI.

## 5. JUICE (số để verify)
- Cá hooked squash 1.15x0.85 90ms rồi nảy về. Break = flash đỏ fullscreen 120ms + shake 8px 300ms.
- Catch money = số vàng bay lên HUD 6 particle, `+value` pop-scale.
- Tension >80: vignette đỏ + dây rung; >95: âm beep nhanh (WebAudio synth, không asset).
- Voi kéo thuyền: thuyền drift ngang ±36px ease-in-out 2.4s, bubble trail 8f, nhạc im (synth low rumble).
- Win: Voi nhảy arc + splash fullscreen, confetti 40 particle, 2.2s rồi overlay.
- SFX: WebAudio synth 5 loại (reel-click, splash, pop, creak, alarm). Không nhạc nền (OUT scope).

## 6. DATA-TESTID (cho QA browser)
`screen-title`, `btn-play`, `btn-continue-dive` không tồn tại (không stage) — thay bằng: `hud-air`, `hud-tension`, `hud-money`, `hud-depth`, `hud-hearts`, `btn-sonar`, `popup-result`, `screen-win`, `screen-lose`, `btn-retry`, `rank-badge`, `debug-seed` (nhập seed, chỉ khi `?debug=1`).
