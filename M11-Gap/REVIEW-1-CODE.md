# REVIEW-1 — CODE CÓ ĐÚNG KHÔNG (correctness)

> Phiên review ĐỘC LẬP #1 · session MỚI (không `--continue`) · **CẤM sửa file** · mọi kết luận phải kèm `file:dòng` + output lệnh thật.
> Phạm vi: chỉ code + test của batch đang chấm (B1a: PC-02/03/04). Không chấm kiến trúc/pattern (đã có REVIEW-2).

| # | Tiêu chí | Cách kiểm (phải dán bằng chứng) |
|---|---|---|
| C1 | Test chạy được và XANH | `cd game && npm run test:logic` — dán output; ghi rõ số test pass/fail/skip |
| C2 | Không test "sáo rỗng" | liệt kê MỌI `it()` không assert giá trị thật (vd `expect(true)`, assertion trên biến tự tính lại) |
| C3 | Case 10.000 đề là THẬT | đọc code test: vòng lặp đủ 10.000, không early-return/không `if (i>100) break`; thời gian chạy hợp lý |
| C4 | Determinism | tự chạy 2 lần cùng (seed, levelIndex) → so kết quả (được phép viết snippet nháp trong `/tmp`, KHÔNG đụng repo) |
| C5 | Chân lý hình học khớp bản Python cũ | đối chiếu assert 4/2/1/8/3 lỗ với `game-gap-giay/code/g01_fold_sim.py` (được chạy `python3` để so, không sửa) |
| C6 | Rule của batch được IMPLEMENT thật (không chỉ có test) | chỉ rõ hàm/file nào thực thi PC-02/03/04; rule nào CHƯA code |
| C7 | Không bịa ngưỡng/hằng số | mọi hằng số phải có tên rõ + nguồn (SPEC/TEST-CASES) hoặc đọc từ config |
| C8 | Purity theo hợp đồng | grep `phaser` / DOM / `@game/sdk` trong `src/logic` = rỗng · `Math.random` = rỗng · `fetch|XMLHttpRequest|WebSocket` = rỗng |
| C9 | Kiểu & typecheck | `npm run typecheck` 0 lỗi · không `any` · không `@ts-ignore` · không `as unknown as` |
| C10 | Edge/đầu vào xấu | nêu hành vi khi: `punchPoints` rỗng, điểm ngoài biên, `levelIndex` âm/rất lớn, `foldCount=0` — có xác định, không crash im lặng |
| C11 | Không còn `NOT_IMPLEMENTED` thuộc batch này | grep + liệt kê |
| C12 | Không rác | không dead code, không `console.log`, không comment kể lể |

**Kết luận bắt buộc:** PASS / FAIL (danh sách C#) + **3 rủi ro lớn nhất** + **điểm nào KHÔNG KIỂM CHỨNG ĐƯỢC và vì sao**.
