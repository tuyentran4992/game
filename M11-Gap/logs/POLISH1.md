# ĐÁNH BÓNG 1 — bundle nộp 3 kênh

**Kiểm bằng ĐƯỜNG ỐNG CHÍNH THỨC** (`game/scripts/build-channels.sh`: build → copy_channel_files → snapshot → check-bundle):

| Kênh | Bản kiểm | Kết quả |
|---|---|---|
| standalone (dev) | `game/dist` | **PASS (0 vi phạm)** |
| ytgame (nộp) | `game/build/ytgame` | **PASS (0 vi phạm)** |
| playgama (nộp) | `game/build/playgama` | **PASS (0 vi phạm)** |

- Debug hook (`?debug`, `seed`, `ad=mock`, `location.search`) trong bundle NỘP: **0 hit** (đã strip).
- `playgama-bridge-config.json` (779B) có trong snapshot playgama (từ `scripts/channels/playgama/`).
- Luật URL ngoài: ytgame 0 · playgama đúng 1 (bridge playgama) · URL trong chunk engine Phaser chuyển sang dạng `audit` (không tính vi phạm).

## FAIL GIẢ đã gặp (bài học)
Lần kiểm đầu FAIL playgama 1 vi phạm vì script chuỗi tự chạy `npm run build:playgama` rồi `cp dist` — **bỏ qua bước `copy_channel_files`** nên thiếu file kênh.
**Luật: build/kiểm bundle kênh LUÔN đi qua `scripts/build-channels.sh`; cấm tự dựng lại đường ống.**
