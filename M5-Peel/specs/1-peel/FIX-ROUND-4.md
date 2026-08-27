# FIX ROUND 4 — M5 "Peel!" (27/08, owner gửi VIDEO playtest, em tách 19 frame soi)

Round 3 ĐẠT: bỏ bàn tay cartoon ✅, dao bám đầu dải ✅, đuôi ribbon rủ + curl ✅, cursor hệ
thống ẩn ✅, ribbon không xuyên quả ✅.

Video (9.4s, localhost dev) lộ 5 lỗi mới — sửa đúng các mục này, không đổi logic/config,
không commit/push:

## 1. Vùng gọt ra VÁ LỔ NỖNH NON (nặng nhất) — phải là dải sạch liền mạch
Hiện tượng: surface đã gọt là các đốm sáng rời rạc (frame 8, 15), như tẩy chứ không như gọt.
Fix:
- Brush mask xóa theo **đoạn thẳng nối giữa 2 sample liên tiếp** (stamp + interpolate —
  không stamp rời theo từng event), bán kính brush = ~6% radius quả, KHÔNG đổi to/nhỏ.
- **Độ trễ cursor bằng 0**: xóa ngay tại pointer position frame hiện tại, không lerp/ease
  vị trí dao. Nếu hiện tại có camera lerp làm mask vẽ chậm hơn tay → tách riêng: mask vẽ
  theo pointer THẬT, chỉ visuals (sprite dao) được phép smoothing.
- Kết quả kiểm bằng mắt: mép trên/dưới của đường gọt song song + sắc, không tai bèo.

## 2. Ribbon cuộn TRÒN CHẶT thành cục ở đầu ngắn (frame 10)
Curl quá tay. Sửa: curl chỉ xuất hiện ở 1/3 đuôi dải; đốt gần head gần như thẳng theo
tiếp tuyến mặt cầu. Đầu cuối xoắn nhẹ hình lòng máng (C-shape), không xoăn tròn O-shape.

## 3. Thêm PARTICLES vụn vỏ bay ở đầu dao
Mỗi đoạn cắt sinh 2-4 hạt nhỏ (màu vỏ, size 2-4px) bắn ra theo pháp tuyến vết cắt, bay
parabol 0.3-0.5s rồi fade. Đây là 50% cảm giác "đã" — bắt buộc có, nhưng tiết chế (không
phun như lửa hàn).

## 4. Pha DETACH trọn vẹn (frame 17 vẫn còn treo)
Khi gọt xong 1 vòng kín: head ribbon nhả dao → CẢ dải chịu trọng lực rơi xoay, đập "phập"
1 nhịp rồi lăn ra mép màn + fade. Nếu clip fail giữa chừng: dải hiện tại co rút về vết
rách + dừng (không bay mất tích).

## 5. Nét đứt guide trên VÙNG ĐÃ GỌT phải biến mất
Mask xóa tới đâu xóa luôn vạch rãnh tới đó (guide nằm trên layer vỏ, cùng bị mask —
không được trôi nổi trên ruột). Round 3 mục 3, chưa làm.

## Gate
typecheck 0 · vitest pass (thêm: mask stamp interpolate — đường đi 2 điểm xa nhau vẫn ra
vệt liền, không đứt gaps) · build sạch.
