Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B3a (đợt rev2).

Review độc lập báo FAIL đúng các mục sau (kèm bằng chứng sẵn). Sửa ĐÚNG các mục này, giữ nguyên thứ đã PASS:

[3a-code] | C2 | FAIL | 0 test nào dựng scene: `grep -rn "new PlayScene|new TitleScene|new Phaser.Game" tests/` = 0 kết quả; view-b3a-contract.test.ts:186-190 chỉ kiểm tra CHUỖI testid có xuất hiện trong source, :205-212 chỉ cần substring `makeTestidHook(` ⇒ PlayScene không đăng ký rect thật vẫn xanh; header view-b3a-timing.test.ts:47-48 ghi "Hành vi của scene ... contract.test.ts DỰNG scene thật" là SAI |
[3a-code] | C6 | FAIL | cfg đề production KHÔNG khớp cfg mà test nghiệm: main.ts:97-106 `CHAPTER_SHAPES[0].foldCount=2` trong khi logic ch1 `layers:2`→foldCount 1 (progression.ts:45 + chapters.ts:114, chính test assert at view-b3a-timing.test.ts:473); ch5/6/7 logic = 2 lớp→foldCount 2 (layers 4,4,5) vs main.ts:102-104 = 3; useCut/useDiagonal cũng khác. PC-03/PC-04 càng không được cài ở runtime: `validateSpec` (validator.ts:211) có 0 call site trong src/ ⇒ đề đi từ main.ts:127 tới màn hình chưa qua cổng nào |
[3a-code] | C10 | FAIL | số ms khai hai nơi, vi phạm luật do chính module ghi: `SLIDE_MS = 400` ở SheetView.ts:305 thay vì `DUR` (unfoldPlan.ts:31 "số ms không được khai lại ở nơi khác"); `TOUCH.tapScale = 1.03` (unfoldPlan.ts:205) có test chốt (timing:318) nhưng 0 nơi dùng ⇒ DS:95 scale chạm chưa cài, code chết; comment SheetView.ts:189 "lặp ĐÚNG repeat nhịp" sai语义 Phaser (repeat:2 = 3 chu kỳ) |
[3a-code] | C12 | FAIL | "đúng 1 đáp án / 4 ô phân biệt" chỉ được chứng minh cho cfg của logic; đường đi thật (main.ts:126-128) dùng cfg khác (C6) và KHÔNG gọi validateSpec (0 call site) ⇒ PC-03/PC-04 không được kiểm ở runtime. View vẽ đủ 4 ô tĩnh: testids.ts:76-78 + layout.ts:88-93 (options.length 4, test geometry:164-179) |

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.
