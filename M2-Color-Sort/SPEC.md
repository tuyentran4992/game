# M2: "Neon Sort — Galaxy Pour" (Color Sort Puzzle · YouTube Playables)

> **Research date:** 2026-08-22
> **Sources:** dmnd.games/how-to-play-water-sort, chromaoracle.com/guides/water-sort-strategy, Mediacube Playables (luật nền tảng)
> **Depends on:** pipeline nền (Python) + game scaffold Phaser 3 dùng chung từ M1 (mỗi game 1 repo/thư mục độc lập)
> **Contract:** game/ tại thư mục này · config `games/neon-sort.yaml` · pipeline tái dùng (scaffold/assets/validate/package)
> **Art-theme:** NEON GALAXY (nền tối + chất lỏng neon phát sáng — khác biệt apps nước truyền thống, anh Tuyền chốt 2026-08-22)

---

## 1. TỔNG QUAN

### Mục tiêu
Game **color-sort / water-sort**: xếp chất lỏng màu trong các ống thủy tinh cho tới khi mỗi ống 1 màu (hoặc trống). Thể loại **puzzle + mastery** (không phải reflex như M1) — giữ chân dài, nhịp thư giãn, chơi dọc 9:16. Là module 2 của factory, tận dụng pipeline đã có từ M1 → chi phí làm game thấp.

### Đối tượng
- Đầu vào: config 1 level-set (số ống, màu, capacity) + art Neon Galaxy.
- Người chơi: khán giả 13+ quốc tế trên YouTube Playables.
- Vận hành: Hermes (PM/QA) + Claude (Dev) + anh Tuyền (duyệt).

### IN SCOPE
- Gameplay color-sort đầy đủ: ống, đổ màu theo luật, thắng level, level system, undo/restart/hint.
- Sinh board **luôn giải được** (sinh ngược từ trạng thái sort).
- Progression: level → level, best-level lưu, hiệu ứng clear.
- Monetize qua SDK: pre-roll, interstitial (giữa level), rewarded (hint + extra tube).
- Art Neon Galaxy + âm thanh.
- Pipeline: config, asset, validate, package (đóng gói nộp).

### OUT OF SCOPE
- Không timer / không thua (puzzle, chỉ có thể stuck → undo/restart).
- KHÔNG gọi mạng ngoài / multiplayer / ads self (Playables cấm) — chỉ ytgame SDK.
- Multi-touch phức tạp, bàn phím không bắt buộc (tap là chính).
- KHÔNG làm lại pipeline core (tái dùng từ M1).

---

## 2. MODULE DEPENDENCIES + KỸ THUẬT

- **Stack:** Phaser 3 WebGL (JS/TS, vite build) · pipeline Python 3.11+ (reuse M1) · token từ `../docs/DESIGN-SYSTEM.md` (UI chrome chung) + art-theme Neon Galaxy trong DESIGN-SPEC M2.
- **Playables SDK:** dùng `sdk-handler` wrapper (an toàn local) → pre-roll / interstitial / rewarded (hint, extra-tube) / saveData / sendScore / pause-mute.
- **Pipeline CLI (từ M1, dùng với config M2):**
```bash
python -m pipeline scaffold --config games/neon-sort.yaml
python -m pipeline assets --config games/neon-sort.yaml --job gen
python -m pipeline validate --game-dir games/neon-sort
python -m pipeline package  --game-dir games/neon-sort
```
> Cấu trúc mỗi repo: `games/<name>.yaml` (nguồn cấu hình) + `game/` (Phaser src + dist) + `assets/raw/` + `build/` (zip + metadata).

---

## 3. USER FLOW

