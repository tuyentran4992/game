# Playgama Bridge SDK — Nghiên cứu + Plan tích hợp vào game M1/M2/M3

> Research 2026-08-24. Nguồn: wiki.playgama.com (Bridge SDK v2), playgama.com, GitHub Playgama/bridge.
> Mục đích: đánh giá Playgama làm kênh chính lên YouTube Playables (thay/chạy song song Mediacube) + rộng hơn nhiều nền tảng từ 1 SDK.

## 1. Playgama Bridge SDK là gì (v2)

**SDK hợp nhất đa nền tảng** — tích hợp 1 lần, chạy được trên: Playgama, **YouTube Playables**, Microsoft Store, Facebook, Discord, Huawei, Xiaomi, Reddit, MSN, GameSnacks, JioGames, Y8, Lagged, **GameDistribution**, **Crazy Games**, Yandex, Dlightek/Aha, Telegram, TikTok, OK, VK, Samsung, Poki(e), portal...

- **JS Core** dùng cho web engine (Phaser/PlayCanvas/LayaAir/Plain JS) — đúng stack của Factory.
- Cách hoạt động: khi chạy trên nền tảng hỗ trợ, Bridge tự load script nền tảng đó và route API. Môi trường KHÔNG hỗ trợ (kể cả dev local) → dùng **mock platform**, trả giá trị an toàn (`false`/`reject`) KHÔNG throw → dev/test local không crash.

## 2. Cách tích hợp (Plain JS / Phaser)

**index.html** — thêm script trước game code, trong `<head>`:
```html
<script src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>
```
Sau đó khởi tạo trước khi dùng bất kỳ API nào:
```js
bridge.initialize()
  .then(() => { /* SDK sẵn sàng dùng */ })
  .catch(err => { /* xử lý lỗi */ });
```

**Config file** `playgama-bridge-config.json` đặt **cạnh `index.html`** (Bridge load từ `./playgama-bridge-config.json`), 1 file dùng chung mọi nền tảng, block `platforms.<id>` override riêng từng nền tảng. Nội dung: platform IDs, ad placements, payments, leaderboards.

## 3. Required steps (BẮT BUỘC — reject nếu thiếu)

| # | Bước | API | Ghi chú |
|---|------|-----|---------|
| 1 | Khởi tạo | `bridge.initialize()` | chờ promise trước khi dùng API |
| 2 | Localize | `bridge.platform.language` (ISO 639-1) | đọc 1 lần sau init |
| 3 | **Lưu tiến trình** | `bridge.storage.get([...])` / `bridge.storage.set([...],[...])` / `.delete([...])` | **CẤM `localStorage`** — phải qua Storage (cloud-save khi nền tảng hỗ trợ) |
| 4 | Pause & audio | `bridge.platform.isAudioEnabled` + subscribe `PAUSE_STATE_CHANGED` / `AUDIO_STATE_CHANGED` | game giữ âm/pause sai = fail moderation |
| 5 | Game ready | `bridge.platform.sendMessage('game_ready')` | khi frame đầu render xong |
| 6 | Interstitial | `bridge.advertisement.showInterstitial(placement)` | ở game over/level transition (đủ điều kiện rev-share) |

## 4. API module quan trọng (đã xác nhận tên method thật)

**Storage (required)** — vì game hiện dùng `ytgame.saveData/loadData`:
```js
// Load (missing key → null, luôn cung cấp default)
bridge.storage.get(['key_1','key_2']).then(data => {...}).catch(err => {...});
// Save — sau meaningful change (level complete, purchase, settings)
bridge.storage.set(['key_1','key_2'], ['value_1','value_2']).then(() => {...}).catch(...);
// Delete
bridge.storage.delete(['key_1','key_2']);
```

**Rewarded** (tương ứng `ytgame.ads.requestRewardedAd`):
```js
// check hỗ trợ trước khi hiện nút
const sup = bridge.advertisement.isRewardedSupported;
// show
bridge.advertisement.showRewarded(placement); // placement optional
// CHỈ cấp thưởng khi state === 'rewarded'
bridge.advertisement.on(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, state => {
  if (state === 'rewarded') { /* GRANT reward ở đây */ }
});
```
State: `loading → opened → closed | rewarded | failed`. **Bắt buộc** cấp thưởng chỉ ở `rewarded`.

**Interstitial** (tương ứng `requestInterstitialAd`):
```js
const sup = bridge.advertisement.isInterstitialSupported;
bridge.advertisement.setMinimumDelayBetweenInterstitial(60); // mặc định 60s
bridge.advertisement.showInterstitial(placement);
```
State: `loading → opened → closed | failed`.

