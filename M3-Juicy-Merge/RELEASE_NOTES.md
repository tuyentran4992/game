# 📋 JUICY MERGE — PLAYGAMA RELEASE NOTES & UPDATE SUMMARY

Tài liệu này chứa nội dung cập nhật hoàn chỉnh cho phiên bản mới nhất, sẵn sàng để copy-paste trực tiếp lên **Playgama Developer Dashboard** khi upload game.

---

## 📝 1. Nội dung điền vào ô "Describe what's new" (Changelog)

### 👉 Bản tiếng Anh (Khuyên dùng khi Update trên Playgama):
```text
v0.1.1 - Global Leaderboards, Pause Menu & Major UX Polish
- Added Playgama Leaderboard integration (ID: 'best_score') to track, submit, and display global high scores.
- Added in-game "Top Mergers" ranking modal with gold/silver/bronze podium badges and personal rank card.
- Added in-game Pause Menu (⏸️) with Resume, Restart, and Main Menu navigation.
- Fixed top HUD button hitboxes and touch zones to prevent accidental fruit drops or button overlaps.
- Enhanced Playgama Cloud Storage data persistence for cross-session save compatibility.
- Polished layout centering and animations across mobile and desktop viewports.
```

### 👉 Bản tiếng Việt (Dùng tham khảo nội bộ):
```text
v0.1.1 - Bảng Xếp Hạng Toàn Cầu, Menu Tạm Dừng & Tối Ưu UX Toàn Diện
- Tích hợp hệ thống Playgama Leaderboard (ID: 'best_score') tự động lưu và xếp hạng điểm kỷ lục toàn cầu.
- Thêm giao diện popup "Top Mergers" in-game với huy chương Top 1, 2, 3 và thẻ thứ hạng cá nhân.
- Bổ sung nút và Menu Tạm Dừng (⏸️) hỗ trợ Tiếp tục, Chơi lại và Quay về Trang chính.
- Tinh chỉnh vùng cảm ứng (hitbox) thanh công cụ HUD, chống bấm nhầm và chống rơi quả ngoài ý muốn.
- Tối ưu hóa lưu trữ dữ liệu đám mây Playgama Cloud Storage tương thích mọi định dạng.
- Hoàn thiện căn chỉnh giao diện, hiệu ứng âm thanh và đồ họa mượt mà trên mọi màn hình.
```

---

## ⚙️ 2. Thông số Leaderboard đã cấu hình trên Playgama:

* **ID:** `best_score`
* **Name:** `best_score` *(hoặc `Top Mergers`)*
* **Type:** `Numeric`
* **Score order:** `Higher is better`

---

## 📦 3. File Build & Thông số Kỹ thuật:

* **File đóng gói:** `M3-Juicy-Merge/build/juicy-merge.zip`
* **Dung lượng:** `2.27 MB` *(chuẩn siêu nhẹ < 5 MB)*
* **Kiểm thử:** ✅ **118/118 unit tests passed** | ✅ **0 TypeScript errors** | ✅ **12/12 tiêu chí duyệt**
