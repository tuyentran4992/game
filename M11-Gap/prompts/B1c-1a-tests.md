Bạn là dev viết test cho game TypeScript — batch B1c, NỬA ĐẦU: **economy + save**.

Hợp đồng B1c (tên hàm khung, field save, khoá storage, luật migrate/cứu hộ, bảng kinh tế) đã ở system prompt — bám ĐÚNG tên đó, KHÔNG mở SPEC/DATA-MODEL, KHÔNG dò tooling.

## File được tạo (chỉ 2 file này — 1b lo phần còn lại, cấm lấn)
- `game/tests/logic/economy.test.ts`
- `game/tests/logic/save.test.ts`

## Nhiệm vụ — dịch các ca sau thành `it()`, tổng **30–40 case**
`economy.test.ts` (nhóm E — PC-11/12):
1. `inkAward` khớp TỪNG dòng bảng tra fixture (tự định nghĩa bảng `InkTable` trong test: sao 0..3 × streak mốc 3/5/8) — phủ TC-INC-01.
2. Mua skin: đủ Mực ⇒ owned+equip+trừ đúng giá; **thiếu 1 Mực** ⇒ từ chối, Mực/owned không đổi (TC-INC-02).
3. Mua lại skin đã owned ⇒ từ chối, idempotent (TC-INC-04).
4. API surface của economy không có đường tiền thật: không tên hàm/đối tượng nào `money|purchaseIap|price_usd|payment` trong export — assert bằng `Object.keys(module)` (TC-INC-03).
5. Album: thêm 20 mẫu có trùng ⇒ ≤14, dedupe theo id (TC-INC-05). Huy hiệu: ≤6, cấp trùng lần 2 bị chặn (TC-INC-06).

`save.test.ts` (nhóm H + ERR-01/02/09/10 — PC-16):
6. `defaultSave()` serialize ⇒ parse lại deep-equal; top-level có `version` số (TC-SAV-01).
7. Chuỗi `stars` đúng 120 ký tự '0'–'3' mặc định '0'.
8. Migrate: fixture save không có field mới (đóng vai v0→v1) ⇒ điền default, dữ liệu cũ **không mất**; đặc biệt `skins_owned`/`album_items`/`badges` giữ nguyên giá trị (TC-SAV-02).
9. `version` tương lai (999) ⇒ không crash, không wipe, trả phần quen biết + cờ rõ ràng (TC-SAV-05).
10. JSON corrupt (`'{"version":1,"ink":'` giữa chuỗi) ⇒ `parseSave` trả `{ok:false}` — **không được ném** (TC-SAV-03).
11. Cứu hộ theo đúng thứ tự §4 của pack: main hỏng + good OK ⇒ lấy good; cả hai hỏng ⇒ fresh level 1 + sao 0 mà **skin còn nguyên từ wardrobe** (TC-SAV-03, vế PC-16).
12. Thiếu từng field (`stars`, `ink`, `skins_owned`, `album_items`, `sound_on`) ⇒ fill default, không crash (TC-SAV-04).
13. Worst-case: 120 ghost × 80B + 120 wall × 5 + 365 dates ⇒ `serializeSave` UTF-8 **≤100KB** (TC-SAV-06). Đếm byte bằng `new TextEncoder().encode(s).length` — con số thật, không ước lượng.
14. Luật `rev`: storage `rev` cao hơn RAM ⇒ `applyWrite` trả `'take-storage'`, RAM không bị đè im lặng (§4 mục 5).
15. FakeKV luôn `throw`/trả false ⇒ save không chết, trả kết quả lỗi có kiểu (TC-SAV-07/TC-NET-04).

## Luật làm test (bắt buộc)
- Test PHẢI ĐỎ vì `../../src/logic/economy` và `../../src/logic/save` chưa tồn tại (import-missing là RED hợp lệ). CẤM tạo file trong `src/`.
- **Cấm oracle tự tham chiếu**: không được tính kết quả mong đợi bằng chính hàm đang test (vd đừng `expect(inkAward(2,5)).toBe(inkAward(2,5))`). Mọi số kỳ vọng là constant viết tay từ fixture/bảng trong test.
- Mỗi `it()` assert GIÁ TRỊ CỤ THỂ (không `toBeDefined`/`not.toThrow` suông); tên case ghi rule phủ (PC-11/PC-12/PC-16).
- Fixture bảng giá/hệ số Mực định nghĩa TRONG file test (config/*.json thuộc bước code) — hàm economy nhận bảng qua tham số.
- CẤM sửa `tests/logic/helpers.ts` và test cũ của B1a.
- Ngân sách **90 lượt**. Kiểm đỏ từng file: `npx vitest run tests/logic/economy.test.ts`.
- KHÔNG commit/push.

BÁO CÁO CUỐI: 2 file · tổng case · output `npx vitest run tests/logic/economy.test.ts tests/logic/save.test.ts` THẬT (phải RED vì missing module) · bảng case → PC-xx · chỗ nào hợp đồng pack mơ hồ ⇒ ghi "KIẾN NGHỊ HỢP ĐỒNG", không tự chế.
