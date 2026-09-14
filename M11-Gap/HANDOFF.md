# HANDOFF — Paper Crease (M11) · bàn giao để anh làm tiếp ở local

> Cập nhật: 2026-09-14 ~15:50 UTC · nhánh `m11/b1a-core-geometry` · repo `github.com/tuyentran4992/game`
> Mọi số dưới đây **đo từ máy**, không phải mô tả suông.

---

## 1. CHẠY THỬ Ở LOCAL (Windows, Node ≥ 18 — đã test bằng v22.23.2)

```bash
git clone -b m11/b1a-core-geometry https://github.com/tuyentran4992/game.git
cd game\M11-Gap\game
npm install
npm run dev            # mở http://localhost:5173
```
Bản build (phải phục vụ qua HTTP, KHÔNG double-click `index.html`):
```bash
npm run build:standalone
python -m http.server 8080 --directory dist
```
Nghiệm thu hoạt cảnh bằng máy (cần `pip install playwright pillow` + `python -m playwright install chromium`):
```bash
python M11-Gap\tools\qa_motion_probe.py http://localhost:8080
```

---

## 2. ĐÃ XONG & ĐÃ KIỂM (không cần làm lại)

| Hạng mục | Bằng chứng |
|---|---|
| 8 batch (B1a…B5) qua harness tự động | ledger `M11-Gap/logs/metrics.jsonl` (111 phiên, **$327,78**) |
| **681 test xanh** (40 file) | `vitest run tests/logic tests/platform` |
| Typecheck sạch | `tsc --noEmit` rc=0 |
| **Layout đã sửa** (camera dọc 720×1420 theo mockup §4) | `layout.test.ts` 45 case; đo Playwright: ô đáp án 240×264, giấy 480, HUD sao↔Mực hết chồng |
| **Bundle 3 kênh PASS** trên artifact MỚI (commit `1765957`) | `check-bundle.mjs`: standalone/ytgame/playgama = 0 vi phạm; ytgame 0 debug hook, playgama đúng 1 bridge + có `playgama-bridge-config.json` |
| Chơi được | clone sạch → build 18,8s → title "Paper Crease", 0 lỗi console, bấm PLAY vào màn, chọn đáp án, máy phán |
| Art & juice (asset) | 8 skin giấy · 14 mẫu album · 6 huy hiệu · icon/preview 512 · 8 SFX (`scripts/gen_assets_m11.py`, `gen_sfx_m11.py`) |

---

## 3. ĐANG DỞ — HOẠT CẢNH GẤP/MỞ (việc chính còn lại)

### 3.1 Đã có gì (vòng 3 làm được, **CHƯA push** phần này)
- Cửa QA `window.__pcMotion = { phase, foldProgress, layerScales, holeCount }` (chỉ kênh dev) — **chạy thật**
- File mới: `src/render/motionPlayer.ts` · `src/render/anim/motionTrack.ts` · `src/render/anim/foldShape.ts` · `src/render/components/FoldPaper.ts` · `src/render/components/SheetHoles.ts`
- Vào màn: `foldProgress 0.49 → 0.93 → 1` có nội suy (khung đổi 2.978 / 512 / 719 / 248 px)
- Trả lời (khi bấm SAU khi vào màn xong): phase `folding → folded → unfolding`, **3–7 khung đổi >2.000 px**, `layerScales` qua **6 mốc khác nhau** cho cả 4 ô đáp án

### 3.2 Còn lệch (đo được)
1. **Vào màn vẫn giật ở cuối**: sau khi gấp xong còn một cú nhảy **45.858 px** ở ~1,2s ⇒ tổng thời gian tới lúc chơi được **~1,2s** (yêu cầu ≤1,0s). Hoạt cảnh gấp hiện **quá nhỏ** (vài trăm–vài nghìn px/khung).
2. **Khung giữa lúc mở bung còn lỗi vẽ**: Vision soi khung giữa thấy *"thiếu viền trái + viền dưới của ô dưới-trái, mất đối xứng hai nửa, một đường kẻ mảnh thừa"* ⇒ nội suy đã có nhưng **hình chưa sạch**.
3. `layerScales` chạy **không đơn điệu** (ví dụ `(1,1,0.97,0)` → `(1,0.89,0,0)` → `(0.07,0.01,0,0)`) — cần kiểm lại thứ tự lớp/nghĩa từng phần tử trong mảng.
4. **Bấm khi màn chưa vào xong thì cú bấm bị nuốt** (không phải lỗi mới nhưng cần biết khi test).

