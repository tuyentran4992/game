Bạn là dev viết test cho game TypeScript — batch B1c, NỬA SAU: **records + telemetry + i18n**.

Hợp đồng B1c (tên hàm khung, event list, khoá storage, copy nộp PC-19) đã ở system prompt — bám ĐÚNG tên đó, KHÔNG mở SPEC/DATA-MODEL, KHÔNG dò tooling.

## File được tạo (chỉ 3 file này — 1a đã lo economy+save, cấm lấn)
- `game/tests/logic/records.test.ts`
- `game/tests/logic/telemetry.test.ts`
- `game/tests/logic/i18n.test.ts`

## Nhiệm vụ — dịch các ca sau thành `it()`, tổng **25–35 case**
`records.test.ts` (ghost/wall/streak — DATA-MODEL §1.3, P2-01/02/03):
1. `starsEncode/starsDecode`: round-trip chuỗi 120 ký tự; decode ra mảng 0..3; chuỗi length ≠120 ⇒ kết quả lỗi có kiểu, không ném.
2. Ghost: màn chưa clear ⇒ không ghi; phá ghost ⇒ đè bản tốt hơn; 2 lần chơi cùng màn ⇒ giữ đúng 1 (TC không có ID — assert theo định nghĩa P2-01).
3. `wallInsert`: top-5 một màn; entry thứ 6 ⇒ cắt phần tử tệ nhất, trần 5; thứ tự sắp xếp ĐÚNG THEO TIÊU CHÍ (thời gian, rồi số lần sai) — tự viết bảng xếp hạng trong test, không gọi lại hàm so của src.
4. `streakNext`: đúng ⇒ +1; sai ⇒ về 0; hàm thuần, không trạng thái ẩn (định nghĩa P2-02: streak là của PHIÊN).
5. `shareCode` của B1a dùng lại được: cùng (levelIndex, score) ⇒ cùng mã; **assert bằng ví dụ mã dựng tay theo format `GAP-XXXXX-<score>`**, không gọi `shareCode` hai lần so nhau (đó là tự tham chiếu).
6. Không persist đề bài: gọi `levelSpec(...)` xong serialize save mẫu ⇒ không key nào chứa `folds|options|answerHoles|holes` (TC-GEN-03).

`telemetry.test.ts` (ring-buffer ≤100KB — PC-15, nhóm G):
7. `push` 10.000 event qua ring cap 100KB ⇒ `bytesOf ≤ 100*1024` (số thật, không ước lượng); event cũ nhất bay trước, còn nguyên các event mới (TC-NET-03).
8. Timestamp ĐƠN ĐIỆU theo thứ tự push; push event timestamp nhỏ hơn ⇒ từ chối hoặc đẩy về cuối — hành vi PHẢI xác định, assert đúng 1 nhánh.
9. Event không đúng schema (thiếu `t`, tên event ngoài list §6 của pack) ⇒ `validateEvent` trả `{ok:false, errors}` nêu tên field; ring không đổi (dữ liệu bẩn bị chặn ở biên).
10. Storage mock `throw` ⇒ logger không chết theo game: push trả ring hợp lệ, không ném (TC-NET-04).
11. Set tên event của `telemetry.ts` phủ đúng danh sách §6: assert list fixture của test ⊆ registry event (đủ đo funnel P4-06), không assert chiều ngược lại (key mồ côi chưa code hết sẽ oan).

`i18n.test.ts` (PC-19, nhóm K):
12. `t('hud.continue', dict, {n: 23})` ⇒ `Continue — Level 23` (placeholder `{n}`).
13. Key thiếu ⇒ fallback có chủ đích (chính key hoặc default) + `missing=true`, **không ném** (TC-I18-04).
14. Copy nộp (TC-I18-03): dictionary EN phải đủ 9 chuỗi nguyên văn khai ở §7 của pack — đối chiếu TỪNG chuỗi bằng constant trong test.
15. Quét hardcode (TC-I18-01): đọc source các file `src/logic/economy.ts`… bằng `node:fs` + regex chuỗi literal dài >2 từ có hoa/thường, loại whitelist key i18n + testid ⇒ 0 vi phạm. Đây là source-scan hợp lệ trong Node, không cần DOM.
16. Không tên cũ (TC-I18-05): scan chuỗi hiển thị không chứa `GẤP`; tên game = `Paper Crease`.
17. `collectUsedKeys`: dict phủ đủ key dùng trong code; key mồ côi quá ngưỡng fixture ⇒ báo trong `errors`, không ném.

## Luật làm test (bắt buộc)
- Test PHẢI ĐỎ vì `../../src/logic/records|telemetry|i18n` chưa tồn tại (import-missing là RED hợp lệ). CẤM tạo file trong `src/`.
- **Cấm oracle tự tham chiếu**: không tính kỳ vọng bằng chính hàm đang test; mọi số/chain mong đợi là constant viết tay.
- Mỗi `it()` assert GIÁ TRỊ CỤ THỂ; tên case ghi rule phủ (PC-15/PC-16/PC-19).
- CẤM sửa `helpers.ts`, test cũ B1a, và 2 file test của 1a. CẤM import chéo giữa file test.
- Ngân sách **90 lượt**. Kiểm đỏ từng file: `npx vitest run tests/logic/records.test.ts`.
- KHÔNG commit/push.

BÁO CÁO CUỐI: 3 file · tổng case · output vitest THẬT (phải RED vì missing module) · bảng case → PC-xx · hợp đồng mơ hồ ⇒ ghi "KIẾN NGHỊ HỢP ĐỒNG", không tự chế.