```
Mở game (pre-roll ad) → Start (nút Chơi, art Neon Galaxy)
→ LevelSelect / vào level 1 (đã lưu level tiến bộ qua saveData)
→ Gameplay: bảng ống (board), mỗi ống chứa N lớp màu trộn
   • Tap ống A → chọn (highlight); tap ống B → đổ chất lỏng màu-đỉnh của A sang B (nếu hợp lệ)
   • Đổ sai → không chuyển + rung nhẹ + âm thanh "không được"
   • Nút Undo / Restart / Hint (rewarded)
   • Đổ tới khi mỗi ống 1 màu hoặc trống → LEVEL CLEAR (confetti + âm + sfx)
→ Popup Clear: "Hoàn thành!" + nút "Level tiếp" (interstitial giữa level) → level kế
→ Hết level-set sẽ generate level tiếp theo (vô hạn) hoặc quay vòng tăng độ khó
→ Player đóng giữa chừng → saveData lưu level đang ở, tiếp tục sau
```

---

## 4. GAMEPLAY & LUẬT (core)

### 4.1 Luật đổ màu (BẮT BUỘC — giống chuẩn water-sort)
- Mỗi ống có **capacity C** lát (M2: C=4 level đầu, tăng dần).
- **Chọn ống nguồn**: lấy **màu đỉnh** (từ trên cùng xuống, cùng 1 màu liên tiếp).
- **Đổ sang ống đích** hợp lệ khi: đích **trống**, hoặc đích **đang rỗng ≥1 chỗ** VÀ **màu đỉnh đích == màu đang đổ**.
- Đổ **cả chuỗi cùng màu đỉnh** tối đa theo chỗ trống đích (vd 3 lục đỉnh + đích còn 2 chỗ → đổ 2, dừng).
- **Thắng**: mỗi ống **trống hoặc gồm 1 màu duy nhất** (không ống lẫn màu).
- **Không thua**: không timer, chỉ có thể kẹt (không còn nước đi hợp lệ nhưng chưa xong) → người chơi dùng undo/restart.

### 4.2 Sinh board luôn giải được (BẮT BUỘC)
- Tạo các ống "đã sort" (mỗi ống 1 màu / trống) rồi **dịch chuyển ngược** ngẫu nhiên (các bước đổ hợp lệ ngược) để ra board trộn — đảm bảo luôn giải được.
- Level đầu: chỉ 1-2 ống trống workspace; level cao giảm workspace (khó hơn).

### 4.3 Level & progression
- **Level tiến dần** (như nước tăng dần lượng ống/màu/capacity). M2: từ 4 ống / 3 màu lên 12+ ống / 10+ màu.
- Lưu **best-level + số move** qua saveData (BR). Tiếp tục từ level đang chơi.

### 4.4 Khó khăn / giữ chân
- Mỗi level = bài toán mới; "sắp xong" → muốn làm nốt (nghiện).
- Undo tối đa theo lịch sử (không giới hạn moves — rest intuitive).
- Hint (rewarded) gợi ý nước đi đúng → giảm kẹt + nguồn ad.
- Extra tube (rewarded) thêm ống trống workspace các level khó → escape hat meets + ad.

---

## 5. MÀN HÌNH & DATA-TESTID

| Màn | Phần tử | data-testid |
|-----|---------|-------------|
| Start | Nút Chơi | `start-btn` |
| LevelSelect (nếu có) | Chọn level / tiếp tục | `level-select` |
| HUD | Level hiện tại | `level-label` |
| HUD | Số move | `move-count` |
| Gameplay | Vùng board | `board` |
| Gameplay | Từng ống | `tube-<i>` |
| Gameplay | Nút Undo | `undo-btn` |
| Gameplay | Nút Restart | `restart-btn` |
| Gameplay | Nút Hint (rewarded) | `hint-btn` |
| Level Clear popup | Nút "Level tiếp" | `next-level-btn` |

> Copy VI/EN: "Chơi"/"Play", "Hoàn thành!"/"Clear!", "Level tiếp"/"Next", "Quay lại"/"Undo", "Chơi lại"/"Restart", "Gợi ý"/"Hint". Title trên portal (≤50): **"Neon Sort: Galaxy Pour"**.

---

## 6. BUSINESS RULES

