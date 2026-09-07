# Slice Studio — DATA-MODEL (save schema · SDK wiring · contract ranh giới file)

**Stage:** 2-slice-studio. Freeze logic: SPEC §0. Mục tiêu: tiến trình LƯU BỀN qua xoay thiết bị/kill process (compliance Playgama điểm A) — qua `@game/sdk` có sẵn, KHÔNG viết adapter kênh mới (PB-0).

---

## 1. NƠI LƯU — THEO NỀN TẢNG

| Platform | Backend `@game/sdk` | Storage thực tế | Ghi chú |
|---|---|---|---|
| Playgama | `bridge-backend.ts` | Bridge storage (localStorage/IndexedDB theo Bridge) | write ngay sau mỗi lần cắt (không đợi End) |
| Reddit Devvit | `devvit-backend.ts` | Redis player scope | cùng schema |
| YouTube/Mediacube | `ytgame-backend.ts` | ytgame `saveData/loadData` | cùng schema |
| Mock/standalone | `instance.ts` (MockBackend) | localStorage | schema y hệt — QA dễ dọn |

Nguyên tắc: **game code chỉ gọi SDK interface** (`initialize / loadData / saveData`), KHÔNG đụng window.* trực tiếp trong scene. Detect platform là việc của `handler.ts` có sẵn — không thêm detect logic mới.

## 2. SAVE SCHEMA (v1 — tuỳ tiện mở rộng bằng optional field, đổi shape = version bump)

```ts
/** Key: 'slice-studio-save-v1' — ghi sau MỖI lần cắt, không đợi end-session. */
interface SliceStudioSave {
  v: 1;                          // schema version — migration sau này nhờ v này
  unlockedLevel: number;         // 1..12 — level cao nhất được vào thẳng
  stars: Record<number, number>; // levelId -> best stars 0..3 (chỉ giữ max)
  bestPct: Record<number, number>; // levelId -> best pct 0..100 (con đường luyện tay)
  bestStreak: number;            // GHOST streak dài nhất từng đạt
  fullRunGhost: boolean;         // đã GHOST full 12/12 chưa (danh hiệu vĩnh viễn)
  muted: boolean;                // audio state (đọc lúc boot)
}
```

Bất biến khi ghi:
1. `unlockedLevel` chỉ TĂNG (không bao giờ giảm khi replay).
2. `stars[id]`/`bestPct[id]` chỉ giữ max — replay tệ hơn không ghi đè.
3. Ghi atomically: serialize cả object một lần (không ghi rải field — dập process giữa chừng không được save nửa schema).
4. Save fail (SDK lỗi / storage full) → game VẪN CHƠI TIẾT (in-memory giữ tiến trình tới End), hiện không-cảnh-báo-chữ (vì 100% EN copy chỉ cho gameplay — lỗi infra không cần hiện); retry save ở lần cắt kế.

**Vì sao schema này đáp ứng compliance "tiến trình LƯU khi xoay thiết bị":** xoay → browser KHÔNG reload game (canvas Phaser không thoát) nhưng iOS Safari có thể dừng render/đập process — nên save-đồng-loạt-sau-mỗi-cắt đảm bảo tổn thất tối đa = ván đang cắt (rồi được retry trong 30s, không mất unlocked/stars). `visibilitychange`/`orientationchange` trigger save ngay (S4 — event listener, không đụng freeze files).

## 3. SDK WIRING (S4 — 3 điểm cắm, đúng `@game/sdk` v2.0.0)

```
boot (main.ts — được sửa 'chỉ SDK bootstrap'):
  1. initialize()  → handler.ts tự detect Reddit→Playgama→ytgame→Mock
  2. loadData()    → saveSchema v1 hoặc default (level 1, mọi số 0)
  3. saveData()    → sau mỗi lần cắt (TraceScene onScore — được sửa tầng B) +
                     visibilitychange + orientationchange
```

- KHÔNG network ngoài SDK (PB-5). KHÔNG leaderboard ở stage 2 (SPEC §2.3). KHÔNG ads/IAP.
- Mock local: cùng interface — dev/QA localStorage, key y như schema.
- Bundle Playgama (`playgama.html` entry, mode playgama) không chứa backend Reddit/ytgame (vite multi-platform có sẵn — S4 chỉ xác minh bằng grep bundle, TEST-CASES T4.4).

## 4. CONTRACT — RANH GIỚI FILE TỪNG SUBCARD (fan-out theo parent t_e3f3bb6d)

| Subcard | Được SỬA | Được THÊM | CẤM đụng |
|---|---|---|---|
| S1 art | `render/fx.ts` (thêm param optional), `ui/hud.ts` | `src/config/theme-config.ts`, atlas `assets/atlas-m*.png` | 4 file freeze, levels.ts, scenes |
| S2 level polish | — | field hiển thị mới trong `level/levels.ts` (KHÔNG đổi path/shape/core/noGo/thresholds), `src/config/level-flavor.ts` | 4 file freeze, scenes, scoring logic |
| S3 audio | `audio/synth.ts` (CHỈ THÊM method) | `src/config/audio-config.ts` | 4 file freeze, levels.ts, render |
| S4 SDK | `main.ts` (bootstrap), `scenes/TraceScene.ts` (chỉ hook save sau onScore) | `src/sdk/save.ts` (glue) | 4 file freeze, geom, scoring, synth |
| S5 UX/copy | `scenes/EndScene.ts`, `ui/hud.ts` | copy map `src/config/copy-en.ts` | 4 file freeze, levels data, logic |
| S6 PB-3 gate | — | script/test compliance | mọi src — chỉ đọc + chạy verify |

**Xung đột tiềm Ải (flag trước):** S4 hook `TraceScene.ts` (onScore) + S5 sửa `EndScene.ts` + S1 sửa `hud.ts` — 3 subcard chạm 3 file scenes/ui KHÁC nhau, không chồng; nếu cần cùng file phải dồn 1 subcard trước (luật §5.2 lát độc lập).

## 5. TRẠNG THÁI RUNTIME (đếm đủ — phục vụ TEST-CASES)

| State | Nơi sống | Persist? |
|---|---|---|
| phase (idle/drawing/mid/scored) | TraceEngine (freeze) | KHÔNG — xoay giữ process thì giữ; process chết = ván cắt hiện tại, retry lại từ đầu level |
| strokes hiện hành | TraceEngine (freeze) | KHÔNG |
| streak hiện hành | TraceEngine (freeze) | KHÔNG (bestStreak lưu khi commit) |
| awards per level (sao) | registry + save | SAU khi commit score |
| unlockedLevel | registry + save | SAU khi next-level |
| muted | Synth | CÓ (mục 2) |
