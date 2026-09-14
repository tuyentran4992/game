// Pattern: Pure formatter (mã chia sẻ offline)
// TRÁCH NHIỆM: định dạng GAP-<5 ký tự>-<điểm> cho records (B1c đọc lại). Hàm THUẦN:
//   cùng (levelIndex, score) ⇒ cùng mã, không đụng thời gian/bộ nhớ/random (PC-02).
// VÌ SAO CÓ requireShareInt: mã rác ("GAP-XXXXX-NaN") vẫn ĐÚNG HÌNH THỨC để B1c nạp vào
//   records ⇒ phải chặn input bẩn ở đây, không chờ tầng lưu phát hiện.
import { hash32 } from './rng';

/** Độ dài phần mã của shareCode (GAP-<5 ký tự>-<điểm>) — dữ liệu, không hardcode trong hàm. */
const SHARE_CODE_LEN = 5;
/** Tiền tố nhận diện mã của game này. */
const SHARE_PREFIX = 'GAP';

/**
 * shareCode chỉ nhận số nguyên hữu hạn >= 0. Input bẩn (NaN / Infinity / số âm / số thực)
 * mà lọt được thì sinh mã rác nhưng vẫn đọc hợp lệ ở B1c ⇒ chặn ở cửa vào.
 */
function requireShareInt(name: string, v: number): void {
  if (!Number.isInteger(v) || v < 0) {
    throw new Error('shareCode: ' + name + '=' + v + ' phải là số nguyên hữu hạn >= 0');
  }
}

/** Mã chia sẻ offline dạng GAP-<5 ký tự>-<điểm> (records dùng ở B1c). */
export function shareCode(levelIndex: number, score: number): string {
  requireShareInt('levelIndex', levelIndex);
  requireShareInt('score', score);
  const raw = (hash32(SHARE_PREFIX + '|' + levelIndex + '|' + score) >>> 0).toString(36).toUpperCase();
  return SHARE_PREFIX + '-' + raw.padStart(SHARE_CODE_LEN, '0').slice(-SHARE_CODE_LEN) + '-' + score;
}
