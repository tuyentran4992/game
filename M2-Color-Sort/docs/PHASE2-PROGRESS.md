# PHASE 2 — ADS ECONOMY + RETENTION · PROGRESS LOG
> Game: **Neon Sort: Galaxy Pour** (M2-Color-Sort) · Nguồn yêu cầu: `docs/AUDIT-COMMERCIAL.md` **§B2 (Monetization / Ads)**
> Quy tắc: chỉ sửa trong `M2-Color-Sort/`, KHÔNG commit/push, KHÔNG mạng ngoài / KHÔNG ad SDK bên thứ 3 (chỉ `ytgame`).
> Giữ nguyên juice neon-galaxy (seal VFX + pentatonic bus) và luật chơi.
> Nền có sẵn từ Phase 1 (không làm lại): adapter `ytgame.*` namespaced, save/resume schema v2, `saveNow()` + debounce.

## Tổng kết kiểm chứng
| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | ✅ exit 0, không lỗi |
| `npm test` | ✅ **112 passed / 8 files** (trước: 79) — +33 test mới |
| `npm run build` | ✅ built in ~14 s · `dist/assets/index-*.js` 1 551 kB (gzip 362 kB) |
| No-external-network | ✅ `grep -rn "http" game/src` → 0 kết quả; không script bên thứ 3 |

## File mới
| File | Vai trò |
|---|---|
| `game/src/logic/ad-pacing.ts` | Toàn bộ POLICY quảng cáo dạng **thuần logic** (gate interstitial, luật hint, cap ống, `raceTimeout`) |
| `game/src/input-gate.ts` | Cổng input pre-roll (`ready && !paused`) |
| `game/src/ad-ux.ts` | Sheet xác nhận + spinner "Ad loading…" + toast lỗi (neon-galaxy) |
| `game/src/logic/__tests__/ad-pacing.test.ts` | 17 test cho pacing/hint/cap/timeout |
| `game/src/__tests__/input-gate.test.ts` | 6 test cổng pre-roll |
| `game/src/__tests__/context-ads.test.ts` | 4 test pacing **sống qua reload** |

---

## 1 — INTERSTITIAL PACING (M2-07) ✅
- [x] **Gate 3 điều kiện**: `level >= 3 && levels_since_ad >= 2 && now - last_interstitial_ts >= 75_000` — `logic/ad-pacing.ts::shouldShowInterstitial()`; trước đây fire 100 % số lần clear từ level 2.
  *Evidence:* `ad-pacing.test.ts` — "chuỗi thực tế: clear liên tục nhanh" → 12 level chỉ còn ≤5 quảng cáo, không có level 1-2, mọi khoảng cách ≥2 level (cũ: 11 ad).
- [x] **Persist trong save (schema v2.1)**: block `ads:{ last_interstitial_ts, levels_since_ad }` — `logic/save.ts` + `context.ts` (`canShowInterstitial/markInterstitialShown`, `onLevelClear` → `afterLevelCleared`).
  *Evidence:* `context-ads.test.ts` "markInterstitialShown + onLevelClear được GHI vào payload" đọc lại từ localStorage.
- [x] **Back-compat v2 → v2.1**: `SESSION_MIN_VERSION = 2` nên save v2 vẫn resume nguyên session; `ads`/`free_hint_used` lấy mặc định an toàn; `normalizeAdPacing()` lọc rác (âm/NaN/string).
  *Evidence:* `save.test.ts` "v2.1 BACK-COMPAT: save v2 … vẫn resume" + "block ads rác → chuẩn hoá".
- [x] **`Promise.race([ad, timeout(4000)])`** quanh interstitial trong nút NEXT — `scenes/LevelClear.ts::advance()` + `sdk.requestInterstitialAd(AD_FLOW_TIMEOUT_MS)`; timeout/no-fill/lỗi → đi tiếp **im lặng**, cộng thêm watchdog `setTimeout(go, …)` (timer thật, không chết khi Phaser bị pause).
  *Evidence:* `ad-pacing.test.ts` "promise không bao giờ settle → trả fallback đúng hạn"; `sdk-handler.test.ts` "interstitial nhận timeout tuỳ biến".
- [x] **Chống double-tap NEXT** (`this.advancing`) + cooldown được ghi NGAY cả khi ad không fill (không thử lại dồn dập).

## 2 — REWARDED HINT (`hint_once_per_level` hết dead code) ✅
- [x] **Thực thi luật**: `logic/ad-pacing.ts::hintGrant()` đọc `MECHANICS.reward.hint.hintOncePerLevel/costAd` — đúng **1 gợi ý/level**; bấm tiếp → toast "Hint already used — next level unlocks a new one" (không còn ad-spam vô hạn).
- [x] **Gợi ý ĐẦU TIÊN miễn phí** (onboarding grant, không ad) + toast "First hint is free ✨ — next one needs a short ad"; chỉ tiêu suất khi thực sự có nước gợi ý.
- [x] **Sheet xác nhận** "Watch a short ad for a hint?" có **NO THANKS** + tap-ra-ngoài = cancel — `ad-ux.ts::showAdConfirm()` (`testid` `ad-confirm` / `ad-confirm-yes` / `ad-confirm-no`).
- [x] **Kiểm tra ad khả dụng TRƯỚC** khi mời xem — `sdk.isRewardedAvailable()`; không có → toast, không mở sheet.
- [x] **Spinner "Ad loading…"** trong lúc chờ + **toast "Ad unavailable — try again later"** khi thất bại (trước đây là `if (!earned) return;` im lặng).
- [x] **Persist**: `hint_used_this_level` = `session.hint_used` (v2), `free_hint_used` = `flags.free_hint_used` (v2.1) — `ctx.markFreeHintUsed()`.
  *Evidence:* `ad-pacing.test.ts` 5 test hint (free-grant / rewarded / used-this-level / oncePerLevel=false / costAd=false); `context-ads.test.ts` "markFreeHintUsed persist".

