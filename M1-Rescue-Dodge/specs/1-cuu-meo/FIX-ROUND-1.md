# FIX ROUND 1 — M1 "Cuu Meo" → đổi tên + art-polish trước khi nộp Playgama (28/08/2026)

> Bệnh án từ vision soi screenshot thật của owner + pre-submit check catalog Playgama.
> Paste nguyên khối `## PROMPT` dưới đây vào coding agent. Sửa ĐÚNG 10 mục, không refactor, không thêm tính năng, không commit/push.

## Bảng bệnh án

| # | Quan sát trên screenshot | Bệnh | Lệnh sửa |
|---|---|---|---|
| 1 | 2 vạch lane trắng nét đứt chạy từ đỉnh xuống đáy, xuyên cả vùng trời; bề rộng lane 167/175/168px | Nhìn như debug gizmo editor; logic sai (kẻ vạch trên không); lane lệch | Bỏ vạch đứt trắng thuần. Lane chia bằng dải "đường đất/cỏ" baked: 3 lane BẰNG NHAU (tính từ playfield width /3), mép trong mỏng 2px màu tối alpha 0.12, không có line nào overlay lên vùng trời. Playfield bắt đầu dưới HUD ≥16px |
| 2 | Cá vàng (pickup) bị khoanh bởi vòng tròn vàng nét mảnh, không glow | Đọc như selection box editor; style cá semi-realistic lệch outline mèo/ong | Bỏ vòng tròn. Pickup = radial glow vàng mềm (alpha 0.35, pulse scale 1.0↔1.06) + 2 sparkle xoay chậm + bounce nhẹ. Vẽ cá cùng ngôn ngữ outline dày cartoon |
| 3 | Pill "FEVER 0%" cao ~14px, track=fill xám đen, text ~9px | Hype meter trông như progress bar tải file; ra thumbnail thành vệt xám | Pill cao 28px, radius full; track `#FFFFFF` alpha 0.12; fill gradient cam→đỏ #FF9F1C→#E71D36 chỉ khi >0; label "FEVER" 12px bold + % 12px; icon 🔥 vẽ bằng Graphics (không glyph font) bên trái; gap điểm↔pill ≥10px; khi đầy: glow pulse |
| 4 | 2 viền xanh lá 2 bên dày ~105px (28% ngang) + bọt decor nhịp lệch 210/162/212px | Chiếm chỗ không chức năng, decor dán lẻ | Giảm border mỗi bên ≤40px HOẶC bỏ hẳn (playfield full-bleed, nền cảnh che bằng vignette mềm). Bọt: bỏ hoặc spacing đều theo grid cố định |
| 5 | Seam ngang y≈62 chạy suốt màn: rect nền tối 10–15% phía sau HUD, cắt đúng đáy pill | Lộ "dán UI" | Bỏ rect. Thay bằng gradient fade từ đen alpha 0.35 ở mép trên → 0 tại khoảng 120px, không có cạnh cứng |
| 6 | 3 con ong chung 1 pose, cánh trắng đục | Repetition lộ; cánh = sticker | 2 pose cánh (góc khác nhau) + flipX ngẫu nhiên khi spawn; cánh alpha 0.85; thêm motion blur trail mờ khi speed level ≥2 |
| 7 | Bóng mèo ellipse đen đặc cạnh cứng | Mèo "dán nổi" | Shadow = radial gradient ellipse, alpha đỉnh 0.25, feather mép |
| 8 | Ong spawn sát đáy pill FEVER (gap 1px) | Entity chạm HUD | Safe area: spawn Y chừa ≥16px dưới HUD block (tính từ bound thật của HUD) |
| 9 | Cuối màn có con đường đất uốn vẽ tay, xung đột lane trừu tượng bên trên | Người xem không hiểu mặt đường ở đâu | Xóa curl đường đất ở đáy; đáy = nền cỏ liền mạch |
| 10 | Tên "Cuu Meo - Bee Dodge" (tiếng Việt không dấu) | Nhìn kì trên catalog quốc tế | Đổi tên toàn bộ theo mục PROMPT (title mới do owner chốt — mặc định "Buzz Blitz") |

## PROMPT (paste nguyên khối vào coding agent)

