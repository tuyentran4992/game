# FIX ROUND 2 — M1 Buzz Blitz (Playgama pre-submit polish) — 28/08/2026

> Vision QA vòng 2 trên screenshot landscape thật của owner. Tiến bộ rõ: bỏ viền 2 bên ✅, FEVER bar track/fill rõ ✅, cá glow+sparkle ✅, HUD seam hết ✅, ong 2 pose ✅.
> Còn 5 mục dưới đây. Paste nguyên khối `## PROMPT` vào coding agent. Sửa ĐÚNG 5 mục, không refactor, không commit/push.

## Bảng bệnh án

| # | Quan sát | Bệnh | Lệnh sửa |
|---|---|---|---|
| 1 | Tam giác vàng viền đỏ dấu "!" lơ lửng giữa trời, cạnh trái lane 1, dưới HUD | Marker debug/placeholder sót lại, không gắn entity nào → lộ bản dev | Xóa hẳn. Grep code tìm chỗ vẽ (warning/debug marker) để xóa tận gốc |
| 2 | Vạch lane mảnh vẫn chạy lên trên đường chân trời (~y=210 vs horizon ~y=300) *(owner xác nhận: lane chia đều là THIẾT KẾ mobile-first — playfield column giới hạn giữa màn, desktop giữ nguyên như mobile, KHÔNG phải bug — chỉ còn nghi vấn phần line leo trời)* | Line leo lên trời = sai logic ảnh | Lane separators chỉ được xuất phát từ ĐÚNG mép trên playfield band (dưới đường chân trời) xuống đáy. KHÔNG đổi cấu trúc lane / không bỏ mobile-first column — chỉ cắt phần đầu trên của line nếu nó thật sự vượt horizon |
| 3 | Mèo cam đứng cỏ, KHÔNG có bóng nào dưới chân (đã bỏ ellipse đặc cũ nhưng chưa thêm bóng mới) | Mèo "dán nổi" | Thêm radial-gradient ellipse shadow dưới chân mèo: rộng ~1.4× thân mèo, cao ~0.35×, alpha đỉnh 0.22, feather mép mượt |
| 4 | Cụm quanh "Level 2": sparkle SAO CAM cạnh chữ Level + phía dưới 1 sao XANH + số "1" vàng, không nhãn | 2 sao 2 màu cạnh nhau → người chơi không hiểu "1" là gì | Thống nhất NHỮNG GÌ TỒN TẠI: sao cam gần "Level 2" chỉ là decoration → xóa nó (Level text đủ rõ); sao xanh + số = bộ đếm thật (lives/fish) → giữ, thêm nhãn ngắn rõ nghĩa in-game (vd "×1" sát icon), không 2 biểu tượng sao tranh nhau |
| 5 | Nút globe ngôn ngữ hồng sát mép phải (x≈978/960 canvas) | Dễ bị cắt/lấn trên device có bezel; khó tap mobile | Lùi vào trong ≥16px tính từ mép playfield, cùng padding bộ với nút pause/mute |

## PROMPT (paste nguyên khối vào coding agent)

```
Continue polishing the cat-vs-bees lane dodger for Playgama submission.
Fix EXACTLY the 5 items below. No refactoring, no new features, no commit/push.

1. DEBUG MARKER: There is a leftover yellow triangle with red border and "!" floating
   in the sky area (left lane, just below HUD). Find where it is drawn (search for
   debug/warning/marker Graphics or placeholder sprite) and REMOVE it completely —
   not just hide.

2. LANE SEPARATORS — DO NOT TOUCH THE LAYOUT. The game is intentionally mobile-first:
   a fixed-aspect playfield column centered on screen; desktop must look identical to
   mobile. The only issue: the lane divider lines start ABOVE the hills horizon and
   extend into the sky. Clip the dividers so they start exactly at the playfield band's
   top edge (below the horizon) and end at the bottom. Keep the existing lane geometry
   and the centered mobile-first column untouched. Verify on both 9:16 and a wide
   desktop window that the columns' top edges sit below the horizon.

3. CAT SHADOW: The cat has no ground shadow at all now. Add a radial-gradient ellipse
   shadow under its feet: width ~1.4x cat body, height ~0.35x, peak alpha 0.22,
   feathered edges (no hard rim). It must follow the cat when it switches lanes
   (same tween duration, slightly delayed for depth feel).

4. LEVEL CLUSTER: Around the "Level 2" text there are two star icons (an orange
   sparkle and a blue star with a yellow "1"). The orange sparkle is decoration —
   remove it. Keep the blue star + counter (the real stat) and render it as a single
   clear unit: icon + "×1" text with tight spacing, so players read it as one counter.

5. LANGUAGE BUTTON: The pink globe/language button hugs the right screen edge.
   Move it inward with ≥16px margin from the playfield edge and align its padding
   with the pause/mute button group.

Gates: tsc 0 errors · vitest green (run files individually if it hangs) · vite build
OK · serve dist/ and verify boot + rendering — divider lines start below the horizon
on BOTH a 9:16 window and a wide desktop window (layout itself must stay unchanged).
Bundle <5MB, no new network requests.
```

## Ghi chú
- Screenshot này là **landscape** — nếu anh nộp Playgama ở cả tỷ lệ ngang thì QA thêm 1 lượt dọc 9:16 trước khi bấm Submit (checklist kỹ thuật của họ).
- Nhớ xác nhận metadata đã đổi "Buzz Blitz" cả trong `build/metadata/metadata.json` + zip final (không chỉ trong code).
