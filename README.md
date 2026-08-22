# YouTube Playables Games

Business: làm **casual HTML5 game** đưa lên [YouTube Playables](https://www.youtube.com/playables) ("Chơi game trên YouTube" — chơi ngay trên app YouTube, không cần tải).

- **Mục tiêu**: dựng **factory pipeline** (Python + AI-gen asset) tạo nhanh nhiều hyper-casual game, xuất bản sớm lên Playables để xây player-base, chờ **IAP bật (cuối 2026 → 2027)** thành dòng doanh thu recurring.
- **Kênh tiền hiện tại**: ads do YouTube tự đặt qua SDK (pre-roll / interstitial / rewarded) — chia doanh thu qua **pilot publisher** (vd Mediacube). Game KHÔNG tự nhét ads/IAP.
- **Thị trường**: 2,7 tỷ user YouTube; shelf Playables đang cho game "2–4 tỷ lượt chơi" (Doge Rescue, Airplane Manager, Craft Valley...). Window đầu tiên, cạnh tranh mỏng.
- **Stack**: pipeline = **Python 3.11+** (CLI: sinh asset AI, scaffold code, validate, đóng gói). Game output = **Phaser 3 (JS/WebGL)**. Sinh asset = **AI-Box/WAN** (+ LoRA cho style nhất quán).
- **Định hướng 2027 (năm của agents)**: agent orchestrate toàn bộ quy trình làm game → tối thiểu can thiệp tay.

## Cấu trúc thư mục
```
/data/youtube-playables/
├── README.md            ← bạn đang đọc
├── docs/                ← research, ghi chú nền tảng
└── M1-Rescue-Dodge/     ← module MVP đầu tiên (game mẫu)
    ├── SPEC.md          ← spec chức năng module M1
    ├── DESIGN-SPEC.md   ← visual spec (màu, layout, component, animation) — anh manual review trước code
    ├── DATA-MODEL.md    ← cấu trúc dữ liệu/asset pipeline
    ├── TEST-CASES.md    ← dev test (trước deploy)
    └── E2E-TESTS.md     ← Hermes QA (sau khi chạy thật)
```

## Danh sách module (cuốn chiếu)
| Module | Mô tả |
|--------|-------|
| M1 | **Rescue/Dodge MVP** — "Cứu Mèo tránh ong", 1-touch, làm chín end-to-end để test thuật toán Playables + pipeline |
| M2 | (sau M1) Tổng quát pipeline factory: scaffold template, sinh asset hàng loạt, validate tự động |
| M3+ | (sau) metadata/publish automation, đa game, đa publisher |

> Quy tắc: mỗi module mới = số kế tiếp ở cuối chuỗi, không chèn giữa. Business này đang ở M1.

## Research nền tảng (cập nhật 22/08/2026)
- Monetize: `requirements_monetization` — game CẤM tự monetize/ads/IAP; dùng YouTube SDK. Revenue-sharing đang **pilot** với publisher chọn lọc (Mediacube từ 4/2026, ghi nhận 10x doanh thu 5→6/2026, tự công bố).
- Giới hạn kỹ thuật: initial bundle < 30MB (nên < 5MB), file lẻ < 30MB (nên < 512KB), total < 250MB, load < 5s, save < 3MB; **cấm nén + cấm gọi mạng ngoài**; responsive mọi aspect ratio; obey pause/mute; target 13+.
- Metadata: title ≤ 50 ký tự, short desc ≤ 150 ký tự, thumbnail 1:1/5:7/16:9, preview video 16:9, publisher + 1–2 genre, KHÔNG branding trong thumbnail.
- Engine hỗ trợ: Phaser 3, Cocos2d, Construct, Unity(WebGL), Framer.
- Chia sẻ doanh thu Premium: gói Premium Lite (VN 49k/th) đã trừ ads trên nhiều game; dev hưởng 60% quỹ Premium Lite / 30% Premium → 55% long-form / 45% Shorts.