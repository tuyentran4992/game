# M11 — CATALOG-CHECK (T0, chốt trước khi viết SPEC/code)

> Luật: **≥3 bản cùng mechanic trên 1 kênh đích ⇒ KILL/đổi mechanic.** Chốt TRƯỚC khi chạy.
> Ngày chạy: 2026-09-13 · Người chạy: swarm 5 agent (sóng 1) + parent kiểm cấp catalog (V0).

## 1. Kết quả trên 4 kênh đích — 0 bản cùng mechanic

| Kênh | Cách kiểm (parent tự chạy) | Phạm vi | Bản cùng mechanic |
|---|---|---|---|
| Playgama | `sitemap.xml` → 4 sitemap game, grep slug | **89.802 URL** (≈11.000 game × 8 ngôn ngữ) | **0** |
| CrazyGames | `robots.txt` → `sitemap-index.xml` → sitemap EN | **5.099 URL / 4.399 game** | **0** |
| YouTube Playables | browser thật quét catalog A-Z (wheel CDP) | **1.563 tên game** | **0** (nghi phạm `Unfoldings` = interactive short "paper creature shifts between animal forms" ⇒ khác mechanic) |
| Reddit / Devvit | r/GamesOnReddit (sau khi đổi UA Chrome desktop: 403→200) + search Reddit | 53 post + 2 truy vấn | **0** (`devvit.com` không resolve DNS từ container — ghi rõ là chưa phủ hết) |

⇒ **Verdict: GO** (không kênh nào chạm ngưỡng ≥3). Anh Tuyền chốt GO ngày 13/09/2026.

## 2. Ngoài 4 kênh — 11 bản cùng mechanic ⇒ khác biệt hoá là BẮT BUỘC
`Daily Unfold` (web+iOS) · `Holepunch.fun` · `Unfoldit` (iOS+GP, 2017, 1.885 level) · `FOLD & PUNCH` (Google Play) · `Fold Trace` (GP) · `Paper Punch Party` · `Paper Folding` (itch.io HTML5) · `Paper Folding Puzzle` (lizecheng.net) · `CognitiveTrain Paper Folding Test` · `Hole Punchler` · `Unfold` (Puzzle Cottage).
Trong đó **2 bản dùng đúng format "chọn 1 trong 4 hình"** (lizecheng.net, CognitiveTrain) ⇒ không thể thắng bằng format; thắng bằng **D1 animate từng lớp + giải thích**, **D2 chuỗi chương**, **D3 phiên có nhịp/kỷ lục** (xem SPEC §1.2).

## 3. Tên
- **Chốt: `Paper Crease`** (anh Tuyền chốt 13/09) — còn trống trên cả Playgama + CrazyGames (đã grep `crease` = 0 khớp).
- Đã bị chiếm, KHÔNG dùng: `Unfold It` (≈ app `Unfoldit`) · `Fold & Punch` (app Google Play `com.aipopcorn.game.foldandpunch`, đăng 09/07/2026) · `Paper Punch` (≈ `Paper Punch Party`).
- **NỢ:** còn phải check `Paper Crease` trên **App Store + Google Play** trước khi nộp (bước T5 pre-submit).

## 4. Bằng chứng (đường dẫn)
- `../t0/VERIFY-PARENT.md` — cách làm + số đếm tái lập được (sitemap sweep, wheel-scroll, sửa UA Reddit).
- `../t0/playables_all_titles.json` — 1.563 tên game Playables.
- `../t0/R1..R5.json/md` — 5 route của swarm (search nội bộ · duyệt danh mục · Google site: + tên · KILLER có quota · thị trường ngoài) — 5/5 PASS cổng kiểm.
- `../retention/` — 4 file thiết kế giữ chân (số neo + nguồn).
