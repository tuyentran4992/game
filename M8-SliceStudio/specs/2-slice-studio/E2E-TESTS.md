# Slice Studio — E2E-TESTS & COMPLIANCE PLAYGAMA (chiếu từng dòng TECH-REQ)

**Nguồn chân lý:** `/data/youtube-playables/docs/PLAYGAMA-TECH-REQ.md` (bản chụp 07/09 — wiki.playgama.com, link anh Tuyền). Mỗi dòng req → 1 ID kiểm chứng + cách đo + tiêu chí PASS. 4 điểm boss soi = (a) tiến trình lưu khi xoay, (b) 0 system player, (c) desktop keyboard/mouse + field ≤1:2 + 0 scrollbar + popup đóng + one-hand, (d) mobile full-screen + 0 WebGL notice + Latin + index.html gốc + ≤300MB + 0 analytics + 0 URL-lock.

**Browsers gate:** Chrome, Firefox, Opera, Safari, Edge (§Tương thích) — QA chạy thực tế Chrome + Firefox + Safari iOS (thiết bị thật nếu có), còn lại qua cấu hình tương đương (Chromium-based: Opera/Edge = Chrome engine; ghi rõ trong bệnh án).

---

## C-1..C-27 BẢNG MAP TỪNG DÒNG REQ

### Nhóm A — Bridge & mạng ⭐(boss soi d: 0 analytics + 0 URL-lock)
| ID | Req (nguyên văn rút gọn) | Cách kiểm chứng | PASS khi |
|---|---|---|---|
| C-1 | Bridge tích hợp trong game | build mode playgama → grep bundle có bridge glue từ `packages/sdk/bridge-backend.ts`; boot qua `playgama.html` với window.bridge mock → initialize() resolve | initialize OK + không lỗi console |
| C-2 | KHÔNG đăng nhập/ủy quyền ngoài | review code S4: 0 OAuth/popup login; boot offline (Chromium --offline) vẫn vào L1 + cắt được | chơi được 100% offline |
| C-3 | KHÔNG analytics | grep bundle: 0 chuỗi trong danh sách `google-analytics` `gtag` `GA4` `amplitude` `mixpanel` `yandex` `fbq` | 0 match |
| C-4 | KHÔNG khóa theo URL | deploy 2 host khác nhau (Netlify domain khác + localhost) → cùng 1 build chạy hết L1→L2 | 0 URL-lock logic (grep `location.host` và `hostname` = 0 match trong src game) |

### Nhóm B — Kích thước & đóng gói ⭐(boss soi d: Latin + index.html gốc + ≤300MB)
| ID | Req | Cách kiểm chứng | PASS khi |
|---|---|---|---|
| C-5 | Archive ≤300MB | `du -sh` dist sau build mode playgama trước khi zip | ≤300MB (hiện thực ~0.4–8MB) |
| C-6 | index.html ở GỐC archive; tên file/thư mục Latin | `unzip -l` list; regex `^[A-Za-z0-9._/-]+$` từng entry (0 dấu, 0 space, 0 unicode) | index.html tại `/` + 100% entry khớp regex |

### Nhóm C — Mobile ⭐(boss soi d: full-screen + 0 WebGL notice)
| ID | Req | Cách kiểm chứng | PASS khi |
|---|---|---|---|
| C-7 | Full-screen khi gameplay/startup | Chrome DevTools device mode 9:16 + iOS Safari thật: canvas phủ toàn viewport, 0 letterbox sai (FIT cho phép letterbox khi aspect khác — hợp lệ vì "visual không biến dạng"); bắt đầu từ L1 không cần nút nào ngoài touch | canvas chiếm 100% viewport khả dụng, 0 scrollbar |
| C-8 | Keyboard tự hiện khi click ô input | game KHÔNG có ô text input (chỉ touch) → req này N/A, ghi lý do trong bệnh án | N/A (documented) |
| C-9 | Orientation/resize: visual không biến dạng + tiến trình LƯU khi xoay thiết bị ⭐(boss soi a) | 3 bước trên Chrome mobile thật: (1) cắt L1 đạt 2★ → (2) xoay portrait↔landscape → (3) nhìn lại: % + sao + unlocked giữ nguyên, nửa hình/layout FIT mới không méo. Kiểm kỹ: slice state/score/unlocked level — schema DATA-MODEL §2 ghi ngay sau cắt + orientationchange listener | sao/unlocked không tụt; canvas không biến dạng |
| C-10 | Gesture hoàn toàn (bổ trợ accelerometer) | chơi L1→L3 chỉ bằng touch: trace + retry + next — 0 nút yêu cầu hardware khác | gesture đủ toàn bộ |
| C-11 | KHÔNG system player ở mọi browser ⭐(boss soi b) | game 100% WebAudio synth (không `<audio>`/`<video>` element — grep index.html + bundle) + 0 MIME video; test Chrome/Firefox/Safari: không player bar/overlay nào xuất hiện | 0 element media + 0 player UI |
| C-12 | KHÔNG thông báo WebGL khi mở game | `Phaser.AUTO` rơi CANVAS renderer khi thiếu WebGL — proto đã AUTO; mở trên VM/tiết bị không GPU (SwiftShader off) → 0 banner/alert lỗi WebGL; console 0 error WebGL | 0 notice, game vẫn boot (CANVAS fallback) |

