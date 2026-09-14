# GÓI NGỮ CẢNH B1c — Kinh tế & Lưu trữ (economy · save · records · telemetry · i18n)

Phủ rule PC-11/12/15/16/19 · ca TEST-CASES: nhóm E (TC-INC-01..06), H (TC-SAV-01..07),
G (TC-NET-03/04), K (TC-I18-01..05) + ERR-01/02/09/10/11. src CHƯA có 5 file này —
mọi tên hàm/field dưới đây là **hợp đồng theo DATA-MODEL**, trích nguyên văn, cấm bịa thêm.

## 1. Hợp đồng ĐÓNG BĂNG từ B1a (có thật trong src/logic — CẤM đổi chữ ký)
- `rational.ts`: `rat/add/sub/mul/div/eq/cmp/toNumber/key/pointKey/inUnit/inSheet/point/ratPoint/toPoints/flatPoints/samePointSet`.
- `types.ts`: `Rat`, `Point`, `RatPoint`, `FoldKind='H'|'V'|'D'`, `PunchAction`, `CutAction`, `SheetAction`, `Option`, `LevelSpec`.
- `generator.ts`: `levelSpec(seed, levelIndex, cfg) -> LevelSpec` · `levelConfigFor(chapters, levelIndex) -> ChapterLevelConfig` · `shareCode(levelIndex: number, score: number): string` (hàm THUẦN, mã `GAP-<5 ký tự>-<điểm>` — records dùng lại, không viết hàm băm thứ hai).
- `validator.ts`: `validateSpec`, `bitmapOf`, `hamming`, `RASTER_GRID=16`, `MIN_RASTER_DISTANCE=6`, `OPTION_COUNT=4`.
- `tests/logic/helpers.ts`: `GAME_SEED='M11-GAP-B1A-FIXTURE'`, `R()`, `p()`, `flatPts()`, `cfgFor()`, `cfgCampaign()`, `CAMPAIGN_LEVELS=120`, `serializeSpec()` — có sẵn, dùng lại, KHÔNG sửa.

## 2. Chữ ký khung cho 5 file mới (định danh ĐÓNG; tham số/trả về chi tiết hơn do test chốt)
- `economy.ts` (Registry + data): `inkAward(stars: 0|1|2|3, streak: number, table: InkTable): number` · `canPurchase(ink: number, price: number): boolean` · `applyPurchase(state, skinId, skins): { ok; reason?; ink; skins_owned; skin_equipped }` (hàm THUẦN — trả state mới, không mutate) · `unlockAlbum(items, id, cap)` · `awardBadge(badges, badgeId, cap)` · `isAlreadyOwned(id, owned)`.
- `save.ts` (Memento + migration): `serializeSave(s): string` · `parseSave(json): { ok; save?; error? }` (KHÔNG BAO GIỜ ném vì dữ liệu bẩn) · `SCHEMA_VERSION: number` (hiện hành `1`, DATA-MODEL §2.1) · `defaultSave()` · `migrateSave(raw, from: number): { save; steps: number[] }` (chuỗi v1→v2→…, registry bảng tra) · `rescueLoad(mainJson, goodJson, wardrobeJson): { save; source: 'main'|'good'|'fresh' }` · `applyWrite(nowSave, storedSave): 'write'|'take-storage'` (luật so `rev`).
- `records.ts` (Memento): `starsEncode(list)/starsDecode(s)` — sao về RECORDS, economy chỉ TIÊU THỤ chuỗi; `ghostDecide(ghost, level, betterOn): boolean` · `wallInsert(wall, level, entry, cap=5): list` · `streakNext(streak, correct: boolean): number` (state trong RAM, không persist).
- `telemetry.ts` (Ring buffer): `makeRing(capBytes): Ring` (immutable — trả ring mới) · `push(ring, event): Ring` · `bytesOf(ring): number` · `eventsOf(ring): LogEvent[]` · `validateEvent(e): { ok; errors[] }`.
- `i18n.ts` (Registry): `t(key: string, dict: Dict, params?: Record<string, string|number>): { text: string; missing: boolean }` · `DICTIONARY_EN` (hằng dữ liệu nội file; nếu gate-smell G1 gọi là file dữ liệu thì khai `--data-files`, KHÔNG tự ý sửa tools/ mà phải báo trong báo cáo) · `collectUsedKeys(sources: Map<file, string[]>): string[]`.
- Port storage thuần cho save/telemetry: `KV = { get(k: string): string | null; set(k: string, v: string): boolean; keys(): string[] }` — test dùng `FakeKV` viết TRONG file test, cấm import từ src.

