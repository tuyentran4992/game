// ============================================================================
// B1a · NHÓM A — src/logic/rational.ts (Pattern: Value Object, STRUCTURE §2)
// Phủ: PC-03 (đáp án = trạng thái mở bung, so khớp vị trí lỗ PHẢI chính xác — STRUCTURE §2
//      ghi CẤM dùng number cho toạ độ lỗ) + PC-02 (cùng input ⇒ cùng kết quả, không drift).
// TDD: viết TRƯỚC code ⇒ chạy ra ĐỎ với NOT_IMPLEMENTED. Không case nào skip/todo.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { rat, add, sub, mul, div, eq, cmp, toNumber, key } from '../../src/logic/rational'

// Các giá trị dùng chung KHAI BÁO DẠNG HÀM (thunk) để mỗi it() tự gọi: nhờ vậy khi src
// chưa implement, từng case hiện FAILURE riêng với lý do NOT_IMPLEMENTED (thay vì cả file
// chết ngay lúc load module — khó đọc cho dev sửa).
const t3 = () => rat(1n, 3n)
const t6 = () => rat(1n, 6n)
const half = () => rat(1n, 2n)

describe('rational — so khớp CHÍNH XÁC bằng số hữu tỉ (PC-03, chống gốc lỗi float cũ)', () => {
  it('PC-03: 1/3 + 1/6 == 1/2 — khớp tuyệt đối, không xấp xỉ (số liệu neo của batch)', () => {
    expect(eq(add(t3(), t6()), half())).toBe(true)
    expect(cmp(add(t3(), t6()), half())).toBe(0)
  })

  it('PC-03: 1/3 + 1/6 không cho kết quả kiểu 3/6 chưa rút gọn khác 1/2 theo cmp', () => {
    // Nếu ai đó tính bằng float rồi lượng tử hoá, 1/3+1/6 = 0.49999999999999994 ≠ 0.5.
    expect(cmp(add(t3(), t6()), rat(2n, 4n))).toBe(0)
    expect(toNumber(add(t3(), t6()))).toBe(0.5)
  })

  it('PC-03: 1/3 + 1/3 + 1/3 == 1 — ba lần cộng vẫn đúng một cái (nếp chéo D sinh mẫu số 3)', () => {
    expect(eq(add(add(t3(), t3()), t3()), rat(1n))).toBe(true)
  })

  it('PC-03: sub — 1/2 - 1/3 == 1/6 (khoảng cách giữa một lỗ và một nếp)', () => {
    expect(eq(sub(half(), t3()), rat(1n, 6n))).toBe(true)
  })

  it('PC-03: mul — 1/2 * 1/4 == 1/8 (kích thước packet sau 3 nếp trên cùng 1 trục)', () => {
    expect(eq(mul(half(), rat(1n, 4n)), rat(1n, 8n))).toBe(true)
  })

  it('PC-03: div — (1/2) / (1/4) == 2 (số lớp = 1 / diện tích packet)', () => {
    expect(eq(div(half(), rat(1n, 4n)), rat(2n))).toBe(true)
  })

  it('PC-03: cmp phân biệt thứ tự tuyệt đối — 1/3 < 1/2 < 2/3 và trả về đúng -1/0/1', () => {
    expect(cmp(t3(), half())).toBe(-1)
    expect(cmp(half(), t3())).toBe(1)
    expect(cmp(half(), rat(2n, 4n))).toBe(0)
    expect(cmp(rat(2n, 3n), half())).toBe(1)
  })

  it('PC-03: eq là so sánh GIÁ TRỊ chứ không phải cấu trúc — 1/2 == 2/4 == (-1)/(-2)', () => {
    expect(eq(rat(1n, 2n), rat(2n, 4n))).toBe(true)
    expect(eq(rat(2n, 4n), rat(-1n, -2n))).toBe(true)
    expect(eq(rat(1n, 2n), t3())).toBe(false)
  })

  it('PC-03: CẤM FLOAT — hai phân số chỉ khác nhau ở hàng 2^-53 vẫn PHẢI khác nhau', () => {
    // number biểu diễn cả hai ra cùng một double; nếu rational.ts dùng number thì eq == true ⇒ đỏ.
    const a = rat(1n, 2n ** 53n)
    const b = rat(1n, 2n ** 53n + 1n)
    expect(toNumber(a)).toBe(toNumber(b)) // float collapsed — bằng chứng double là không đủ
    expect(eq(a, b)).toBe(false) // hữu tỉ bigint phải thấy khác
    expect(cmp(a, b)).toBe(1) // 1/2^53 > 1/(2^53+1): mẫu LỚN hơn thì giá trị NHỎ hơn
  })

  it('PC-03: số lớn không mất chữ số có nghĩa — 1/2^60 + 1/2^60 == 1/2^59', () => {
    expect(eq(add(rat(1n, 2n ** 60n), rat(1n, 2n ** 60n)), rat(1n, 2n ** 59n))).toBe(true)
  })

  it('PC-03: toNumber chỉ là kênh hiển thị — 1/4 -> 0.25, 1/8 -> 0.125, 3/8 -> 0.375 (đúng từng chữ số)', () => {
    expect(toNumber(rat(1n, 4n))).toBe(0.25)
    expect(toNumber(rat(1n, 8n))).toBe(0.125)
    expect(toNumber(rat(3n, 8n))).toBe(0.375)
    expect(toNumber(t3())).toBeCloseTo(1 / 3, 15)
  })

  it('PC-02: key() ổn định theo GIÁ TRỊ — 1/2 và 2/4 cho cùng một key (bắt buộc cho map dedupe lỗ)', () => {
    expect(key(rat(1n, 2n))).toBe(key(rat(2n, 4n)))
    expect(typeof key(t3())).toBe('string')
    expect(key(t3())).toBe(key(add(t6(), t6())))
  })

  it('PC-02: key() phân biệt giá trị khác nhau — không va chạm trên lưới nếp 1/8 và 1/3', () => {
    const keys = [rat(1n, 2n), t3(), rat(2n, 3n), rat(3n, 8n), rat(1n, 8n), rat(0n)].map(key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('PC-02: key() chuẩn hoá mẫu số âm — rat(1,-2) và rat(-1,2) là MỘT điểm, một key', () => {
    expect(key(rat(1n, -2n))).toBe(key(rat(-1n, 2n)))
    expect(eq(rat(1n, -2n), rat(-1n, 2n))).toBe(true)
  })

  it('PC-03: số 0 và số âm đúng luật — rat(0,5) == rat(0,1); -1/2 < 1/2; 1/3 - 1/2 = -1/6', () => {
    expect(eq(rat(0n, 5n), rat(0n))).toBe(true)
    expect(cmp(rat(-1n, 2n), half())).toBe(-1)
    expect(eq(sub(t3(), half()), rat(-1n, 6n))).toBe(true)
  })

  it('PC-02: Value Object bất biến — mọi phép toán không làm đổi toán hạng (không cộng dồn in-place)', () => {
    const a = t3()
    const before = key(a)
    add(a, a)
    mul(a, half())
    sub(a, t6())
    div(a, half())
    expect(key(a)).toBe(before)
    expect(eq(a, rat(1n, 3n))).toBe(true)
  })

  it('PC-02: rat() nhận cả number lẫn bigint cho cùng một giá trị (chữ ký hợp đồng trong khung src)', () => {
    expect(eq(rat(1, 2), rat(1n, 2n))).toBe(true)
    expect(key(rat(3, 8))).toBe(key(rat(3n, 8n)))
  })
})