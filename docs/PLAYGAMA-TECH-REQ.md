# PLAYGAMA — TECHNICAL REQUIREMENTS (bản chụp 07/09/2026)

Nguồn: wiki.playgama.com (link anh Tuyền gửi 07/09, email tracking url9687.playgama.com).
Game làm ra cho kênh Playgama PHẢI đáp ứng đủ danh sách này trước khi submit (cửa B6 packaging + gate verify).

## Bridge & mạng
- Playgama Bridge tích hợp trong game (SDK: wiki /bridge-sdk/getting-started)
- KHÔNG yêu cầu đăng nhập/ủy quyền dịch vụ ngoài để chạy game
- KHÔNG nhúng analytics (GA4 hay tương tự)
- KHÔNG có khóa theo URL (no technical means of limiting operation due to URL opened from)

## Kích thước & đóng gói
- Tổng file game ≤ 300 MB khi upload archive
- `index.html` ở GỐC archive; tên file/thư mục chỉ ký tự Latin

## Mobile
- Chạy full-screen khi gameplay/startup
- Có nhập liệu thì keyboard tự hiện khi click vào ô
- Đổi orientation/resize: visual KHÔNG biến dạng kéo lệch; nếu chỉ hỗ trợ 1 orientation thì khai báo giá trị tương ứng khi tạo draft (orient khác hiện placeholder xoay máy)
- TIẾN TRÌNH GAME PHẢI ĐƯỢC LƯU khi xoay thiết bị  ← (kiểm tra kỹ: slice state + score + unlocked level)
- Điều khiển hoàn toàn bằng gesture (được bổ trợ accelerometer)
- KHÔNG hiện system player ở bất kỳ browser nào
- KHÔNG có thông báo WebGL khi mở game

## Desktop
- Active field kéo giãn tới sát mép vùng khả dụng (trừ sticky banner); aspect ratio active field ≤ 1:2
- Resize: visual không biến dạng
- Điều khiển mặc định bằng bàn phím hoặc chuột
- KHÔNG hiện system player
- Không vượt biên màn hình / không cut-off phần tử
- KHÔNG có scrollbar hệ thống của trang (scroll nội dung trong game tự làm được)
- Phần tử/text không đè nhau; mọi popup có dấu X/nút đóng
- Chơi được bằng MỘT TAY và giữ được main scene không phải scroll/swipe thêm (ngoại lệ chiến thuật/RPG field lớn)

## Ổn định
- Không lỗi kỹ thuật/crash/trefreeze khi: xoay màn hình, long-press field, gesture/swipe, minimize browser, mở ad, quay lại từ history, các tương tác khác

## Tương thích
- Browsers: Chrome, Firefox, Opera, Safari, Edge
- OS: Windows Vista+; macOS 10.6+; Android 5.0+; iOS 9.0+