### 3.3 Tiêu chí nghiệm thu (đã có script, không thể sửa giả)
`tools/qa_motion_probe.py` phải in ra:
- Vào màn: **≥4 khung liên tiếp đổi >2.000 px** và **bấm được sau ≤1,0s**
- Trả lời: `layerScales` qua **≥3 mốc khác nhau** + ảnh đổi **≥3 khung**
- Và khung giữa lúc mở bung phải **không còn** artefact (viền thiếu/lệch trục/kẻ thừa) khi soi bằng mắt/vision

---

## 4. NỢ CHẤT LƯỢNG CÒN LẠI (theo thứ tự ưu tiên)

| # | Việc | Bằng chứng / vị trí |
|---|---|---|
| 1 | **Cổng smell 3 vi phạm**: `SheetView.ts` **415 dòng** > 350 · khối 6 dòng trùng `FoldPaper.ts:56 ↔ SheetHoles.ts:27` · hằng `0` mang 3 tên `FLASH_PEAK / GRAIN_ALPHA / BAND_WIDTH` | `node tools/gate-smell.mjs` |
| 2 | **B1c: 10 mục review FAIL** — nặng nhất **mất dữ liệu khi migrate save v0→v1** (`ghosts/walls` bị xoá sạch, `writeSave` ghi bản trống), **save không trần byte** (blob 6,15MB vẫn `ok`, PC-16 đòi <3MB), i18n lọt `{n}` ra UI, `t(key,null)` ném TypeError, bộ kiểm kiểu chép 3 lần, 6 test tự lấy `defaultSave()` làm oracle | `logs/NIGHT-B1c-NEEDS-HUMAN.md` |
| 3 | **B3b: 26 khối 6 dòng trùng** giữa các scene (header/dựng panel/nối nút) → gom helper chung | `logs/B3b-gate.log` |
| 4 | **2 file quá dài** (nợ đã khai): `PlayScene.ts` 487 · `sdkAdapter.ts` 251 | `game/tools/gate-allow.json` |
| 5 | **2 vênh DATA-MODEL**: nhịp P1-04 (16 archetype > 15 màn/chương) · P1-02 vs P4-02 | `specs/1-paper-crease/DATA-MODEL.md` §9 |
| 6 | 2 mục retention `unverified` (số skin "đủ 2-3 tuần", đường ống đo offline) | `M11-Gap/retention/` |

---

## 5. BÀI HỌC VẬN HÀNH (đã trả giá, đừng lặp lại)

1. **`pgrep/pkill` KHÔNG có trong container** → đếm/đợi phiên bằng vòng `/proc/*/cmdline`.
2. **Diệt wrapper để lại con mồ côi** (CLI `claude` + `vitest` + `esbuild` reparent về PID 1, vẫn ghi file) → phải diệt **cả cây con**.
3. **PASS giả**: `build-channels.sh` chạy **cổng ở bước 1/5** và dừng khi cổng đỏ ⇒ `check-bundle` sau đó kiểm **artifact cũ**. Luôn chốt `mtime` artifact > thời điểm bắt đầu sửa.
4. **Chuỗi không được ghi "xong" khi phiên không chạy**: bắt `rc` **và** mtime của `*.stream.jsonl`; sai thì `exit 1`, không chạy cổng/build.
5. **Prompt của `claude_step.py` phải nằm trong `prompts/`** (đặt ở gốc dự án ⇒ "thiếu prompt" và phiên không chạy).
6. Phiên bị **chặn quyền ~24 lần** ở lệnh Bash gộp nhiều vế (`a && b | c`) → prompt nên yêu cầu 1 lệnh ngắn/bước.
7. Hết trần lượt là chuyện thường (đã gặp 3 lần) → **đặt tiêu chí dừng**: xong `gate` trước, rồi mới tới việc phụ.