## 3 — REWARDED EXTRA TUBE — discoverability ✅
- [x] **Slot toolbar thứ 4 CỐ ĐỊNH** `extra-tube-btn` ("+1", luôn hiện) cạnh Undo/Restart/Hint — `Gameplay.ts::drawToolbar()` tính lại bề rộng cho 4 nút, vẫn ≥48 px touch ở 320 px.
- [x] **Badge ▶ ad** vẽ ở góc trên-phải nút có quảng cáo (hint + extra tube) — `addAdBadge()`; badge mờ đi khi lượt đó **miễn phí** (không hứa sai).
- [x] **Disable + xám** khi hết `max_extra` / đã mua ống — `refreshRewardButtons()` (alpha 0.34, `data.disabled`), tap vẫn giải thích bằng toast thay vì im lặng.
- [x] **Tag chuẩn hoá `'extra-tube'`** (khớp TEST-CASES PC-08) — thay `'extra_tube'`.
  *Evidence:* `sdk-handler.test.ts` "rewarded gửi ĐÚNG tag 'extra-tube'".
- [x] **Giữ qua Restart (verify Phase 1)**: `restartBoard()` giữ `extraTubeUsed`; `onRestart()` nay gọi thêm `refreshRewardButtons()` để nút phản ánh đúng.
  *Evidence:* `save.test.ts` "extra-tube → restart → extra-tube → restart: số ống không bao giờ giảm" (giữ nguyên, vẫn pass).
- [x] Tooltip stuck giữ lại làm shortcut phụ (`extra-tube-tip-btn`) + **pulse** slot toolbar để kéo chú ý; lối vào chính không còn tự ẩn sau 4 s.

## 4 — PRE-ROLL GATE ✅
- [x] `input-gate.ts`: cổng `enabled = ready && !paused`, **đóng từ boot** (`game.input.enabled = false` trong `main.ts`).
- [x] Mở khi **StartScene báo interactable**: `POST_RENDER → firstFrameReady() → hideBootOverlay() → gameReady() → inputGate.markReady()` (`scenes/Start.ts`).
- [x] Đóng/mở theo **platform resume signal**: `sdk.onPause → setPaused(true)`, `sdk.onResume → setPaused(false)` (`main.ts`) → không tap nào đăng ký trên màn trắng/pre-roll.
- [x] Guard tại điểm chạm: `onTubeTap` / `onUndo` / `onRestart` / `onHint` / `onExtraTubeTap` / nút PLAY / nút NEXT đều kiểm `inputGate.enabled`.
- [x] Fail-safe 8 s: nếu `gameReady` không tới vì lý do nào đó, cổng vẫn tự mở (không bao giờ có game "không nhận input").
  *Evidence:* `input-gate.test.ts` 6 test (mặc định đóng, idempotent, pause trước ready, thứ tự phát sự kiện, listener lỗi không sập cổng).

## 5 — NON-BLOCKING UX cho MỌI luồng ad ✅
- [x] **Interstitial**: spinner "Ad loading…" + trần 4 s + đi tiếp im lặng.
- [x] **Rewarded**: spinner + **2 nhịp chờ** — 6 s watchdog (`AD_WATCHDOG_MS`); chỉ chờ tiếp (tối đa `REWARDED_TIMEOUT_MS = 45 s`) khi platform **đã pause** (⇒ ad thật đang chạy), còn no-fill thì thoát ngay thay vì để người chơi nhìn spinner.
- [x] **Không bao giờ tặng thưởng chưa kiếm được khi có SDK**: reject/timeout → `false` (`sdk-handler.ts`); chỉ khi hoàn toàn không có `ytgame` (dev/offline) mới mở khoá để QA.
  *Evidence:* `sdk-handler.test.ts` "rewarded timeout → KHÔNG cấp thưởng (false) khi SDK có mặt".
- [x] **Không soft-lock**: backdrop của spinner/sheet chặn tap xuyên; `adBusy` chặn double-spend; mọi overlay đều `destroy()` trong `finally`; NEXT có watchdog timer thật.
- [x] **Không "surprise ad"**: mọi rewarded đều qua sheet xác nhận; mọi thất bại đều có toast.
- [x] **Compliance**: không self-ads / không domain quảng cáo bên thứ 3 — chỉ `ytgame.ads.*`.

---

## Chưa làm (ngoài phạm vi §B2 lần này)
- Non-ad economy (coin / "1 ad → 3 hints" / daily free hint) — audit §B2-9, cần thiết kế kinh tế riêng.
- Bố cục board nhiều ống & thời gian `createBoard` ở level cao — audit **§B3** (Phase 3).
