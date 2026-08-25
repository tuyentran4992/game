# PHASE 1 — P0 BLOCKER FIXES · PROGRESS LOG
> Game: **Neon Sort: Galaxy Pour** (M2-Color-Sort) · Nguồn yêu cầu: `docs/AUDIT-COMMERCIAL.md`
> Quy tắc: chỉ sửa trong `M2-Color-Sort/`, KHÔNG commit/push. Giữ nguyên juice neon-galaxy (seal VFX + pentatonic audio).

## P0-1 — Load SDK thật (`ytgame`)
- [x] `game/index.html`: thêm `<script src="https://www.youtube.com/game_api/v1"></script>` (classic script, TRƯỚC `/src/main.ts`) — mirror M1.
- [x] `src/sdk-handler.ts`: viết lại thành adapter **namespaced** `ytgame.game.* / system.* / engagement.* / ads.*`.
- [x] Lấy mẫu bề mặt SDK **phòng thủ** (`isFn()` + đọc lại `window.ytgame` mỗi lần gọi) → thiếu API nào cũng không crash.
- [x] Fallback 2 tầng: shape phẳng (`ytgame.gameReady()`) → `localStorage['neon_sort_save']` cho dev/offline.
- [x] `sendScore` đúng shape `{ value }`; ads bọc `withTimeout(6s)`; rewarded ngoài Playables → `true` (dev unlock).

## P0-2 — Save/Resume thật (schema v2)
- [x] `src/logic/save.ts` (MỚI, thuần logic): `SCHEMA_VERSION=2`, `encodeSession/decodeSession/normalizeSave`.
- [x] Schema: `best_level, current_level, best_moves, best_moves_by_level, flags{muted,tutorial_seen}, session{level,seed,capacity,tubes(index màu),moves,history,extra_tubes,hint_used,optimal}, last_updated_ts` (~80–200 B).
- [x] `src/context.ts` viết lại: debounce ≥1000 ms (trailing write) + `saveNow()` flush ngay + **last-write-wins theo `last_updated_ts`**.
- [x] Ghi tại mọi mốc: pour (onComplete), undo, extra-tube, hint, tutorial, restart, level-clear, NEXT.
- [x] Mirror `localStorage` → reload ngoài SDK vẫn resume đúng ván đang chơi.
- [x] Vô hiệu session khi lệch `schema_version` / lệch `level` / lệch `capacity` / sai bảo toàn màu → chơi lại từ đầu level, không crash.
- [x] Resume khôi phục **đúng board giữa ván + stack undo**, KHÔNG chạy lại solver (dùng `optimal` đã lưu → không freeze 1.5 s).

## P0-3 — Crash rewarded-tube → Restart → rewarded-tube → Restart
- [x] `logic/color-sort.ts::restartBoard()`: **giữ** `extraTubeUsed` (trước đây bị reset về 0 → mua ống lần 2 vượt cap) + không bao giờ sinh board ít ống hơn UI hiện có.
- [x] `scenes/Gameplay.ts::onRestart()`: nếu số ống board ≠ số ống UI thì **layout lại** thay vì render đè.
- [x] `ui.ts::renderLiquid()`: null-safe `content ?? []` — chốt chặn cuối, `renderLiquid(views, undefined)` không còn ném TypeError.

## P0-4 — Đóng gói lại (zip đầy đủ, không rác)
- [x] `vite.config.ts`: `publicDir` `../assets` → `./public` (hết leak `assets/.gen_cache/*.src.png` 2.07 MB).
- [x] Thêm plugin `m2-prune-dist-assets`: xoá mọi file ngoài whitelist + `.gen_cache` khỏi `dist/`, cảnh báo file > 512 KiB.
- [x] Wire 3 PNG trước đây không dùng: `tube_base` (thân ống), `liquid_neon` (mặt thoáng), `ui_chrome` (nine-slice panel) — crop về alpha-bbox để dùng làm sprite thật.
- [x] `npm run build` + tạo lại `build/neon-sort.zip`: index.html + JS bundle HIỆN TẠI + 4 PNG + 5 mp3 = 2.32 MiB giải nén / 1.17 MiB zip. `build/metadata/` giữ nguyên.

## P0-5 — Trình tự khởi động (`firstFrameReady` / `gameReady`)
- [x] Bỏ `sdk.gameReady()` ở module-scope `main.ts` (trước đây gọi trước cả preload).
- [x] Loading state: overlay HTML `#boot-overlay` (`data-testid="loading-overlay"`) + progress bar trong canvas, bám `this.load.on('progress')`.
- [x] `StartScene.signalReady()`: `POST_RENDER` đầu tiên → `firstFrameReady()` → ẩn overlay → tick sau → `gameReady()` (chỉ khi Start đã tương tác được).
- [x] Pass-through `ytgame.system`: `onPause` (pause scene + suspend audio + `saveNow()`), `onResume`, `onAudioEnabledChange` → `synthAudio.setMuted()`.
