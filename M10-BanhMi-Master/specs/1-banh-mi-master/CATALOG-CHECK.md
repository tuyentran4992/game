# M10 Banh Mi Master — CATALOG-CHECK (PB-5 anti-clone, chạy TRƯỚC khi code — 09/09/2026)
> Method: `site:playgama.com` + `site:playables.games` + `site:poki.com` + `site:crazygames.com` theo mechanic, đếm BẢN CÙNG MECHANIC. Kênh soi clone gắt nhất = Playgama (án lệ M3 hard reject).
> Cơ chế cần bảo vệ: **flash-order memory + real-time food assembly + serve/scoring** ("The order disappears — cook from memory").

## A. ĐÃ SOI — KẾT QUẢ

### A1. Đồ ăn Việt (theme)
| Search | Kết quả | Đếm |
|---|---|---|
| `site:playgama.com banh mi` | 0 game (chỉ page linh tinh tiếng TR) | **0** |
| `site:playgama.com pho OR "vietnamese food" cooking` | 0 game Việt; chỉ Cooking Marina (chung chung) | **0** |
| `site:playables.games banh mi OR vietnamese OR pho OR "bubble tea"` | 0 kết quả | **0** |

### A2. Genre cooking-order (mechanic kề)
| Game | Order hiển thị thế nào | Cùng mechanic memory? |
|---|---|---|
| Papa's series (Pizzeria/Freezeria/…, Flipline — cả category Playgama) | order **ghi mãi trên ticket**, có trạm order riêng | ❌ không |
| Cooking Mania (Inlogic) | "See a burger with cheese and fries?" — **order hiện trên màn** khi nấu | ❌ |
| Cooking Chef / Cooking Restaurant (Rendered Ideas) | "follow the on-screen instructions" — chỉ dẫn hiện sẵn | ❌ |
| Cooking Dash (Spark) | click tools theo yêu cầu hiện sẵn | ❌ |
| Delicious Pizza | "Click an ingredient: Add it" theo đơn hiện sẵn | ❌ |
| Cozy Cafe | "Monitor customer orders" — orders hiển thị liên tục | ❌ |
| Doodle Boba / Bubble Tea DIY / Bubble Tea shakes (boba = 3 bản) | order/custom drink — hiện sẵn, không flash | ❌ |
| Cooking City (Playgama) | mô tả có chữ "Memorizing new recipes to improve" — nhưng là **học recipe qua progression**, KHÔNG phải order-flash-mất trong 1 lượt serve | ❌ (khác cơ chế) |
| Pizza Maker — Food Cooking (Playables) | recipe hiện sẵn | ❌ |

→ **Kết luận A2: ≥10 bản cooking-order trên 2 kênh, 0 bản có order biến mất.** Mọi game đều để đơn hàng trên màn = khác biệt cốt lõi của mình đứng vững.

### A3. Memory games thuần (mechanic kề 2)
| Game | Là gì | Cùng mechanic? |
|---|---|---|
| Sprunki Says: Repeat After Me | Simon-says sequence tap | ❌ không food/serve |
| Memorize and colorit (04/2026) | nhớ hình → tô màu lại, chấm % | ❌ turn-based brain trainer, không real-time serving |
| Remember the color | nhớ màu → chỉnh slider | ❌ |
| Repeat the Pattern of Mine's mobs | nhớ pixel grid → tô lại | ❌ |
| Mineblox — Guess the Recipe (CrazyGames) | "memory… piece together recipes" — đoán craft recipe khối vuông, không phải nấu/phục vụ khách | ❌ (kề xa nhất — ghi nhận, vẫn khác: không assembly stack, không patience, không serve) |
| Cooking Memory (Microsoft Store, 2014-era) | puzzle luyện trí nhớ chủ đề bếp, không có trên Playgama/Playables/Poki/CrazyGames = **không thuộc 2 kênh đích** | ❌ (ngoài kênh; lưu ý re-check nếu mở rộng kênh) |

→ **0 bản giao điểm "flash order + assemble + serve + patience".**

### A4. Burger-stack (verb kề 3)
| Game | Cơ chế | Cùng? |
|---|---|---|
| Quadraburgers | tap-drop vật lý, match ingredient, tower — **không order, không memory** | ❌ |
| Burger Tower (04/2026) | stack timing dead-center, 3-strike — reflex, không đơn hàng | ❌ |

## B. VERDICT PB-5
| Trục | Kết quả |
|---|---|
| Bản cùng mechanic trên Playgama | **0** |
| Bản cùng mechanic trên Playables | **0** |
| Bản kề gần nhất | Cooking City (chữ "memorizing" — nhưng là học recipe dài hạn, không flash-per-order) |
| Theme đồ ăn Việt | **0** trên mọi kênh — lá chắn văn hóa |
| Verdict | ✅ **PASS — được code.** Câu trình reviewer 10s: "Every cooking game shows you the order. This one takes it away — cook from memory." |

## C. ĐIỀU KIỆN KÈM (rút từ án lệ M3)
1. Khi nộp: mô tả + thumbnail PHẢI làm nổi memory-phase (bong bóng đang tan biến), không phải cảnh nấu chung chung — reviewer mắt thường 10s phải thấy khác cooking thường.
2. Trước ngày nộp thật: **re-check nhanh A2/A3** (catalog đổi hàng tuần — 3 game boba mới xuất hiện từ 08 đến 09).
3. Nếu kênh từ chối vì "giống cooking games": kháng nghị bằng bảng A2 (cột "order hiện mãi" vs mình "order biến mất").
