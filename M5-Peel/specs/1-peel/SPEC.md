# SPEC — M5 "Peel!" v1

> Slug: `peel` · Engine: Phaser + matter · 9:16 portrait · 1 tay cái
> Trạng thái: **vượt fun gate trước khi code đầy đủ** (xem ../README.md)
> Convention: spec version đánh số `specs/1-<tên>`; nếu gameplay bị từ chối ở kênh nào, phiên bản thay thế là `specs/2-<tên>` — code cũ đóng băng.

## 1. Elevator pitch
Game ASMR gọt hoa quả: một đường tuốt liền tay bóc sạch vỏ, vỏ bong ra như thật. Không điểm số áp lực, không timer — chỉ có streak "PERFECT PEEL" và cảm giác đã tay.

## 2. Đối tượng & phiên chơi
- Khách: lướt giải trí ngắn (Reddit/Playgama/web), cả người lớn lẫn teen.
- Phiên 30–120s/quả. Không fail thật — chỉ mất streak → tự chơi tiếp (retention loop: "lại từ đầu streak").

## 3. Core loop (một quả)
```
nhận quả (3 kiểu luân phiên) → chỉa + giữ + tuốt 1 vòng quanh quả
   ├─ liền mạch ≥90% chu vi → PERFECT PEEL → vỏ ribbon bong + combo +1
   └─ đứt/ngoài rãnh → vỏ sứt, streak = 0, quả vẫn xong (không punish nặng)
→ cắt lát chéo (swipe ngang, auto-snap gần đúng) → khoe mặt cắt + điểm → quả mới
```

## 4. Cơ chế & số (config placeholder, tinh chỉnh sau fun gate)
| Tham số | Giá đầu | Ghi chú |
|---|---|---|
| Rãnh tuốt | 3 rãnh/đều quanh quả | que highlight khi hover/touch |
| Chuỗi khớp | góc liên tiếp, tốc độ ≥ ωmin | đứt = >150ms rời rãnh hoặc đảo chiều |
| Ngưỡng PERFECT | ≥90% chu vi liền | 60–89% = "GOOD", <60% = "Sứt" |
| Ribbon vỏ | mesh 64 slice, peel 8–10px/frame, curl ngoài | sprite rời khi rời rãnh |
| Combo | +1 mỗi PERFECT, nhân điểm 1+0.1×combo (max ×3) | reset khi sứt |
| Cắt lát | swipe ngang ±15° auto-snap, cắt 2 nửa + nảy nhẹ | bonus +50, KHÔNG fail |
| Điểm/quả | %liền×100 + PERFECT bonus 200 + combo + lát | chỉ để "cái tôi", không leaderboard ở prototype |

## 5. Quả & mặt cắt (prototype dùng color block + text tên)
cam (vỏ cam, ruột cam nhạt múi) · dưa hấu (vỏ xanh sọc, ruột đỏ hạt đen) · xoài (vỏ vàng, ruột cam). Vỏ = 2 lớp màu (ngoài + cùi trong) khi bay ra.

## 6. Feel & juice (KHÔNG được cắt khi code)
- Âm sắc nét pitch-variance theo tốc độ tuốt; tiếng "pop" khi đủ vòng; tiếng cắt "rào rào".
- Screen shake nhẹ 2px khi PERFECT; particle vụn vỏ + tia sáng tại điểm kết thúc vòng.
- Chữ "PERFECT PEEL" pop-scale 1.4→1; combo lớn dần góc phải.
- Không âm nền to — ASMR là nhân vật chính.

## 7. UI/HUD (prototype)
Không menu, không pause — vào chơi luôn. HUD chỉ: streak/combo góc phải, "quả N" góc trái, tên quả khi xong. (Menu/save/SDK chỉ thêm KHI QUA FUN GATE.)

## 8. Tiêu chí Fun Gate (chốt với anh Tuyền)
1. Lần đầu tuốt liền một quả: phải thốt "ồ" vì dải peel liền.
2. Muốn chơi lại ngay để đạt combo cao hơn.
3. Không có lỗi vật lý/mesh phá vỡ ảo giác "đang gọt thật".
→ Anh chơi xong report. Fail = đóng băng folder, không code tiếp.

## 9. Anti-clone (bảo vệ lượt nộp Playgama/Reddit)
Động từ chính KHÔNG phải: merge/Suika, sort, block, erase/DOP, untangle, slice-ném dao (Fruit Ninja = chẻ trên không; ở đây tuốt vỏ theo bề mặt). Kiểm catalog `site:playgama.com peel` trước khi nộp (đã làm 27/08: sạch). Ghi vào `docs/SUBMISSIONS.md`.

## 10. Sau fun gate (scope v1 chính thức, KHÔNG làm ở prototype)
`@game/sdk` (save streak, Game Ready, mute) · menu + chọn quả · chuỗi quả vô hạn + milestone "Truyền thuyết vỏ liền" · art thật theo `DESIGN-SPEC.md` · TEST-CASES + E2E · packaging Reddit + Playgama.
