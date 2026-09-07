# TEST-FIELDS — Skip King (M7-SkipKing/game) · card t_90fcf0b4 (T5)

QA bấm/soi bằng testid gắn qua `setData('testid', ...)` trong scene (canvas QA bấm qua
`window.__game`, canvas có attribute `data-testid="game-canvas"`).

## Danh mục 10 testid (nguyên văn CONTRACT mục 4)

| testid | Đối tượng / cách đọc | Ý nghĩa | Visible khi nào |
|---|---|---|---|
| `game-canvas` | `<canvas>` trong `#game-container` — `document.querySelector('[data-testid="game-canvas"]')` | Canvas Phaser (720×1280 portrait — PB-5). Gắn attribute sau boot (main.ts polling). | Luôn (sau khi game boot xong) |
| `hud-score` | Text trong PlayScene — `children.list.find(o => o.getData('testid') === 'hud-score')` | Điểm phiên CỘNG DỒN qua các run (tầng A RunLifecycle — nguồn duy nhất). | Luôn trong scene chơi |
| `hud-skips` | Text, đọc như trên với `'hud-skips'` | Tổng số nảy (skips) phiên. | Luôn trong scene chơi |
| `hud-best` | Text, đọc như trên với `'hud-best'` | Best bền (localStorage `sk_best` qua runLifecycle — fallback memory khi localStorage fail). | Luôn trong scene chơi |
| `aim-gauge` | Graphics — đọc như trên với `'aim-gauge'` | Gauge lực khi kéo (độ dài aim line tỉ lệ lực, kèm vùng PERFECT). | Chỉ khi ĐANG KÉO (pointerdown → onAim); ẩn khi thả |
| `stone` | Image — đọc như trên với `'stone'` | Viên đá. Idle giữa các run ở gốc waterline; bay theo sim khi run chạy. | Luôn (idle ↔ bay) |
| `waterline` | Rectangle — đọc như trên với `'waterline'` | Marker chân trời nước (y horizon — QA soi vị trí đá biến mất). | Luôn |
| `combo-banner` | 2 dòng Text — đọc như trên với `'combo-banner'` (cả 2 dòng cùng testid) | Banner 2 dòng "PERFECT FLICK!" + "×2" khi cú thả trúng window PERFECT (tầng A judge). | Flash khi PERFECT (~650ms hold + ~900ms fade), rồi tự ẩn |
| `demo-banner` | 2 dòng Text — đọc như trên với `'demo-banner'` (cả 2 dòng cùng testid) | Banner beat demo B0/B4 + note (SWEET/SOUND OFF). | CHỈ lần đầu session (chưa có `sk_done`); ẩn hẳn sau demo / skip |
| `end-card` | 6 objects: overlay + 4 Text + nền nút — đọc như trên với `'end-card'` (cùng testid) | Overlay cuối run: headline "N BOUNCES" / "SPLASH!" (0 nảy), stat "0 BOUNCES" (khi SPLASH), dòng gap best, nút "THROW AGAIN" ≥44px nửa dưới màn. | CHỈ stage local (không bao giờ ở demo — Đ3). Hiện khi run kết thúc; ẨN NGAY khi thả cú mới (THROW AGAIN) |

## Cách đọc nhanh từ console (window.__game)

```js
// Mọi field — pattern chung (PlayScene / OnboardingPlayScene):
__game.scene.getScene('OnboardingPlayScene').children.list.find(o => o.getData && o.getData('testid') === 'end-card')
// Bảng trạng thái EndCard qua mirror:
__game.scene.getScene('OnboardingPlayScene').getEndCardForTest() // .shown / .headlineText / .buttonText / .buttonMinSidePx / .buttonCenterY
```

## Kịch bản QA cần (deterministic — end-card T5)

1. **0 nảy → SPLASH!**: boot với `sk_done` sẵn (thẳng stage local) → cú 1 bất kỳ (được assist Đ2) →
   sau khi run xong, cú kế **power 0** → 0 nảy. Card hiện: headline `SPLASH!`, stat `0 BOUNCES`,
   gap `N AWAY FROM BEST N` (best = score phiên). KHÔNG có chữ FAILED.
2. **NEW BEST! (was M)**: run có điểm > best hiện tại → dòng gap `NEW BEST! (was M)` màu mint,
   `sk_best` lưu đúng điểm run (runLifecycle là chủ storage). HUD `hud-best` cập nhật theo.
3. **K AWAY FROM BEST M**: run có điểm ≤ best → `K AWAY FROM BEST M` với K = M − điểm run.
4. **Edge lần đầu**: chưa từng có best (`sk_best` vắng/bằng 0) → card CHỈ "N BOUNCES", KHÔNG dòng gap.
5. **THROW AGAIN**: nút ≥44px (touchTargetPx), tâm nút nửa dưới màn (thumb reach). Nút nằm TRONG
   vùng chạm toàn màn pull-back: **kéo-thả từ nút = cú mới** (verb pull-back duy nhất — tap đơn
   không ném, anti-misfire `AIM.minDragPx`); card ẨN ngay khi cú mới vào engine.
6. **Demo KHÔNG end-card**: lần đầu session (xoá `sk_done`) → demo B1/B2 hụt chìm → KHÔNG card
   (demo = không gian an toàn — CONTRACT 3.1 Đ3); `sk_best` không bị demo ghi.
7. **Demo-once**: `sk_done` ghi ĐÚNG 1 LẦN mỗi đường kết thúc demo (hết 12s tự nhiên / skip-on-touch);
   lần 2 vào thẳng chơi (không demo, không auto-flick).

## Ghi chú

- Testid cũ KHÔNG đổi/xoá (N3): 9 testid T1–T4 giữ nguyên — diff T5 chỉ thêm `end-card`.
- Mirror EndCard (`getEndCardForTest`) là surface đọc dùng chung — không lộ logic mới.
- Text in-game 100% EN (PB-5): wording sống trong `MECHANICS.endCard` (nguồn duy nhất).

## Bổ sung BUG-GOM-02 (t_077be174 — demo không ghi sk_best)

Mirror mới (đọc như `getEndCardForTest`):

- `OnboardingPlayScene.demoHandoffForTest()` → `{ pendingFlicks, handoffPending, demoRunFlying }` —
  trạng thái trao tay demo→local. Sau flip xong: `handoffPending=false`, `pendingFlicks=0`.
- `EndCard.gapTextForTest()` → dòng gap nguyên văn ('' khi edge lần đầu — scenario 4).

Hành vi mới QA cần biết (deferred handoff):

- Skip-on-touch KHI run demo đang bay → run demo được chốt Ở STAGE DEMO trước (không ghi
  `sk_best`), local trao tay frame kế — `sk_done` vẫn ghi ĐÚNG 1 LẦN, chỉ LÙI vài frame.
- Cú demo còn chờ trong hàng đợi lúc thoát demo bị XẢ SẠCH — không bao giờ được thả ở local.
- Kịch bản 6 kiểm chứng mở rộng: cả đường hết 12s tự nhiên (B3 nổ t=8, slow-mo) lẫn đường
  skip — `sk_best` phải giữ nguyên giá trị trước demo.
