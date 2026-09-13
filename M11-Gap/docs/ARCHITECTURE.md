# M11 — Paper Crease · ARCHITECTURE + ADR

> Người bảo trì DUY NHẤT: **Hermes** (cập nhật §trạng thái sau mỗi batch, thêm ADR khi có quyết định kiến trúc).
> Người duyệt: **anh Tuyền** (đổi stack/hướng sản phẩm/module mới). Agent code: **CHỈ ĐỌC, CẤM SỬA** file này và mọi file trong `docs/`, `specs/`.
> Cập nhật: 2026-09-13 · Trạng thái: SPEC xong, CHƯA có dòng code.

## 1. Bậc kiến trúc đã chọn
**BẬC 1 — capability core + adapters** (theo thang `spec-authoring` §BƯỚC 0).
Lý do: 1 capability lớn (puzzle gấp giấy) nhưng có **biến thiên đã biết**: ≥3 nền tảng (standalone/playgama/ytgame), ≥2 loại thao tác tạo đề (đục lỗ / cắt góc), ≥3 kiểu gấp, 8 theme chương. Bậc 1 đủ và KHÔNG bọc mù (cấm over-engineer).

## 2. Thành phần & luồng dữ liệu
```
seed(levelIndex) ──► logic/generator ──► LevelSpec (dữ liệu màn, KHÔNG persist)
                                          │
                    logic/foldRules ◄─────┤  (bảng tra: kiểu gấp/cắt)
                                          ▼
                                    logic/levelState  (máy trạng thái màn: ready→answered→correct/wrong→next)
                                          │
        render/ (Phaser scene mỏng) ◄─────┘
                                          │
                    ui/theme ◄────────────┘
                                          ▼
                  platform/ (interface Storage·Ads·Lifecycle)
                     ├─ standaloneAdapter (Null Object: không ad, localStorage)
                     ├─ playgamaAdapter
                     └─ ytgameAdapter
```
Luồng dữ liệu: **không có mạng**. Save + log chỉ đi qua `platform.storage`.

## 3. Ràng buộc cứng (chặn spec hứa bất khả thi)
| Ràng buộc | Hệ quả lên thiết kế |
|---|---|
| Playables/Playgama cấm call mạng ngoài | Đề sinh **offline bằng seed** = hash(gameId+levelIndex); "cùng màn = cùng đề" bằng công thức, không server |
| Chỉ dùng SDK ad | Ads đi qua 1 interface; standalone = Null Object |
| Save <3MB (thực tế ≤100KB), bundle <5MB, load <5s | Không nhúng font; asset nén WebP; đề không persist |
| Responsive 9:16→32:9, không khoá orientation | Playfield cột 720px mobile-first + letterbox/pillarbox |
| Target 13+, tôn trọng pause/mute | Lifecycle adapter + nút mute riêng |

## 4. Điểm cắm cho biến thiên ĐÃ BIẾT (không bọc mù)
1. **Nền tảng** → Strategy `platform` (3 cài đặt + Null).
2. **Kiểu gấp / kiểu cắt** → **bảng tra dữ liệu** (`config/chapters.json` + registry rule). Thêm kiểu mới = thêm 1 dòng, KHÔNG sửa chuỗi if.
3. **Theme giấy theo chương** → dữ liệu (`config/`), không hardcode trong scene.
4. **Luật sao / kinh tế Mực** → dữ liệu (`config/stars.json`, `skins.json`).
5. **Ngôn ngữ** → lớp i18n (điểm cắm sẵn, bản nộp chỉ EN — PC-19).

## 5. ADR
| # | Quyết định | Lý do | Trạng thái |
|---|---|---|---|
| ADR-01 | Logic thuần TS, **0 import Phaser/DOM/SDK** | test lõi chạy không cần browser; đổi render không phá luật | chốt |
| ADR-02 | Đề sinh từ **seed**, không lưu đề | luật cấm mạng + save nhỏ; tái lập được cho test | chốt |
| ADR-03 | Toán gấp dùng **số hữu tỉ trên lưới nguyên** (mẫu số = 2^n), không dùng số thực | gốc lỗi cũ: float sai ở giao nếp; cần so khớp CHÍNH XÁC để biết 2 lỗ trùng khít | chốt (port từ `game-gap-giay/code/g01_fold_sim.py`) |
| ADR-04 | Đáp án đúng sinh từ **trạng thái đã mở** rồi mới tạo 3 ô nhiễu | đề luôn có đáp án đúng (PC-03) + không xáo ngẫu nhiên (bài học M2) | chốt |
| ADR-05 | Dùng `@game/sdk` cho storage/ads, `@game/core` cho UI chrome | không viết lại thứ factory đã có; đổi nền tảng chỉ đổi adapter | chốt |
| ADR-06 | Multi-platform build theo vite như `g4-neon-grid` | 1 source → standalone/playgama/ytgame | chốt |
| ADR-07 | Nguồn gameplay cũ `game-gap-giay/` **đóng băng** (chỉ đọc) | tránh 2 bản luật lệch nhau; MVP đã được duyệt nên giữ nguyên hành vi, chỉ port | chốt |

## 6. 6 tháng nữa thêm 3-5 tính năng thì sao?
Thêm chương/skin/ngôn ngữ/kênh thứ 3 ⇒ mỗi thứ = **thêm file dữ liệu hoặc 1 adapter mới**, không sửa lõi.
Thước đo: nếu một tính năng mới phải sửa **>3 file cũ** ⇒ dừng lại, sửa kiến trúc trước khi code tiếp.

## 7. Pattern bắt buộc (mức khung) — chi tiết theo file ở `STRUCTURE.md`
Strategy (platform) · Registry/bảng tra (fold rules, themes, skins) · Null Object (SDK standalone) · Factory + Seed (generator) · State machine (levelState).

## 8. Trạng thái
| Mốc | Trạng thái |
|---|---|
| T0 catalog check | ✅ xong (GO) — `specs/1-paper-crease/CATALOG-CHECK.md` |
| Retention design (P1-P4) | ✅ xong, chờ gộp vào SPEC (đã gộp) |
| SPEC 5 file | ✅ SPEC + DESIGN-SPEC + DATA-MODEL + TEST-CASES + E2E (chờ anh duyệt) |
| ARCHITECTURE + STRUCTURE | ✅ file này + `STRUCTURE.md` |
| Code batch 1 | ⏳ chưa bắt đầu (chờ anh duyệt SPEC) |
| T2 sim / T3 juice / T4 art / T5 pre-submit | ⏳ chưa |