**Mute/pause (QUAN TRỌNG)**: khi mở ad, game PHẢI pause+mute. Khuyến nghị dùng **1 handler chung** subscribe `AUDIO_STATE_CHANGED` + `PAUSE_STATE_CHANGED` (Bridge tự fire cho mọi loại: interstitial, rewarded, tab-switch, system pause) — đúng pattern mình đã có sẵn ở `main.ts` (`sdk.onPause` / `sdk.onAudioEnabledChange`).

## 5. Bản đồ ánh xạ code hiện tại → Playgama Bridge

Tất cả 3 game đã có `SdkHandler` (sdk-handler.ts) bọc `window.ytgame` với cùng API. Playgama Bridge cung cấp API gần tương đương → **chỉ cần thêm 1 backend** trong `SdkHandler`, KHÔNG đụng gameplay/scenes:

| API hiện tại (SdkHandler) | ytgame (hiện có) | Playgama Bridge (thêm) |
|---|---|---|
| `gameReady()` | `gameReady()` | `bridge.platform.sendMessage('game_ready')` |
| `onPause(cb)` | `onPause(cb)` | subscribe `bridge.EVENT_NAME.PAUSE_STATE_CHANGED` |
| `onResume(cb)` | `onResume(cb)` | (state false) |
| `isAudioEnabled()` | `isAudioEnabled()` | `bridge.platform.isAudioEnabled` |
| `onAudioEnabledChange(cb)` | `onAudioEnabledChange(cb)` | subscribe `AUDIO_STATE_CHANGED` |
| `saveData(data)` | `saveData(jsonStr)` | `bridge.storage.set([key],[jsonStr])` |
| `loadData()` | `loadData()` | `bridge.storage.get([key])` |
| `sendScore(score)` | `sendScore(score)` | `bridge.leaderboards` (optional) |
| `requestInterstitialAd()` | `ads.requestInterstitialAd()` | `bridge.advertisement.showInterstitial()` |
| `requestRewardedAd(id)` | `ads.requestRewardedAd(id)` | `bridge.advertisement.showRewarded(id)` + state listener |

**Chiến lược đề xuất**: `SdkHandler` thành **multi-backend**:
1. Nếu `window.bridge`/Playgama Bridge present → dùng Playgama (nộp lên Playgama/các nền tảng qua Playgama).
2. Ngược lại nếu `window.ytgame` → dùng YouTube SDK thuần (nộp thẳng Mediacube).
3. Còn lại → mock/localStorage (dev local, như hiện tại).

→ Cùng 1 codebase build ra **2 gói nộp** (Playgama version + Mediacube/ytgame version) mà gameplay 0 đổi.

## 6. Lưu ý / rủi ro khi tích hợp

- **Playgama hỗ trợ cả `crazy_games`** trong list ad/audio/platform (config block `crazy_games`) → gắn Bridge rồi, một build cũng nộp được **CrazyGames** (Playgama tự nói họ KHÔNG publish lên Poki/CrazyGames thay mình, nhưng game mang SDK của họ thì tự upload thẳng CrazyGames được).
- **Storage KHÔNG đụng localStorage** — bridge.storage tự chọn chỗ lưu (cloud khi có). Game hiện có localStorage fallback; khi chuyển Bridge phải đảm bảo cờ read jacket qua cloud.
- **Placements**: rewarded/interstitial cấu hình trong config (`advertisement.rewarded.placements`, `advertisement.interstitial.placements`). Preload placement tiện lợi (`preloadOnStart`).
- **min delay interstitial** mặc định 60s — set phù hợp game (nhưng giữ ≥30-60s tránh spam, đúng BR).
- **Không đổi luật Playables**: game vẫn KHÔNG tự nhét ads/banner ngoài platform SDK. Bridge là hợp pháp vì nó là official YouTube Partner binding.
- Mock-platform giúp test local KHÔNG crash — nhưng QA thật vẫn cần browser dev + nộp thử.

## 7. Kết luận

- [x] SDK tích hợp nhẹ (1 CDN script + init + config json), **hỗ trợ Phaser/JS Core** đúng stack.
- [x] **Rất hợp pattern hiện tại** vì SdkHandler đã tách sạch — thêm backend Playgama ≈ 1 ngày dev.
- [x] 1 lần tích hợp → nộp được YouTube (qua Playgama) + CrazyGames + GameDistribution + Y8 + ... cùng lúc, **non-exclusive**, revshare 70-90%, không lock 12 tháng, payout nhanh.
- [ ] Việc cần anh: tạo account `developer.playgama.com` (danh tính thật) → sau đó em gắn SDK vào 1 game thử (nên bắt đầu M1 hoặc M3) → QA → nộp.