# TEST-FIELDS — Skip King (M7-SkipKing/game) · card t_90fcf0b4 (T5) + FUN2-C1 (t_22349993)

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
   (demo = không gian an toàn — CONTRACT 3.1 Đ3); `sk_best` không bị demo ghi — invariant áp
   ĐỦNG 3 thời điểm skip-on-touch: **(a)** trước cú demo đầu B1 (engine rảnh, skip t < 2s —
   flip ngay, director đóng băng ở local), **(b)** khi run demo đang bay (flip hoãn —
   `handoffPending`, run chốt ở stage demo rồi mới trao local), **(c)** giữa 2 run demo
   (engine rảnh cửa sổ ngắn — như (a)); sau MỌI đường thoát: `sk_best` giữ nguyên giá trị
   trước demo (trống khi phiên đầu), cú demo không tạo end-card, không banner 'YOUR TURN'
   oan ở local.
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
- Skip-sớm (round 2 — review t_077be174): skip khi engine RẢNH trước cú demo đầu (t < 2s) →
  flip ngay → director ĐÓNG BĂNG ở local (guard stage trước `director.update()`). Bằng chứng
  unit: `OnboardingPlayScene.demoLeak.test.ts` test "Đ4" — skip t≈300ms → pump tới 14.1s →
  `sk_best` null + pending 0 + 0 end-card + banner rỗng. QA retest ô C6 đủ 3 thời điểm
  skip (a)/(b)/(c) nêu ở mục 6.

## Bổ sung FUN2-C1 (t_22349993 — audio nghe thấy mobile + mute)

Testid mới:

| testid | Đối tượng / cách đọc | Ý nghĩa | Visible khi nào |
|---|---|---|---|
| `mute-btn` | Text trong OnboardingPlayScene — `children.list.find(o => o.getData('testid') === 'mute-btn')` | Nhãn nút âm thanh: `SOUND ON` (đang có tiếng) / `SOUND OFF` (đang câm). 100% EN (PB-5). | Luôn trong scene chơi |
| `mute-btn-bg` | Rectangle — đọc như trên với `'mute-btn-bg'` | Nền bấm nút ≥44px (`MECHANICS.touchTargetPx`), góc phải-dưới màn (thumb reach — không đè HUD). | Luôn trong scene chơi |

Hành vi mới QA cần biết:

- **Nút mute**: bấm nền `mute-btn-bg` (pointerdown) → đảo mute NGAY: `plopSynth.setMuted()` →
  play/playWhoosh no-op 0 node (không phát gì, kể cả plop nảy + whoosh ném). Label đổi
  `SOUND ON` ↔ `SOUND OFF` cùng frame.
- **Persist**: `localStorage.sk_muted` = `'1'` khi mute, `'0'` khi mở. Boot lại scene/page với
  `sk_muted=1` → plopSynth khởi động ở trạng thái muted (đúng label `SOUND OFF`).
- **Whoosh ném đá**: mỗi cú thả (demo B1–B3 LẪN cú người chơi) phát 1 tiếng vút ngắn
  `playWhoosh(power)` ngay trước khi đá vào engine — power nguyên bản của cú.
- **Slap chủ đạo**: plop nảy giờ có lớp slap 1.5–4kHz to nhất (nghe "thíp" trên loa mobile) +
  fundamental tonal 180–320Hz, envelope tổng 150–250ms, masterGain 0.5–0.9 (số [PLACEHOLDER]
  tới boss playtest).
- **Hitstop** (`src/logic/mechanics.ts` `hitstopMsFor(impact)`): chỉ xuất hàm tầng A
  (33–66ms khi impact ≥ 0.6) — scene CHƯA diễn (card C2). QA không thấy thay đổi visual card này.
- Bằng chứng unit: `src/scenes/__tests__/Fun2Audio.wiring.test.ts` (whoosh + mute),
  `src/audio/__tests__/plopSynth.test.ts` (slap path + whoosh + muted 0 node),
  `src/audio/__tests__/audioMapper.test.ts` (số mapper mới), `src/logic/__tests__/hitstop.test.ts`.

## Bổ sung FUN2-C3 (t_babfbe42 — juice/HUD: spray impact + splash crown + HUD pop)

Testid mới:

| testid | Đối tượng / cách đọc | Ý nghĩa | Visible khi nào |
|---|---|---|---|
| `skim-spray` | Arc trong OnboardingPlayScene — `children.list.find(o => o.getData('testid') === 'skim-spray')` | Hạt spray nước bung tại điểm nảy. Số hạt/bounce = `SKIM.sprayCountMin + round(impact × (sprayCountMax − sprayCountMin))` (2..8) — MỌI bounce bung (không còn ngưỡng cứng 0.72). | ~500ms sau mỗi bounce |
| `skim-foam` | Image trong PlayScene — `children.list.find(o => o.getData('testid') === 'skim-foam')` | Foam trắng điểm chạm C2 + (MỚI) vòm cung crown tại điểm chìm: `SKIM.crownPuffs` (5) cụm trên cung bán kính `SKIM.crownRadiusPx` quanh điểm splash. | ~850ms sau bounce/splash |

Hành vi mới QA cần biết:

- **Spray theo impact (bỏ gate cứng)**: trước đây chỉ impact ≥ 0.72 mới bung spray; giờ MỌI
  bounce bung — cú micro vẫn có `sprayCountMin` (2) hạt, cú mạnh tới `sprayCountMax` (8).
  Công thức + biên khóa trong `Fun2Juice.wiring.test.ts`.
- **Splash crown**: khi đá chìm (splash — run kết thúc) ngoài foam chìm trung tâm còn vòm cung
  foam TRẮNG 5 cụm quanh điểm chìm — tái dùng đúng pool foam C2 (không object mới ngoài pool).
- **HUD pop**: mỗi bounce, text `hud-score` nhảy scale lên ×1.25 rồi về ×1 sau ~120ms —
  SCALE-ONLY: chữ/alpha/vị trí không đổi (contrast AA T6 giữ nguyên). Spam bounce → pop reset
  (không cộng dồn vỡ layout).
- **Mirror mới** (đọc như `getEndCardForTest`): `PlayScene.sprayForTest()`, `PlayScene.hudForTest()`,
  `Hud.popScaleForTest()`, `SprayFx.poolSizeForTest()/visibleCountForTest()`.
- **Fix kèm card**: `spray.update()` trước đây KHÔNG được gọi (hạt đứng hình đến khi pool 16
  recycled) — giờ tiến tuổi qua hook `updateExtraFx` mỗi frame (đồng bộ hitstop: delta 0 → đứng hình).
- Bằng chứng unit: `src/scenes/__tests__/Fun2Juice.wiring.test.ts` (10 test: spray công thức/biên/
  pool-cap, crown pool-tái-dụng + dải alpha, HUD pop scale-only + spam-safe, grep-cap wiring).
