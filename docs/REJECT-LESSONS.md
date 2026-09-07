# REJECT LESSONS — Bài học thực tế từ review/reject thật (boss chuyển 04/09)

> Mọi reject/feedback từ kênh = chép nguyên văn vào đây + đúc gate. Nộp/resubmit bất kỳ game nào phải qua §PB-8 PROJECT-RULES.

---

## 1. M1 "Cứu Mèo" — MediaCube (YouTube Playables) — ⚠️ REVISE & RESUBMIT, CỬA MỞ (không phải reject chết)

Email từ **Sofiya — Business Development Manager, YouTube Playables @ MediaCube** (boss chuyển 04/09):

> Thank you for your interest in working with us as a publisher.
> We can see that you've already registered on our MC Play platform — thank you! **We've approved your account.**
> We've also reviewed the game you added to MC Play: https://fancy-frangollo-dde64c.netlify.app/
> We'd recommend **adding levels with a clear sense of progress and gradually increasing difficulty**. It would also be good to **make the acceleration a little slower at the beginning**, so players have more time to get used to the controls.
> What do you think? Would you be able to make these changes?

**Trạng thái mới:** MC Play account **APPROVED** (STATUS.md cũ ghi "PENDING indie approval" — đã hết chờ).
**Việc phải sửa (đúng 2 ý reviewer, bám nguyên văn):**
1. **Progression**: thêm levels có cảm giác tiến bộ rõ + độ khó tăng dần (game hiện tại thiếu chiều sâu — chơi là chơi, không "lên trình").
2. **Onboarding**: giảm acceleration giai đoạn đầu — người chơi mới cần thời gian quen điều khiển.
**Cửa tiền:** trả lời Sofiya "có, sửa được" + timeline → sửa → resubmit. Kênh chính (YouTube Playables qua MC) đang mở, chỉ chờ chất lượng.

---

## 2. M3 "Juicy Merge" — Playgama — ❌ HARD REJECT (clone, đã biết 27/08)

> This game **too closely replicates already published titles** on the platform. Under Playgama policy, we strive not to publish duplicate or substantially similar content.
> We would be happy to consider your other projects or review this game again after **meaningful changes** ... substantially differentiate the **core gameplay, mechanics, progression, content, or overall player experience**.

**Bài học:** anti-clone catalog check PHẢI chạy trước khi code (đã thành PB-5 + trạm CATALOG-CHK của qa-engineer). Resubmit chỉ khi khác biệt cốt lõi — M3 đã hủy theo quyết định 27/08.

---

## 3. ĐÚC KẾT CHUNG (boss: "game làm ra còn thiếu chất lượng")

- Verify kỹ thuật 4/4 PASS (tsc/vitest/build/asset) **CHƯA ĐỦ** — M1 sạch lỗi kỹ thuật vẫn bị chê. Cái thiếu là **chiều sâu gameplay**: progression, difficulty curve, onboarding.
- Chất lượng nộp = 4 cửa mới (§PB-8): PROGRESSION · ONBOARDING · ORIGINALITY · FEEDBACK LOOP.
- Fun Gate boss (PB-2) + QA vision là lưới bắt sớm; reject thật của kênh là bài kiểm cuối — mỗi lần bị chê, bài học phải quay về thành gate, không để game sau vấp lại.

---

## 4. Án lệ nội bộ chuỗi PB-M1-FIX (04/09 — không phải reject kênh, là bệnh quy trình phải thành gate)

1. **Warmup che ramp** (QA round 1, `FIX-ROUND-1-PROGRESS1.md`): ONBOARD-1 bot sống đủ 30s ⇒ PASS, nhưng chết hàng loạt 29–44s ngay sau warmup — gate 30s chỉ đo khúc flat, không đo cửa 30→60s nơi ramp thật bắt đầu. **Gate rút ra:** smoke onboarding phải chạy qua ít nhất 2× độ dài warmup (ở M1 là 60s), hoặc sim deterministic cửa sống-sau-warmup ≥50%. Đã áp dụng: t_2e94b3be sim 40 ván seed 1..40, cửa 30→60s.
2. **Ping PREVIEW-GATE sớm khi còn FAIL tồn** (04/09, comment 38→39 card mẹ): CEO ping `0ccf1ef` lúc PROGRESS-1 còn treo + card balance đang chạy cùng chain → phải retract, làm supervisor tốn công dọn. **Gate rút ra (nhớ vào memory CEO):** điều kiện ping = 0 FAIL tồn + 0 card running trong chain + SHA = commit cuối main local. Một batch đúng 1 ping; ping sai phải retract công khai + correction tại nguồn (án lệ phụ: ping 46 ghi SHA `80c9032` chưa tồn tại thật — commit tưởng đã merge nhưng chưa; verify `git rev-parse main` NGAY TRƯỚC khi gõ SHA, không gõ từ trí nhớ).
3. **Card trùng do thiếu dedup prefix** (04/09, comment 32 card mẹ): 2 run CEO fan-out song song tạo `t_1b5f2d12`/`t_fe995181` trùng `t_27bec1dc`/`t_662df9e4` (2 branch cùng sửa 1 curve). **Gate rút ra:** mọi card fan-out phải có `idempotency_key` `<CHUỖI>-<VAI>` + `kanban list` quét prefix trùng trước khi tạo; card trùng archive ngay, giữ nguyên làm bằng chứng.
4. **QA không debug bot vô hạn** (boss lệnh 12/09 qua supervisor, comment 42 card t_68477b0d): 4 vòng/2h sửa bot → "độ vui/độ khó = boss chơi tay phán (PB-2), bot chỉ là smoke báo-động-sớm ≤10 phút, không phải gate". Đã chép cứng vào PROJECT-RULES PB-3b.

5. **Nợ kiến trúc E — Gameplay.ts god-file 2233 dòng** (PERF3 04/09, card t_e49b5119): round perf chỉ patch render/allocation đúng phạm vi A-D (pre-render doodads, FxPool, dirty-flag, in-place prune), CẤM tách file trong round này vì rủi ro regression cao — refactor tách scenes/systems làm round riêng sau khi M1 ổn.

6. **Skip King (M7) — boss KILL tại Fun Gate 07/09** (1 dòng, PB-2a): feel đủ đã (audio/juice/skim đạt số verify) nhưng **vòng lặp core nhàm — 0 biến đổi theo mốc, cột (3) bảng BIEN-DOI-VONG-LAP trống ngay từ đầu**; bài học: BẢNG BIẾN ĐỔI phải có cột (3) ĐÃ ĐIỀN (ít nhất 1 mốc mở quyết định mới) TRƯỚC khi chain production chạy, feel không cứu được loop rỗng.
