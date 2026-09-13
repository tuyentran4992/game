# V0 — KIỂM CẤP CATALOG DO PARENT TỰ CHẠY (13/09/2026, browser thật + sitemap)

> Vì sao có file này: 3 route của lô 1 đều báo `KHONG_KIEM_CHUNG_DUOC` cho catalog kênh đích
> (trang render JS / login-wall). Luật chốt trước tính theo KÊNH ĐÍCH, nên parent tự kiểm lại
> bằng browser + sitemap toàn catalog thay vì tin search index.

## Cách làm (tái lập được)
1. **Chrome CDP** bật lại trên VPS (`chrome --headless=new --remote-debugging-port=9222`), quét catalog
   YouTube Playables bằng wheel-scroll thật (JS `scrollTop` KHÔNG nhích, phải `Input.dispatchMouseEvent` wheel).
2. **Sitemap sweep** cho Playgama + CrazyGames: tải toàn bộ sitemap rồi grep slug.
3. Lưu danh sách tên Playables vào `t0/playables_all_titles.json`.

## Số thật (đếm bằng lệnh)
| Kênh | Phạm vi kiểm | Kết quả khớp mechanic |
|---|---|---|
| Playgama | **89.802 URL** sitemap (≈11.000 game × 8 ngôn ngữ) | **0** (chỉ có punch-game/paper-doll/paper.io/folding-car) |
| CrazyGames | **5.099 URL** sitemap EN, trong đó **4.399 URL /game/** | **0** (paper.io, paper airplane, Chigiri xé giấy, Unfold Escape Room) |
| YouTube Playables | **1.563 tên game** lấy từ catalog A-Z bằng browser | **0** — nghi phạm duy nhất `Unfoldings` kiểm metadata: *"Poetic interactive short: a paper creature shifts between animal forms"* → KHÁC mechanic |
| Reddit Devvit | r/GamesOnReddit (subreddit game chính thức) 53 tiêu đề + 2 truy vấn search Reddit | **0** sau khi sửa UA (xem mục "Sửa UA Reddit" bên dưới) |

## Verdict theo luật chốt trước (≥3 bản cùng mechanic/kênh = KILL)
- 3/4 kênh đích: **0 bản** ⇒ dưới ngưỡng ⇒ **GO trên 3 kênh này**.
- Devvit: chưa kiểm ⇒ nếu chọn Devvit làm kênh nộp thì phải kiểm trước (nhờ anh mở trên máy anh 20 giây, vì IP nhà không bị chặn).

## Đối chiếu thị trường ngoài (từ lô 1, CHƯA verify độc lập)
6-9 bản mức-3: `Daily Unfold` (web+iOS), `Holepunch.fun`, `Unfoldit` (iOS+GP, 2017), `FOLD & PUNCH` (Google Play),
`Paper Folding` (zfalomir, itch HTML5), `Paper Folding Puzzle` (lizecheng.net — **đúng format chọn 1 trong 4**),
`CognitiveTrain Paper Folding Test` (**đúng format chọn 1 trong 4**, bài test nhận thức), `Fold Trace` (GP), `Paper Punch Party`.
⇒ mechanic KHÔNG nguyên bản; khác biệt hoá phải nằm ở CẢM GIÁC CHƠI (mở từng lớp có animation + giải thích vì sao sai + chuỗi level tăng độ khó),
không thể chỉ dựa vào "quiz 1 trong 4 hình" vì format đó đã có trên web.

## Tên (tra trên 2 sitemap vừa tải)
- CÒN TRỐNG trên Playgama + CrazyGames: `crease`, `paper crease`, `paper punch`, `hole punch`, `fold and punch`, `origami`, `kirigami`, `paperfold`, `GẤP`.
- ĐÃ DÙNG (bên ngoài): `Unfold It` ≈ `Unfoldit` (App Store + Google Play) · `Fold & Punch` = app Google Play `com.aipopcorn.game.foldandpunch` · `Paper Punch` ≈ `Paper Punch Party`.
- Trên 2 kênh: `unfold-escape-room-puzzle` (khác verb) · `fill-the-gap` (khác hẳn).

## Sửa UA Reddit (13/09/2026, anh Tuyền nhắc: "Reddit phải có User Agent thông dụng")
- `curl` và browser headless MẶC ĐỊNH (UA `HeadlessChrome/...`) bị Reddit trả **403 "blocked by network security"** từ IP datacenter.
- Đổi sang UA Chrome desktop thật:
  `curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36" https://www.reddit.com/games/` → **200**;
  browser thì `cdp('Network.setUserAgentOverride', userAgent=<UA đó>, platform='Win32')` → trang render bình thường.
- Kết quả sau khi sửa: `r/GamesOnReddit` (53 tiêu đề) **không có** game gấp/giấy/đục lỗ; search Reddit `fold paper puzzle game devvit` và `punched holes unfold game` cho ra bài **post của dev** (Foldology, Folded, "paper-folding puzzle", Holepunch) — tức mechanic có ngoài kênh nhưng **không phải game Devvit host trên Reddit**.
- `devvit.com`: **không resolve được DNS từ container này** (getent hosts rỗng) ⇒ không kiểm được bằng đường đó, dùng r/GamesOnReddit thay thế.
- Lưu ý khi quét UI Reddit: selector lấy tiêu đề phải dùng `a[slot="full-post-link"]` (Shreddit) — `a[href*="/comments/"]` trả về số comment (rác).
