# M3v2 "Potion Panic" — E2E TESTS (Hermes QA, SAU deploy/build)

> UI/visual test do Hermes QA verify bằng Playwright/agent-browser + vision. Agent dev KHÔNG viết nhóm này.
> Nguồn: `SPEC.md` §3/§5 + `DESIGN-SPEC.md` §4/§8.

## 0. Quy ước chạy

- Serve bản build Playgama: `cd game && pnpm build:playgama && cd dist-playgama( hoặc dist) && python3 -m http.server 8043` → `http://localhost:8043/` (index.html gốc như zip nộp).
- Data-testid theo SPEC §5. Canvas Phaser → tap synthetic KHÔNG ổn định (pitfall): ưu tiên **vision + thao tác người thật trên device emulation 9:16**; cần chính xác thì dùng hook dev.
- Evidence: `artifacts/e2e/<DATE>/<TEST_ID>_<step>.png`. Reset localStorage trước mỗi nhóm (`localStorage.clear()`).
- Ngưỡng fail chung: loading >5s, uncaught JS, black screen, UI cắt, sai màu token.

## 1. FUNCTIONAL (E2E-<n>)

| ID | Flow | Expected | Evidence |
|---|---|---|---|
| E2E-01 | Cold boot 9:16 | Start screen đủ logo/nồi sủi/queue idle anim, 0 lỗi console | 01_start.png |
| E2E-02 | PLAY | vào Adventure map, stage 1 mở, 2-30 khóa mờ | 02_map.png |
| E2E-03 | Chọn stage 1 → gameplay | HUD goal-chip "Serve…/target", queue 3 rune, ghost orb theo pointer | 03_gameplay.png |
| E2E-04 | Đổi element rune, thả | orb đúng element rơi vào lòng cong nồi | 04_drop_fire/water/earth |
| E2E-05 | Ép 2 same-branch T1 chạm | merge → T2 + pop + sfx + điểm +6 | 05_merge.png |
| E2E-06 | Ép 2 khác nhánh chạm | KHÔNG merge, chỉ va chạm | 06_nomerge.png |
| E2E-07 | Nuôi T3 đứng yên ~35s | heat ring đầy → BREW: flash+shake+particle+“VOLCANIC +20” | 07_brew.png |
| E2E-08 | Brew cạnh ice | ice tan trong blast | 08_brew_ice.png |
| E2E-09 | Stir orb heat>60 | heat giảm ngay, charge −1 (chấm mờ) | 09_stir.png |
| E2E-10 | Volatile merge (2 orb ≥70) | điểm ×1.5, "VOLATILE" popup | 10_volatile.png |
| E2E-11 | Màn có order: fulfill | orb bay lên shelf, +30, tick goal | 11_order.png |
| E2E-12 | Đủ 3 T4 các nhánh | Stone fusion animation +150, 1 lần/màn | 12_stone.png |
| E2E-13 | Hết drops chưa đạt | Stage Failed + lý do + RETRY | 13_fail.png |
| E2E-14 | Đạt goal | Stage clear + sao rơi + reward powerup + NEXT | 14_clear.png |
| E2E-15 | Play sao lưu → thoát giữa màn → reload | unlock + stars còn nguyên (migration v3) | 15_save.png |
| E2E-16 | Endless mode: game over lần 1 | Continue (rewarded) ≤1; lần 2 interstitial rồi Retry | 16_endless.png |
| E2E-17 | Daily + leaderboard nút | mở đúng qua SDK/mock, không crash local | 17_daily.png |

## 2. USABILITY (gate CHẶN)

| ID | Check | Pass khi |
|---|---|---|
| UX-01 | ≤3 tap Start→thả orb đầu | đạt |
| UX-02 | Queue rune ≥96px, 1-thumb portrait | đo screenshot 390×844 |
| UX-03 | Heat đọc được trong 1s nhìn thử | pulse ≥85 rõ |
| UX-04 | Không gây chết oan: telegraph brew 70+ (màu+tick sfx) | có |
| UX-05 | Nút không underline artifact, không white-on-white (pitfall v1) | vision 0 lỗi |
| UX-06 | 30 màn scroll map mượt, sao dễ đọc | có |
| UX-07 | ** Ấn tượng clone:** người chưa đọc spec chơi 60s có gọi là "Suika"? | KHÔNG (nồi tròn + nguyên tố + heat) |

## 3. PLATFORM COMPLIANCE

| ID | Check | Expected |
|---|---|---|
| PCX-01 | Resize 9:16↔16:9↔1:1 giữa màn | giữ state, không reset, không cắt UI |
| PCX-02 | Mute nút + minimize tab | audio dừng tức thì (Playgama req) |
| PCX-03 | Ngôn ngữ | globe visible; mọi string EN thật (soi dist) |
| PCX-04 | Network panel | 0 request ngoài trừ bridge/SDK platform |
| PCX-05 | Console full session | 0 uncaught |
| PCX-06 | Game Ready event gửi (Playgama QA tool) | ✓ |
| PCX-07 | Chạy từ ZIP đã unzip (bản nộp) vào http.server | boot OK, đủ Play/Pause/Save |

## 4. Kết luận gate
Chỉ bấm Submit Playgama khi: **1 + 2 + 3 pass hết** + SPEC §9 Anti-Reject Checklist ☑ toàn bộ + đã nhắn support chat kèm video 30s gameplay (chờ confirm nếu họ trả lời).
