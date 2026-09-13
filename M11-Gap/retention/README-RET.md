# BRIEF RETENTION (nhóm B) — meta progression theo LEVEL, KHÔNG daily

## Bối cảnh
Game "GẤP": mỗi màn ~60 giây, người chơi đoán hình tờ giấy khi mở bung (4 đáp án).
Chủ dự án CHỐT: **làm theo dạng LEVEL, KHÔNG dùng Daily Challenge.**
Mục tiêu của vòng này: đề xuất lớp giữ chân để người chơi quay lại — mỗi đề xuất phải có
**SỐ NEO có nguồn** (benchmark ngành) + **cách đo** + **điều gì khiến đề xuất này SAI**.

## Luật Playables phải tôn trọng (đối chiếu cho TỪNG đề xuất)
- CẤM gọi mạng ngoài (không analytics/multiplayer realtime/server) · CẤM IAP · CẤM tự nhét ads
  (chỉ dùng SDK: interstitial sau game over, rewarded để undo/hint/continue).
- Save qua SDK storage (local), <3MB. Bundle mục tiêu <5MB. Target 13+.
- Một đề xuất vi phạm luật = đề xuất bị loại, ghi rõ lý do.

## Schema bắt buộc (`retention/<Px>.json`)
```json
{"direction":"<trục của bạn>",
 "proposals":[{"id":"P3-01","name":"...","mechanism":"cơ chế hoạt động 1-3 câu",
   "metric":"chỉ số sẽ nhìn để biết nó hiệu quả",
   "benchmark":{"value":"<số + đơn vị>","source_url":"https://...","date":"YYYY-MM-DD"},
   "how_measured":"đo bằng gì (event nào, log gì, offline được không)",
   "what_would_falsify":"bằng chứng nào sẽ khiến đề xuất này SAI",
   "playables_ok":true}],
 "summary":"6-10 dòng: đề xuất nào mạnh nhất và vì sao"}
```
Không tìm được số có nguồn ⇒ `"benchmark":{"value":null,"unverified":true,"why":"..."}` — **cấm bịa số**.

## Cấm
Bịa số/nguồn/tên game · lái browser (chỉ web_search/web_extract) · sửa file của agent khác ·
chạy build/deploy · đề xuất nằm trong trục của agent khác (mỗi người 1 trường phái, không đè nhau).

## Thứ tự bắt buộc
1. Đọc `retention/README-RET.md` + brief trục của mình.
2. Viết `retention/<Px>.json` (draft trước → đủ đề xuất).
3. Viết `retention/<Px>.md` (6-12 dòng, tiếng Việt).
4. Chạy `python3 retention/validate_ret.py --file retention/<Px>.json` → 0 lỗi.
5. Post board: `python3 /data/youtube-playables/M11-Gap/board_post.py '{"agent":"<Px>","file":"retention/<Px>.json","proposals":<n>}'`
6. Trả lời cuối: 4-6 đề xuất mạnh nhất + số neo của mỗi cái + đề xuất nào rủi ro nhất.