---

## 6. BẢN ĐỒ FILE (để định vị nhanh)

```
M11-Gap/
├── specs/1-paper-crease/       SPEC.md · DESIGN-SPEC.md (§4 mockup từng màn) · DATA-MODEL.md · TEST-CASES.md · E2E-TESTS.md
├── game/
│   ├── src/logic/              lõi hình học/kinh tế (16 file, ≤250 dòng)
│   ├── src/render/
│   │   ├── layout.ts + layoutTable.ts   bố cục (camera dọc 720×1420)
│   │   ├── motionPlayer.ts · anim/motionTrack.ts   ĐẦU PHÁT HOẠT CẢNH (chỗ cần sửa tiếp)
│   │   ├── components/SheetView.ts (415 dòng — cần tách) · FoldPaper.ts · SheetHoles.ts · OptionCard.ts
│   │   └── scenes/PlayScene.ts (487 dòng) · Title/Map/Shop/Album/Score/End
│   ├── src/ui/motion.ts        cửa __pcMotion (QA hoạt cảnh)
│   ├── tools/gate-smell.mjs · check-bundle.mjs · qa_motion_probe.py ở ../tools/
│   └── scripts/build-channels.sh   ĐƯỜNG ỐNG ĐÓNG GÓI (gọi cái này, đừng tự dựng lại)
├── harness/                    claude_step.py · night_run.py · chain-*.sh · HARNESS.yaml · logs/metrics.jsonl
└── logs/                       NIGHT-*.md (báo cáo từng batch) · NIGHT-B1c-NEEDS-HUMAN.md (10 mục treo)
```

---

## 7. PROMPT ĐỂ ANH GIAO LẠI CHO AGENT Ở LOCAL (việc hoạt cảnh)

> Trong repo `game/`, đang có sẵn: camera dọc 720×1420 (đã đúng mockup), `layout.test.ts` 45 case xanh, 681 test xanh, typecheck sạch.
> **Hoạt cảnh gấp/mở bung đang dở**: đã có `src/render/motionPlayer.ts` + `src/render/anim/motionTrack.ts` + cửa QA `window.__pcMotion` (chỉ kênh dev).
> Số đo thật cần khắc phục: (a) vào màn: `foldProgress` có nội suy nhưng khung hình chỉ đổi vài trăm–vài nghìn px rồi **giật 45.858 px ở ~1,2s** (yêu cầu ≤1,0s để vào chơi); (b) khung giữa lúc mở bung còn **thiếu viền, mất đối xứng, kẻ thừa**; (c) `layerScales` không đơn điệu.
> Yêu cầu: **một đường vẽ duy nhất đọc `motion` mỗi khung** (đúng kiểu MVP `drawFoldPunch(tf,tp)` / `drawUnfold(t)` ở `/data/shared-board-agent-waves/game-gap-giay/prototype/gap-playtest.html`), CẤM kiểu "vẽ lại khi đổi phase"; giữ nguyên bảng số (`head 140ms`, so le `layerStep 110ms`, `holeStagger 60ms`, `pop 250ms`); gấp vào + đục lỗ tổng 0,5–0,7s rồi vào chơi ngay.
> Nghiệm thu: `python M11-Gap/tools/qa_motion_probe.py <url>` phải in: vào màn ≥4 khung đổi >2.000 px + bấm được ≤1,0s; trả lời `layerScales` qua ≥3 mốc + ảnh đổi ≥3 khung; và ảnh khung giữa không còn artefact.
> Kèm việc dọn cổng: tách `SheetView.ts` (415 dòng) · gộp khối 6 dòng trùng `FoldPaper.ts:56 ↔ SheetHoles.ts:27` · gộp hằng `0` mang 3 tên.
> Luật: sửa `src/**`, `tests/**`, `tools/**`; CẤM `specs/**`, `harness/**`; chạy `npm run gate` xanh rồi `bash scripts/build-channels.sh` (đường ống đóng gói duy nhất) và kiểm `mtime` artifact mới hơn lúc bắt đầu sửa.