```
You are polishing an existing Phaser HTML5 casual game for submission to Playgama.
Project: M1-Rescue-Dodge (cat dodges bees across 3 lanes, collects fish, FEVER meter).
Code lives in `game/src/` (Phaser + TS + vite). Fix EXACTLY the 10 items below.
Do NOT refactor unrelated code, do NOT add features, do NOT commit or push.

1. LANES: Remove the two pure-white dashed vertical debug-style lane lines entirely.
   Lanes must be equal width = playfieldWidth/3, and lane separators exist ONLY inside
   the playfield band (they must not extend into the sky area above the playfield).
   Render separators as subtle darker edge lines (2px, dark color, alpha ≤0.12) baked
   into a stylized path/grass strip look — not floating white dashes.

2. FISH PICKUP: Remove the thin yellow circle outline around the fish. Replace with:
   soft radial gold glow (alpha ~0.35), slow pulse scale 1.0→1.06, two small rotating
   sparkles, gentle vertical bob. Redraw/tint the fish to match the thick cartoon
   outline style of the cat and bees (single art language).

3. FEVER BAR: Rebuild HUD fever meter: pill height 28px, fully rounded; track
   rgba(255,255,255,0.12); fill horizontal gradient #FF9F1C → #E71D36 (shown when >0);
   "FEVER" label + percent value in bold ≥12px readable at small scale; flame icon drawn
   with Graphics (no font glyphs like 🔥); ≥10px gap between score text and pill; when
   meter is full, pulse a glow on the pill.

4. SIDE BORDERS: Shrink the two green decorative side panels to ≤40px each, or remove
   them (let the background scene bleed full width with a soft vignette). If decorative
   bubbles remain, place them on an even vertical grid, same size all.

5. HUD SEAM: Delete the flat dark rectangle behind the HUD (it creates a hard horizontal
   seam across the screen). Replace with a top-edge gradient fade from rgba(0,0,0,0.35)
   at y=0 to transparent at ~120px. No hard edges.

6. BEES: Use 2 wing poses (vary wing angle) and randomly flipX on spawn so 3 on-screen
   bees never look identical. Wings alpha 0.85. Add a faint motion trail for bees when
   speed level ≥ 2.

7. CAT SHADOW: Replace the hard-edged solid ellipse shadow with a radial-gradient
   ellipse, max alpha 0.25, feathered edge.

8. HUD SAFE AREA: Bees and fish must never spawn/scroll within 16px of the HUD's bottom
   bound. Compute from the actual HUD container bounds, not a magic number.

9. BACKGROUND: Remove the hand-drawn dirt road curl at the bottom of the background —
   bottom should be continuous grass matching the lane strip concept.

10. RENAME: Replace all occurrences of "Cuu Meo" / "cuu-meo" with the new title:
    - GAME_TITLE = "Buzz Blitz"        (game/src/main.ts)
    - GAME_NAME  = "buzz-blitz"        (game/src/main.ts)
    - build/metadata/metadata.json: "title": "Buzz Blitz — Cat vs Bees",
      keep short_desc but replace any "Cuu Meo" mention with "Buzz Blitz".
    - games/cuu-meo.yaml: title field same (rename file to games/buzz-blitz.yaml).
    Do NOT rename git-tracked directories or spec folders.

Gates (must all pass before you report done):
- TypeScript: 0 errors; `vitest run` all green (run files individually if it hangs).
- `vite build` succeeds; serve dist/ and verify the game BOOTS and renders (no black
  screen). Check lane equality: separators at exactly 1/3 and 2/3 of playfield width.
- No new network requests; no ads/IAP; total bundle stays < 5MB.
```

## Ghi chú pre-submit (owner tự làm)
- Tên "Buzz Blitz" / "Purr Rush": em đã search `site:playgama.com` 28/08 — **không trùng**. Anh chốt tên nào thì sửa dòng 10 của prompt tương ứng.
- Sau khi agent sửa xong + anh chơi OK: rebuild → unzip bản `cuu-meo-playgama.zip` MỚI ra serve thử → nộp.
- Catalog đã có `Cat Rescue`, `Save the Cat` (mèo + ong, thể loại VẼ LINE bảo vệ) và `Nyan Cat Classic` (mèo runner). Mình là lane-dodge one-tap → khác core verb, nhưng nếu reviewer hỏi thì điểm khác biệt là: one-tap 3-lane + FEVER combo + cá bonus.
