Bạn là REVIEWER ĐỘC LẬP cho batch B5 — BUNDLE ĐÚNG/SAI. **CẤM SỬA FILE TRONG REPO** (nháp/triage trong /tmp thì được).

Định dạng output + luật ngắn nằm trong gói review (system prompt). **CHECKLIST B5 ở dưới thay cho checklist logic trong gói** — chấm đúng 12 mục, mỗi mục 1 dòng `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng (số đo, grep count, file:dòng) |`. Chỉ đọc: `game/tools/check-bundle.mjs`, `game/metadata/metadata.json`, `games/paper-crease.yaml`, các thư mục snapshot `game/build/*/` (hoặc `dist/`), `game/package.json`.

- C1 Hai snapshot nộp tồn tại: `build/ytgame/` + `build/playgama/` có `index.html` + assets (liệt kê số file).
- C2 Debug hook sạch: `grep -rE "\?debug|debug=" build/ytgame build/playgama` = 0 match (dán lệnh + count).
- C3 `\?level=` `\?seed=` `\?ad=mock` trong 2 bundle nộp = 0 match.
- C4 Mạng: `fetch(` `XMLHttpRequest` `WebSocket` `sendBeacon` `import(` = 0 trong cả 2; ytgame `https?://` = 0; playgama URL ngoài = **đúng** `bridge.playgama.com/v2/stable/playgama-bridge.js` (dán grep).
- C5 Kích thước: tổng byte mỗi bundle ≤5MB và zip ≤1,677,721 B; file to nhất ≤512KB (dán số đo `du -sb` + `stat`).
- C6 `index.html` bản nộp: 0 chuỗi `/src/`; mọi `src=`/`href=` resolve tới file CÓ THẬT trong bundle (kiểm bằng script /tmp).
- C7 `check-bundle.mjs` chạy thật cho cả 3 mode — dán output + exit code.
- C8 Bằng chứng cổng không vô nghĩa: /tmp copy + chèn `fetch('http://x')` ⇒ check phải FAIL (dán output).
- C9 `bash scripts/verify_game.sh M11-Gap`: dán kết luận PASS/FAIL từng rào; FAIL phải chỉ đúng file.
- C10 `python3 -m pipeline validate`: 0 FAIL nhóm network/size; FAIL khác liệt kê + giải thích thuộc batch nào.
- C11 metadata: title ≤50 ký tự, short_desc + how_to_play ≤150 và tiếng Anh, version khớp `package.json`, 0 chuỗi "GẤP"/tên cũ (grep cả bundle).
- C12 zip ≡ snapshot (`diff -r` = 0 khác); tên zip + md5 + byte có trong hồ sơ.

Tin nhắn CUỐI = bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Dán số thật, không tóm tắt thay output. ≤25 lượt; hết giờ ⇒ chấm C2/C4/C5/C12 trước, ghi rõ mục bỏ dở.
