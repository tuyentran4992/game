# Sổ nộp game — đa nền tảng

> MỌI lần nộp/thay đổi trạng thái ở bất kỳ kênh nào phải ghi vào đây.
> Agent trước khi nộp: đọc file này + chạy PRE-SUBMIT CHECKLIST.

## PRE-SUBMIT CHECKLIST (đúng 1 lần, mọi kênh)

**Originality (theo từng kênh):**
- [ ] Search tên game trên catalog kênh đó → KHÔNG trùng (bài học: `juicy-merge` đã tồn tại trên Playgama)
- [ ] Search 2-3 từ khóa thể loại (vd "suika", "merge", "melon") → đếm đối thủ cùng mechanic; nếu ≥3 bản tương đồng → KHÔNG nộp, phải đổi mechanic
- [ ] Ghi lại đường link các bản tương tìm thấy vào entry nộp (bằng chứng đã soát)

**Kỹ thuật (Playgama):** Game Ready event qua Bridge SDK · saveData qua SDK · mute + dừng audio khi minimize · globe ngôn ngữ · responsive 9:16→32:9 · bundle < 5MB target · load < 5s
**Kỹ thuật (Reddit Devvit):** `devvit playtest` pass · leaderboard server OK · README theo yêu cầu review team · không vi phạm Devvit game policy
**Kỹ thuật (ytgame):** title ≤50 ký tự · desc ≤150 · thumbnails 1:1/5:7/16:9 không branding · preview 16:9
**Chung:** grep `dist/` sạch từ khóa/theme bản cũ bị reject · QA browser+vision pass · `bash scripts/verify_game.sh <game>` pass

## Trạng thái theo kênh

| Kênh | Vai trò | Ràng buộc chính | Ghi chú |
|---|---|---|---|
| **Reddit Devvit** | Kênh dễ nhất, nộp ĐẦU khi nghi ngờ clone | Devvit policy, server leaderboard riêng | Ít soi "trùng gameplay" hơn Playgama |
| **Playgama** | Traffic + revenue sharing | Chống duplicate (toàn bộ HOẶC một phần), self-check | Review 3-5 ngày; có mentor/support chat — hỏi trước khi nộp |
| **YouTube Playables** | Dài hạn, chờ IAP cuối 2026 | Cấm tự monetize, no network ngoài | indie trực tiếp duyệt chậm; qua publisher (Mediacube) |
| **Mediacube (MC Play)** | Publisher pilot多渠道 | theo hợp đồng | pending indie approval |
| **CrazyGames** | dự phòng | chưa nộp | |

## Nhật ký nộp

| Ngày | Game | Kênh | Action | Kết quả | Ghi chú |
|---|---|---|---|---|---|
| 2026-08-24 | M3 Juicy Merge | Playgama | Submit (account kotaro001) | ❌ **REJECT 27/08** | "too closely replicates already published titles" — catalog có ≥4 Suika clone: `Suika Game - Watermelon Game`, `Merge Fruit Characters`, `Watermelon Game`, `Fruit Merge: Juicy Drop Game`; TRÙNG TÊN `playgama.com/game/juicy-merge` có sẵn |
| 2026-08-27 | M3 Juicy Merge | Reddit Devvit | README theo yêu cầu review team (commit 0b7a8b1) | ⏳ chờ review | port done (devvit + server + Redis), chưa deploy chính thức |
| ~08/2026 | M1 Cứu Mèo | Mediacube | Gói nộp chuẩn bị xong | ⏳ pending indie approval | |
| — | M2 Neon Sort | (chưa nộp) | code xong | ⏳ chưa đóng gói | |
| — | M4 Neon Grid | (chưa nộp) | code + build OK | ⏳ thiếu QA browser + packaging | |
| 2026-08-27 | M3 v2 Potion Panic | Playgama | **KHÔNG nộp** | ⛔ hủy — anh Tuyền chơi thử thấy CHÁN | đúng checklist anti-clone nhưng fun gate fail → dừng sớm, không tốn vòng polish/submission |

## Bài học gốc (từ reject M3)

1. Check trùng phải làm **TRƯỚC khi code**, không phải trước khi nộp — 3 tuần dev suýt lãng vì 1 cú search chưa làm.
2. "Khác về checklist" ≠ "khác thực sự". Playgama reject bằng mắt thường 10 giây; nếu phải giải trình dài để chứng minh khác → khả năng cao là chưa đủ khác.
3. **FUN là gate số 0.** Prototype placeholder chơi trước, SPEC sau. Game giống hệt người khác nhưng vui hơn nhiều → vẫn sống; game khác hẳn mà chán → chết cả 2 kênh.