## 3. Khoá storage + schema save (trích DATA-MODEL §1.2–1.3 — nguồn sự thật duy nhất)
- Khoá: `m11.save` (object chính ≤30KB thường dùng) · `m11.save.good` (mirror bản hợp lệ kế trước) · `m11.wardrobe` (id đã mua skin/album/huy hiệu, **chỉ append**) · `m11.log` (ring-buffer event, **≤100KB cứng**).
- Field `m11.save` (struct `SaveV1`, STRUCTURE §4): `version` (=1) · `rev` · `first_play_date` · `dates_played` · `last_played_date` · `best_level` · `current_level` · `stars` (chuỗi nén 120 ký tự '0'–'3') · `chapter_seals` (8 ký tự '0'/'1') · `ink` · `skins_owned` (⊆ 8 id skins.json; **bản sao đọc-nhanh**, nguồn thật `m11.wardrobe`) · `skin_equipped` · `album_items` (≤14) · `badges` (≤6) · `ghost` (map màn→chuỗi nén) · `wall` (map màn→top-5) · `streak_best` · `ghost_beat_count` · `plays_count` · `clears_count` · `campaign_completed` · `master_unlocked` · `master_stars` · `sound_on` · `language` (mặc định `en`) · `funnel_done`.
- **KHÔNG BAO GIỜ nằm trong save** (§1.5): đề bài/seed từng màn · trạng thái giữa màn · **streak hiện hành của phiên** (reset khi tắt game — lưu vào là sai luật P2-02) · mã chia sẻ · ảnh canvas · danh sách màn đã khoá (suy từ `stars` + gate 12/15).
- Trần dung lượng (§1.6, PC-16): serialize worst-case (120 ghost + 120 wall + 365 dates) **≤100KB**; ước ≈25KB.

## 4. Luật version + cứu hộ save (DATA-MODEL §2 — PC-16)
1. Chỉ THÊM field, không đổi tên/kiểu; field lạ chưa biết ⇒ **giữ nguyên**, không xoá. Mỗi đổi hình dạng ⇒ `version`+1 + hàm migrate thuần, chạy chuỗi `v1→v2→…` một lần lúc boot.
2. Migrate KHÔNG được làm mất `skins_owned`/`album_items`/`badges` đang có (§2.2 mục 2 — ca nghiệm thu).
3. `version` save CAO HƠN game ⇒ không ghi đè, giữ field quen biết (§2.4 mục 4).
4. Thứ tự cứu hộ (§2.3), dừng ở bước thành công đầu: `m11.save` OK → chơi tiếp · hỏng → `m11.save.good` OK → mirror · cả hai hỏng → save mới default: **màn 1 + sao 0**, skin/album/huy hiệu **đọc từ `m11.wardrobe`** ⇒ không mất skin đã mua · wardrobe cũng hỏng → `skin-mặc-định`, coi như thiết bị mới. Không crash, không khoá màn.
5. Thứ tự ghi (§7.2): `rev`+1 → serialize → round-trip parse OK trong RAM **rồi mới** đụng storage → copy sang `m11.save.good`. Storage có `rev` cao hơn RAM ⇒ **bỏ ghi, nhận bản storage về**. SDK báo lỗi ⇒ nuốt lỗi có kiểm soát + event `save_error` vào log, chơi tiếp. KHÔNG ghi giữa màn (§7.1).

## 5. Kinh tế Mực Gấp + skin/album/huy hiệu (PC-11/12 — DATA-MODEL §3.2/3.3/3.4)
- Sao (stars.json §3.3): 1=thắng · 2=thắng không hint · 3=thắng ngay lần đầu · skip=0.
- `ink-award` = `mức_nền_theo_sao` × sao + `thưởng_mốc_streak` (mốc 3/5/8, P2-02); **hệ số là ⚠️ PLACEHOLDER** → phải nằm trong `game/config/ink.json` (tạo mới), logic CHỈ đọc bảng qua tham số/table, CẤM hardcode trong scene.
- Skin: `config/skins.json` (8 skin — `config/` đang rỗng, B1c tạo) field `skin_id` (`skin-` prefix) `name` `pattern_asset` `crease_color` `price_ink` `default_equip` (đúng 1 skin miễn phí mặc định). Giá đề xuất 40/60/90/130/180/240/320 Mực = **PLACEHOLDER chờ duyệt**, không phải số neo. Thiếu 1 Mực ⇒ từ chối, Mực + owned không đổi. Mua lại skin đã owned ⇒ từ chối idempotent. **CẤM** mọi API tên/ý nghĩa tiền thật (TC-INC-03).
- Album ≤14 (dedupe theo mẫu, thêm trùng không tăng số) + huy hiệu ≤6 (mỗi chương tối đa 1, cấp lại lần 2 bị chặn) — metadata ở `config/album.json`, save chỉ chứa id.

