Bạn là dev viết test cho game TypeScript — BƯỚC 1 của batch B2, NỬA ĐẦU: adapter + Null Object. Đọc trước khi viết:
- /data/youtube-playables/M11-Gap/harness/packs/b2.md (gói ngữ cảnh B2 — hợp đồng tên, khoá storage, placement, điều kiện node/no-DOM)
- /data/youtube-playables/M11-Gap/specs/1-paper-crease/TEST-CASES.md (nhóm F "MockAds ghi lại thứ tự/lời gọi", nhóm I pause/mute, nhóm L TC-SAO-01/02/03)
- /data/youtube-playables/M11-Gap/docs/STRUCTURE.md §1/§4 (cây file + hợp đồng type)
- src/logic/types.ts (chỉ đọc type để chữ ký khớp — KHÔNG import luật từ logic vào test adapter)

NHIỆM VỤ: viết bộ test cho `src/platform/` (chưa tồn tại file nào — test PHẢI ĐỎ):
1. `tests/platform/null-adapter.test.ts` — phủ TC-SAO-01: mọi method của `PlatformAdapter` (storage.get/set, ads.showRewarded/showInterstitial/available, lifecycle.onPause/onResume/mute) trên null adapter ⇒ 0 exception; `ads.available` false; show* trả "unavailable" NGAY, không promise treo; storage đọc null / ghi no-op.
2. `tests/platform/standalone-full-loop.test.ts` — phủ TC-SAO-02: boot → level 1 → chọn đúng → next → 5 màn CHỈ qua interface adapter (chưa có thì mock bằng object tự dựng trong helper); save in-memory chạy, storage ném lỗi giữa đường ⇒ không sập (tinh thần TC-NET-04).
3. `tests/platform/registry.test.ts` — phủ TC-SAO-03: `platformRegistry` resolve đủ 3 khoá `standalone`/`playgama`/`ytgame`; cả 3 cùng shape `PlatformAdapter`; không có nhánh `if (platform === ...)` quan sát được từ registry.
4. `tests/platform/playgama-adapter.test.ts` + `tests/platform/ytgame-adapter.test.ts` — bridge GIẢ tiêm vào (object fake dựng sẵn rồi truyền/cài lên globalThis trước khi gọi): storage map đúng khoá `m11.save`/`m11.save.good`/`m11.wardrobe`/`m11.log`; rewarded trả thành/thất bại/bị từ chối ⇒ adapter trả về đúng 3 trạng thái; lifecycle: bridge phát sự kiện pause/resume/mute (`onAudioEnabledChange`) ⇒ callback đã đăng ký chạy đúng thứ tự; bridge VẪN absence ⇒ adapter không crash.
5. `tests/platform/helpers/fakes.ts` — fake bridge + recorder theo tinh thần "MockAds ghi lại thứ tự/lời gọi" (test soi được THỨ TỰ, không chỉ số lần).

QUY TẮC VIẾT TEST:
- Tên public lấy ĐÚNG trong pack §1–2 (`PlatformAdapter`, `platformRegistry`, `storage.get/set`, `ads.showRewarded/showInterstitial/available`, `lifecycle.onPause/onResume/mute`, `nullAdapter`). Pack không chốt tên hàm cụ thể (vd `createNullAdapter`) ⇒ chọn tên thuận nhất, CHÚ THÍCH bằng 1 dòng `// tên chốt ở test này` cạnh chỗ export được trông đợi — code phải theo test, test là hợp đồng.
- KHÔNG lấy code src làm oracle: fake tự dựng, số tự hardcode (vd kỳ vọng đúng 1 lời gọi rewarded cho placement `undo`).
- Mọi `it()` assert giá trị cụ thể (không `toBeDefined` suông), tên case ghi rule phủ (PC-13/17/20). Số case mục tiêu 20-40.
- CẤM gọi mạng thật trong test: không `fetch`, không URL ngoài, không tải SDK. Chỉ object fake.
- Test import tương đối `../../src/platform/<file>`; file src chưa có ⇒ test đỏ vì import/NOT_IMPLEMENTED là ĐÚNG.
- Chỉ tạo/sửa trong `game/tests/platform/`. CẤM sửa `src/`, `tests/logic/`, package.json, specs/, docs/.

LỆNH CHỨNG MINH ĐỎ (dán output thật): `cd /data/youtube-playables/M11-Gap/game && npx vitest run tests/platform`
KHÔNG commit/push. Xong trong ≤90 lượt.

BÁO CÁO CUỐI: file test đã tạo · tổng case · bảng case → rule PC-xx · output đỏ THẬT (lý do từng file) · danh sách tên hàm đã chốt giúp code (từ chú thích).