### Nhóm D — Desktop
| ID | Req | Cách kiểm chứng | PASS khi |
|---|---|---|---|
| C-13 | Active field sát mép vùng khả dụng; aspect ≤1:2 | window 9:16 → canvas full; window 16:9 → FIT letterbox 2 bên (field = viewport height, aspect 9:16 ≤1:2 — đúng); screenshot đo canvas vs viewport | aspect luôn 9:16 ≤1:2 + canvas chiếm chiều cao đủ + 0 méo |
| C-14 | Resize không biến dạng | kéo window 5 cỡ (1024×768, 1920×1080, 720×1280, 800×1280, 3840×2160) → game vẫn FIT, 0 kéo giãn | không méo ở mọi cỡ |
| C-15 | Điều khiển mặc định bàn phím/phím chuột ⭐(boss soi c) | chuột: giữ trái kéo = trace (cùng verb touch); phím: Enter/Space confirm popup + retry, Esc đóng popup; arrow keys chọn nút End | chơi trọn L1→L12 bằng chuột-only; popup thao tác được keyboard-only |
| C-16 | KHÔNG system player | như C-11 trên desktop Chrome/Firefox | 0 player UI |
| C-17 | Không vượt biên / cut-off phần tử | screenshot 4 cỡ window: HUD, %, nút — 0 phần tử tràn khung, 0 chữ cắt | 0 cut-off |
| C-18 | KHÔNG scrollbar hệ thống trang | `document.documentElement.scrollHeight <= innerHeight` mọi cỡ + CSS overflow:hidden giữ nguyên | 0 scrollbar DOM |
| C-19 | Phần tử/text không đè nhau; mọi popup có X/nút đóng ⭐(boss soi c) | vision-soi screenshot từng màn (Trace/HUD/End/popup retry): 0 chồng lấn; mỗi popup đúng 1 nút đóng rõ (btn-close testid) | 0 đè + 100% popup có đóng |
| C-20 | Chơi được MỘT TAY, main scene không scroll/swipe thêm ⭐(boss soi c) | 1 tay chuột / 1 ngón cái: toàn bộ quyết định trong viewport hiện tại (path y 260–820 trong 720×1280 — nút retry/next trong thumb-reach); 0 yêu cầu scroll trang | trọn run L1→L2 one-hand không scroll |

### Nhóm E — Ổn định
| ID | Req | Cách kiểm chứng | PASS khi |
|---|---|---|---|
| C-21 | Không crash/freeze: xoay màn hình | như C-9 + stress 10 lần xoay liên tiếp trong lúc vẽ → 0 exception console, phase về safe (pointerup) | 0 crash |
| C-22 | Long-press field | giữ tay 3s giữa path không nhả → không treo, không menu context (contextmenu preventDefault), nhả ra vẫn score đúng | 0 treo |
| C-23 | Gesture/swipe | swipe nhanh ngoài path → begin()=false, không crash; swipe trong path = trace bình thường | 0 crash |
| C-24 | Minimize browser | minimize 5s → resume: AudioContext resume, save gọi qua visibilitychange, ván đang cắt retry được | 0 mất tiến trình đã ghi |
| C-25 | Mở ad, quay lại từ history | (chỉ SDK-callable khi có ad slot — stage 2 KHÔNG có ads; kiểm qua back/forward cache: bfcache restore → game re-init 0 double-canvas, 0 double listener) | resume sạch |
| C-26 | Các tương tác khác (multi-touch, dbl-tap zoom) | 2 ngón chạm cùng lúc → engine bỏ pointer thứ 2 (proto có sẵn); dbl-tap không zoom (meta viewport maximum-scale=1 giữ nguyên) | 0 crash/zoom |

### Nhóm F — Tương thích
| ID | Req | Cách kiểm chứng | PASS khi |
|---|---|---|---|
| C-27 | 5 browsers / OS matrix | chạy được boot + L1 cắt + save/load trên: Chrome, Firefox, Safari (nếu thiết bị có), Edge, Opera; OS: 1 Windows + 1 macOS + 1 Android ≥5 + iOS ≥9 (thiết bị sẵn có — ghi nhận giới hạn thật vào bệnh án, không bịa PASS ảo) | mỗi browser 1 bằng chứng screenshot/log |

## Tổng kết gate nộp (S6)
- 27 mục: PASS từng mục riêng + bằng chứng (screenshot/log/du/grep) — 1 mục N/A có lý do (C-8).
- Verdict trích cổng: `verify_game.sh M8-SliceStudio 5/5 + tierA 22/22 + tsc 0 + compliance C-1..C-27 — PB-3 + PB-3b`.
- KHÔNG nộp khi còn 1 mục đỏ — án lệ M3 (clone) + M1 (chiều sâu) đã dạy: verify kỹ thuật xanh chưa đủ.

## Ghi chú QA (giới hạn trung thực)
- Thiết bị/vùng sẵn có của container quyết định phạm vi C-27 — thiếu thiết bị nào ghi rõ "chưa kiểm" KHÔNG tick.
- C-12 tránh "test xanh ảo": tắt cả SwiftShader, phải thấy CANVAS fallback hoạt động thật.
- Tất cả bằng chứng lưu `/data/agents/qa-engineer/outbox/<card>/` theo §8.1.