## 6. Telemetry event list (PC-15 — DATA-MODEL §5.1, trích tên event)
`session_start` `session_end` `level_start` `level_end` `level_result` `level1_shown` `first_tap` `first_answer` `unfold_seen` `resume_shown` `resume_tapped` `rewarded_offer` `rewarded_watch` `interstitial_shown` `skin_purchase` `skin_equip` `album_opened` `badge_earned` `streak_milestone` `ghost_beaten` `code_generated` `code_entered` `code_beaten` `copy_clicked` `image_saved` `campaign_completed` `master_start` `level_replay` `date_mark` (+ `save_error` từ §7.2).
- 1 dòng JSON ≤120B; tràn ⇒ **đẩy event cũ nhất**; timestamp đơn điệu; ring ≤100KB; 0 upload, 0 call mạng.

## 7. i18n (PC-19 — SPEC §4.3, TEST-CASES nhóm K)
- UI mặc định EN; mọi chuỗi hiển thị đi qua `t()`. `t(key thiếu)` ⇒ fallback CÓ CHỦ ĐÍCH (trả chính key hoặc default EN) + `missing=true`, **không ném**.
- Copy nộp PHẢI có (TC-I18-03, nguyên văn): `Paper Crease` · `PLAY` · `Continue — Level {n}` (placeholder `{n}`) · `UNFOLD` · `Peek a fold` · `Undo (watch video)` · `Chapter complete` · `You unfolded all 120` · `Right on the crease — that punch only makes 2 holes.`
- Scan source: 0 chuỗi hardcode trong scene/logic ngoài dictionary + whitelist key/testid; 0 chuỗi còn tên cũ `GẤP` (DoD §8.8).

## 8. Bẫy đã biết (kiểm trước khi báo xong)
- **Purity + thời gian**: `Date.now`/`performance.now`/`new Date` bị gate-smell CẤM trong `src/logic`. Mọi timestamp/ngày (`t`, `date_mark`, `first_play_date`) là **tham số chuỗi/số do caller render/platform bơm vào**; logic thuần, CẤM tự đọc đồng hồ.
- Streak hiện hành KHÔNG nằm ở đâu trong save cả (chỉ `streak_best`) — economy nhận `streak` như tham số thuần.
- Economy không tự parse chuỗi `stars` — phân lớp: records encode/decode, economy nhận `stars: 0|1|2|3` đã bóc.
- CẤM `import` file test giữa 1a↔1b: hàm dùng chung đã có trong pack này — ai tạo helper riêng trong tests/logic là đụng nhau.
- Storage mock luôn có chế độ `throw` (quota/ẩn danh) ⇒ mọi hàm save phải đường-lỗi trả kết quả, không ném (TC-NET-04, TC-SAV-07).
- `m11.wardrobe`: mở khoá nào ghi thêm id đó; KHÔNG read-modify-write cả list (§7.2 mục 4).
- Config/JSON động: validate input ở biên, trả `{ok, errors}` kiểu `validateSpec`, không `catch {}` nuốt im lặng.
- Không sửa `src/logic` cũ của B1a; file mới ≤250 dòng (gate G1).

## 9. Lệnh
- Cổng (code chạy ĐÚNG 1 LẦN ở cuối): `cd /data/youtube-playables/M11-Gap/game && npm run gate`
- Test đỏ ban đầu do import missing module — đó là RED hợp lệ (B1a: `economy.ts`… chưa tồn tại).
- Tự kiểm nhanh từng file test: `npx vitest run tests/logic/<file>.test.ts`
- Quét purity: `grep -nE "Math.random|Date.now|performance.now|document|window|fetch" src/logic/*.ts` ⇒ phải rỗng (trừ trong comment).