| ID | Rule |
|----|------|
| M2-01 | Đổ chỉ khi (đích trống) hoặc (được ≥1 chỗ VÀ đỉnh đích cùng màu). Vi phạm → không đổi board + phản hồi lỗi (rung/âm). |
| M2-02 | Thắng = mọi ống trống hoặc 1 màu duy nhất. Khi thắng → popup Clear + confetti + tiếp level. |
| M2-03 | **Không thua**: không timer; khi "kẹt" → hướng dẫn dùng Undo/Restart/Hint. |
| M2-04 | Board LUÔN giải được (sinh ngược). Cấm sinh board không lời giải. |
| M2-05 | Undo: quay lại nước trước (lịch sử). Restart: reset level về board gốc. |
| M2-06 | Rewarded ad: **Hint** (gợi ý 1 nước đi đúng) + **Extra tube** (thêm 1 ống trống workspace, tối đa tùy theo level design). |
| M2-07 | Interstitial: giữa 2 level (level clear → next), không trong level đầu. |
| M2-08 | Lưu tiến bộ qua saveData (best-level, current-level, best-moves). Không lỗi không crash (fallback). |
| M2-09 | CẤM gọi mạng ngoài, ads bên thứ 3, self-monetize — chỉ ytgame SDK. |
| M2-10 | Bundle chấp nhận < 30MB initial (target < 5MB), file lẻ < 30MB (target < 512KB), load < 5s, save < 3MB, cấm nén (decompression fallback OK). |
| M2-11 | Responsive mọi aspect (9:16, 16:9, 1:1...), touch + mouse, obey pause/mute, target 13+. |

---

## 7. STATE HANDLING

| State | Cách phát hiện | Xử lý |
|-------|----------------|-------|
| Loading playable | gameReady chưa fire | Spinner, fire gameReady khi sẵn sàng |
| Pre-roll ad | platform tự chạy | Không block; sau ad mới nhận tap |
| Chọn ống nguồn | tap ống có chứa chất lỏng | Highlight ống, sẵn sàng đổ |
| Đổ hợp lệ | tap ống đích | Chuyển lát màu theo luật, cập nhật move-count, sfx |
| Đổ không hợp lệ | đỉnh khác màu / đích đầy | Rung nhẹ ống nguồn + sfx lỗi, KHÔNG đổi board |
| Level Clear | mọi ống clean | Popup + confetti + sdk.sendScore/level, chờ "Next" |
| Undo | bấm undo-btn | Quay lại 1 nước (giảm move-count) |
| Restart | bấm restart-btn | Reset board về gốc, move-count = 0 |
| Hint (rewarded) | bấm hint-btn | Request rewarded; earned → highlight nước đi đúng |
| Extra tube (rewarded) | (level khó) | Request rewarded; earned → thêm 1 ống trống |
| Kẹt (no legal move) | detect | Hiện tooltip nhắc Undo/Restart/Hint |
| Resize | resize event | Scale auto, giữ state |
| Pause/Mute | onPause/onAudioChange | Dừng + tắt âm; resume |

---

## 8. TIÊU CHÍ HOÀN THÀNH

1. `pipeline scaffold/assets/validate/package` chạy qua trên `games/neon-sort.yaml`.
2. Game chạy local browser: Start → Gameplay → chọn ống → đổ → Level Clear → Next.
3. Board sinh luôn giải được (test auto cho N level).
4. SDK: pre-roll, interstitial giữa level, rewarded hint/extra-tube, save/score, pause/mute.
5. Validate Playables pass (size/cấm mạng/responsive/13+).
6. E2E (Hermes QA bằng Playwright + vision) PASS functional + usability.
7. Đóng gói `build/neon-sort.zip` + metadata thật (thumbnail/preview) sẵn sàng nộp.

---

*FILE = NGUỒN SỰ THẬT M2. Agent/dev code theo SPEC. Node/JS chỉ trong `game/`, pipeline Python tái dùng từ M1.*