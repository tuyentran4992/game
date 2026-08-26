# 📖 BẢNG HƯỚNG DẪN CÁC LỆNH CHẠY DỰ ÁN M3 JUICY MERGE

Tất cả các lệnh dưới đây đều được chạy từ thư mục:
📂 **`c:\Users\ADMIN\Desktop\Projects\game\M3-Juicy-Merge\game`**

---

## 🚀 1. Các lệnh Chạy thử (Development / Playtest)

| Lệnh | Ý nghĩa & Mục đích |
| :--- | :--- |
| **`npm run dev:web`** *(hoặc `npm run dev`)* | **Chạy bản Web / Playgama trên trình duyệt máy tính**<br>- Tự mở local dev server (`http://localhost:5173`)<br>- Có tính năng Hot Reload (sửa code là màn hình tự cập nhật ngay) |
| **`npm run dev:reddit`** | **Chạy Playtest trực tiếp trên Reddit**<br>- Kết nối trực tiếp vào subreddit `r/JuicyMerge`<br>- Tự động stream log và đồng bộ lên bài post Reddit |

---

## 📦 2. Các lệnh Đóng gói & Phát hành (Build / Publish)

| Lệnh | Ý nghĩa & Mục đích |
| :--- | :--- |
| **`npm run package:playgama`** | **Đóng gói file ZIP nộp lên Playgama**<br>- Tự động build HTML5 web bundle<br>- Xuất file zip chuẩn tại: `M3-Juicy-Merge/build/juicy-merge-playgama.zip` (đã kèm đầy đủ asset, âm thanh và `playgama-bridge-config.json`) |
| **`npm run build:web`** | **Build bản Web tĩnh (HTML5 / Standalone)**<br>- Xuất toàn bộ file tĩnh vào thư mục `dist/` để host lên Vercel, Netlify, Itch.io, hoặc website riêng |
| **`npm run build:reddit`** | **Build bản Reddit Devvit**<br>- Đóng gói client (`dist/client`) và backend server Redis (`dist/server`) |
| **`npm run launch:reddit`** | **Xuất bản chính thức lên Reddit App Directory**<br>- Kiểm tra typecheck + linting<br>- Upload bản build và gửi đơn kiểm duyệt lên Reddit App Directory |

---

## 🧪 3. Các lệnh Kiểm tra chất lượng (Testing & Code Quality)

| Lệnh | Ý nghĩa & Mục đích |
| :--- | :--- |
| **`npm run test`** | **Chạy bộ 118 Unit Tests tự động** (Vitest)<br>- Kiểm tra logic merge trái cây, tính điểm, combo, daily streak, album bách khoa |
| **`npm run test:types`** | **Kiểm tra lỗi TypeScript (`tsc --build`)**<br>- Đảm bảo 100% không có lỗi type |
| **`npm run lint`** | **Kiểm tra chuẩn code ESLint**<br>- Đảm bảo code sạch, không có biến thừa |
| **`npm run prettier`** | **Tự động định dạng (Format) lại toàn bộ code** |

---

## 🌐 4. Các đường link quan trọng

- **Link bài post Reddit chơi game trực tiếp:**  
  👉 https://www.reddit.com/r/JuicyMerge/comments/1vywiwk/juicy_merge_drop_merge_grow/
- **Link Subreddit của game:**  
  👉 https://www.reddit.com/r/JuicyMerge/
- **Cổng quản lý Developer Reddit App:**  
  👉 https://developers.reddit.com/apps/juicymerge
