# BRIEF T0 — CATALOG CHECK game "GẤP" (paper fold & punch puzzle)

## Bối cảnh (đọc kỹ, đây là lý do tồn tại của vòng này)
Game: tờ giấy bị GẤP làm 4 hoặc 8 lớp, rồi bị ĐỤC 1 lỗ tròn / CẮT 1 góc chéo.
Người chơi nhìn tờ đang gấp và chọn 1 trong 4 hình là hình dạng thật khi MỞ BUNG.
Gameplay ĐÃ được chủ dự án chơi tay và duyệt (fun gate PASS). Giờ phải trả lời:
**mechanic này có bị trùng/đã bão hoà trên kênh nộp không, tên nào còn trống.**

## 4 kênh đích
1. Playgama (playgama.com)  2. CrazyGames (crazygames.com)
3. Reddit Devvit games (r/devvit, devvit games directory)  4. YouTube Playables

## LUẬT CHỐT TRƯỚC (không được đổi sau khi chạy)
- **≥3 bản cùng mechanic trên 1 kênh ⇒ KILL hoặc phải đổi mechanic.**
- 1-2 bản cùng mechanic ⇒ GO nhưng BẮT BUỘC nêu rõ khác biệt hoá của mình.
- 0 bản ⇒ GO.
- **Nguồn NGOÀI 4 kênh** (Poki, itch.io, App Store, Google Play, GameFlare…) ghi `channel:"other"`.
- Chỉ tính là "cùng mechanic" khi bản đó có verb gấp-rồi-đục/cắt → đoán hình mở.
  Cùng chủ đề giấy mà verb khác (vẽ, gấp origami, xếp giấy, xé) chỉ tính mức 1.

## Thang tương đồng (bắt buộc dùng)
- 0 = khác hẳn · 1 = cùng chủ đề giấy/verb khác · 2 = cùng verb một phần · 3 = gần như cùng mechanic.
- Nếu phân vân giữa 2 mức (vd 2 hay 3): **chấm 3 lần độc lập rồi lấy đa số**, ghi lại cả 3 phiếu trong trường `votes`.

## Tên ứng viên phải check trùng (4 kênh + App Store + Google Play)
"GẤP" · "Paper Punch" · "Unfold It" · "Fold & Punch"

## Schema bắt buộc cho mỗi bản tìm được (JSON array, file riêng của mình)
```json
{"channel":"playgama|crazygames|devvit|ytplayables|other",
 "route":"<id route của mình>",
 "title":"Tên game",
 "url":"https://...",
 "mechanic_verb":"gấp-rồi-đục-đoán-hình | biến thể mô tả ngắn",
 "similarity":3,
 "votes":[3,3,3],
 "evidence_note":"1-2 câu: vì sao xếp mức này, dẫn chi tiết nhìn thấy trên trang",
 "date_checked":"YYYY-MM-DD"}
```
Không truy cập được trang ⇒ thêm 1 dòng với `"similarity":null` và
`"evidence_note":"KHONG_KIEM_CHUNG_DUOC: <lý do 403/timeout/bot-wall>"`. **Cấm đoán.**

## Cấm (vi phạm = kết quả bị loại)
- Bịa URL, bịa số, bịa ngày, tự nhận "đã kiểm tra" mà không dẫn link.
- Lái browser (chỉ dùng web_search + web_extract). Không đụng session/browser của ai.
- Sửa file của agent khác. Chạy build/deploy. Ghi ra ngoài thư mục `t0/` (trừ board).
- Suy đoán "chắc là có/không có" — không thấy thì ghi KHONG_KIEM_CHUNG_DUOC.

## Việc phải làm theo thứ tự
1. Đọc đúng file brief route của mình (`t0/brief-<ROUTE>.md`).
2. Tìm + ghi file đích `t0/<ROUTE>.json` (draft trước, đủ dòng sau).
3. Viết `t0/<ROUTE>.md`: 6-12 dòng tóm tắt (số bản theo kênh, kết luận route, đường nào bế tắc).
4. Chạy `python3 t0/validate_t0.py --file t0/<ROUTE>.json` → phải 0 lỗi.
5. Post 1 dòng: `python3 /data/youtube-playables/M11-Gap/board_post.py '{"agent":"<ROUTE>","file":"t0/<ROUTE>.json","rows":<n>,"sim3":<n bản mức 3>,"blocked":<n>}'`
6. Trả lời cuối: số bản tìm được theo kênh + kết luận GO/KILL của route + đường nào chưa với tới.
