# M10 Banh Mi Master — E2E-TESTS (Hermes QA, SAU build)
> ⚠️ **LỆNH BOSS 09/09: KHÔNG BROWSER TEST — test bằng code thôi (vitest GC/TB + sim harness là gate chính).** File này giữ lại làm **checklist QA THỦ CÔNG NHẸ khi anh Tuyền chơi preview Netlify** (fun gate PB-2) — KHÔNG phải gate tự động, KHÔNG chặn pipeline.
> Nguồn: SPEC §2/§7 + DESIGN-SPEC §2/§4/§6.

## 0. Quy ước chạy
- Serve build: `cd game && pnpm build && cd dist && python3 -m http.server 8044` → device emulation **9:16** (mobile-first).
- Canvas Phaser → tap synthetic không ổn định; ưu tiên **vision + thao tác người thật**; cần chính xác dùng `debug-seed` (`?debug=1&seed=7`).
- Evidence: `artifacts/e2e/<DATE>/<TEST_ID>_<step>.png`. Reset localStorage trước mỗi nhóm.
- Ngưỡng fail chung: load >5s, uncaught JS, black screen, UI cắt, sai màu token, chữ không đọc được.

## 1. FUNCTIONAL (E2E-nn)
| ID | Flow | Expected | Evidence |
|---|---|---|---|
| E2E-01 | Cold boot 9:16 | Title: logo gỗ + bánh mì hero + PLAY + best tips; 0 lỗi console | 01_title.png |
| E2E-02 | PLAY | khách #1 đi bộ vào 600ms, bong bóng pop, FLASH đếm 6s | 02_flash.png |
| E2E-03 | Trong FLASH #1 | từng layer highlight 0.8s + ô khay tương ứng sáng; UI dưới mờ 20% nhưng khay đọc được | 03_tutorial.png |
| E2E-04 | FLASH tắt | bong bóng co thành ghost bubble mờ góc HUD (không đọc được nội dung); patience arc bắt đầu tụt | 04_ghost.png |
| E2E-05 | Tap 2 ô đúng order | 2 layer bay lên stack snap + squash; stack-layer-0/1 đúng id | 05_stack.png |
| E2E-06 | UNDO | layer trên cùng biến mất, không phạt | 06_undo.png |
| E2E-07 | SERVE khớp 100% | nắp úp → cross-section reveal ✅✅ xanh → 3 sao bay + coin arc về 💰 + khách cười đi ra | 07_serve3sao.png |
| E2E-08 | SERVE lệch 1 layer (seed debug) | ❌ đỏ đúng vị trí layer sai, rung; 2 sao | 08_2sao.png |
| E2E-09 | SERVE bừa <40% | 0 sao, khách giận 💢, strike tối 1 ô, shake + vignette đỏ | 09_strike.png |
| E2E-10 | Để patience về 0 (không serve) | walkout: strike+1, khách đi ra giận, khách kế vào sau ~1s | 10_walkout.png |
| E2E-11 | 3 strike | LOSE "STALL CLOSED" + stats + THỬ LẠI (+ nút rewarded nếu chưa dùng) | 11_lose.png |
| E2E-12 | HINT (mock rewarded) | FLASH lại đúng 1.5s; badge hint giảm 1; quá 3 lần/ca → nút disabled | 12_hint.png |
| E2E-13 | Khách #7 WAIT! | sau flash tắt 2.5s: bong bóng hiện lại 1.5s, đúng 1 icon đổi nhấp nháy vàng; patience đứng yên trong replay | 13_wait.png |
| E2E-14 | Interstitial | sau serve khách #4 → mock interstitial đúng 1 lần/ca | 14_ad.png |
| E2E-15 | WIN hết 8 khách | overlay hạng + sao + tips + FAST count + CHƠI LẠI; best tips localStorage cập nhật | 15_win.png |
| E2E-16 | CHƠI LẠI | ca mới, seed mới, HUD reset, strike reset | 16_replay.png |

## 2. VISUAL/ART GATE (vision — chuẩn DESIGN-SYSTEM §4.5, 5 câu soi như khách khó tính)
| ID | Check | Expected |
|---|---|---|
| V-01 | Screenshot full ca chơi | art đồng nhất style candy volumetric; không sprite lạc tông; viền 3px tách lớp rõ |
| V-02 | Zoom khay 4×3 | 12 icon phân biệt được ở 150px; tên EN không tràn ô; contrast ≥4.5:1 trên nền gỗ |
| V-03 | Zoom bong bóng order | stack mini đọc được thứ tự dưới→trên trong 1s (thumbnail-first: nhìn là hiểu ngay) |
| V-04 | Nền phố + 8 persona | khách Việt đa dạng, không khuôn mặt lỗi AI (soi tay/ mắt/ răng); xe đẩy không méo |
| V-05 | Overlay WIN/LOSE | hạng S/A/B khung gỗ rõ; pháo giấy không che mất nút CHƠI LẠI |
| V-06 | Desktop 16:9 | pillarbox 2 bên, không stretch, HUD không trôi khỏi safe area |

## 3. USABILITY (nhóm "dễ dùng" — bắt buộc theo UX-trước-code)
| ID | Check | Expected |
|---|---|---|
| U-01 | Người mới (em đóng vai, không đọc help) | hiểu "order biến mất phải nhớ" trong ≤10s khách #1 |
| U-02 | Đếm số thao tác 1 khách | đúng: đọc (0 tap) + N tap layer + 1 SERVE — không tap thừa |
| U-03 | Chạm nhầm UNDO khi định SERVE | khoảng cách 2 nút ≥40px, không dính |
| U-04 | Pause nền tảng (tab ẩn) | patience dừng (bridge pause event) — quay lại không chết oan |
| U-05 | Mute nút hoạt động | obey ngay khi pause/mute (Playables req) |

## 4. PLATFORM COMPLIANCE (trước khi đóng gói nộp)
| ID | Check | Expected |
|---|---|---|
| P-01 | Bundle | dist < 5MB total, file lẻ < 512KB (trừ atlas được phép <5MB — Playables req) |
| P-02 | 0 mạng ngoài | không fetch/XHR ngoài bridge; grep http:// trong dist = chỉ bridge whitelist |
| P-03 | save < 3KB | localStorage/sdk.saveData payload nhỏ |
| P-04 | Metadata EN | title ≤50 · short desc ≤150 · how_to_play ≤150 · thumbnail 1:1/5:7/16:9 không branding |
| P-05 | Playgama bridge | `window.bridge` init trước mọi API call (buffer pattern M1); F1 audio-minimize: visibilitychange tại document (án lệ M8 C-24) |
