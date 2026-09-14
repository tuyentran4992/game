// ============================================================================
// B1c (nửa sau) · TELEMETRY: ring-buffer ≤100KB + validate ở biên + không giết game.
// PHỦ: PC-15 (trần byte THẬT, không ước lượng), TC-NET-03 (drop event CŨ NHẤT, giữ
//      nguyên phần mới), TC-NET-04 (storage hỏng ⇒ logger không được ném),
//      P4-06 (bộ tên event phủ đủ funnel).
// HỢP ĐỒNG ĐÃ CHỐT Ở ĐÂY (KIẾN NGHỊ, xem báo cáo):
//   createTelemetry({ capBytes, storage }) ⇒ { push(ev), events(), bytesOf() }
//   push(ev) ⇒ { ok, bytes, dropped }        validateEvent(ev) ⇒ { ok, errors }
//   EVENT_NAMES: registry tên event; Event = { name: string; t: number; data: object }
//   bytesOf() = số byte UTF-8 của JSON.stringify(mảng event đang giữ) — định nghĩa
//   "số thật" để test đo lại bằng TextEncoder, không tin con số src tự khai.
// ORACLE: mọi mốc byte/danh sách tên event là CONSTANT viết tay trong test.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { EVENT_NAMES, createTelemetry, validateEvent } from '../../src/logic/telemetry'

/** PC-15: trần ring 100KB = 100 * 1024 byte (hằng VIẾT TAY, không import từ src). */
const CAP = 100 * 1024
const STRESS = 10000
const utf8 = (s: string): number => new TextEncoder().encode(s).length

/** Event mẫu deterministic — KHÔNG Date.now/Math.random (PC-02). */
type Ev = { name: string; t: number; data: Record<string, unknown> }
const ev = (name: string, t: number, seq: number): Ev =>
  ({ name, t, data: { seq, path: 'level/' + (seq % 120) + '/attempt' } })

/** Danh sách funnel P4-06 dựng tay (§6 pack ngoài sandbox ⇒ xem KIẾN NGHỊ HỢP ĐỒNG). */
const FUNNEL: string[] = [
  'session_start', 'level_start', 'fold', 'undo', 'punch', 'option_pick',
  'level_correct', 'level_wrong', 'hint_use', 'retry', 'share_copy',
  'ghost_beat', 'wall_record', 'session_end',
]

/** Storage mock hỏng theo mọi cách có thể (TC-NET-04). */
const brokenStorage = {
  setItem(): void { throw new Error('QuotaExceededError') },
  getItem(): string | null { throw new Error('SecurityError') },
}

describe('PC-15 / TC-NET-03 · ring-buffer giữ trần byte THẬT khi nạp 10.000 event', () => {
  it('ring khởi tạo rỗng ⇒ bytesOf = 0, events = [], push 1 event = đúng số byte UTF-8 của JSON', () => {
    const log = createTelemetry({ capBytes: CAP })
    expect(log.bytesOf()).toBe(0)
    expect(log.events()).toEqual([])
    const first = ev('session_start', 1000, 0)
    log.push(first)
    expect(log.bytesOf()).toBe(utf8(JSON.stringify([first])))
  })

  it('push ' + STRESS + ' event ⇒ bytesOf() ≤ 100*1024 (đo lại bằng TextEncoder, không ước lượng)', () => {
    const log = createTelemetry({ capBytes: CAP })
    for (let i = 0; i < STRESS; i++) log.push(ev('level_start', 1000 + i, i))
    const bytes = log.bytesOf()
    expect(bytes).toBeGreaterThan(0)
    expect(bytes).toBeLessThanOrEqual(CAP)
    expect(utf8(JSON.stringify(log.events()))).toBeLessThanOrEqual(CAP)
  })

  it('event CŨ NHẤT bay trước, phần còn lại là HẬU DUỖI liên tiếp tới event cuối (TC-NET-03)', () => {
    const log = createTelemetry({ capBytes: CAP })
    for (let i = 0; i < STRESS; i++) log.push(ev('level_start', 1000 + i, i))
    const kept = log.events()
    expect(kept.length).toBeLessThan(STRESS)
    expect(kept.length).toBeGreaterThan(1)
    const seq = kept.map((e) => e.data.seq as number)
    expect(seq[seq.length - 1]).toBe(STRESS - 1)
    expect(seq[0]).toBeGreaterThan(0)
    expect(new Set(seq).size).toBe(seq.length)
    for (let i = 1; i < seq.length; i++) expect(seq[i]).toBe(seq[i - 1] + 1)
  })
})

describe('TC-NET-03 · timestamp ĐƠN ĐIỆU theo thứ tự push — một nhánh hành vi duy nhất', () => {
  it('ts nhỏ hơn ts cuối ⇒ BỊ TỪ CHỐI: ok=false, ring và bytesOf không đổi', () => {
    const log = createTelemetry({ capBytes: CAP })
    log.push(ev('level_start', 5000, 0))
    log.push(ev('fold', 6000, 1))
    const bytes = log.bytesOf()
    const rejected = log.push(ev('punch', 5999, 2))
    expect(rejected.ok).toBe(false)
    expect(log.events()).toHaveLength(2)
    expect(log.bytesOf()).toBe(bytes)
  })

  it('ts BẰNG ts cuối hoặc bằng 0 ⇒ chấp nhận (non-decreasing); mảng events luôn không giảm', () => {
    const log = createTelemetry({ capBytes: CAP })
    expect(validateEvent(ev('session_start', 0, 0)).ok).toBe(true)
    expect(log.push(ev('session_start', 0, 0)).ok).toBe(true)
    expect(log.push(ev('fold', 7000, 1)).ok).toBe(true)
    expect(log.push(ev('punch', 7000, 2)).ok).toBe(true)
    expect(log.push(ev('undo', 7001, 3)).ok).toBe(true)
    const ts = log.events().map((e) => e.t)
    expect(ts).toEqual([0, 7000, 7000, 7001])
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThanOrEqual(ts[i - 1])
  })
})

describe('PC-15 · dữ liệu bẩn chặn ở BIÊN: validateEvent nêu tên field, ring không đổi', () => {
  it('thiếu t / sai kiểu t / tên ngoài registry ⇒ {ok:false, errors} nêu ĐÚNG tên field', () => {
    const noT = validateEvent({ name: `fold`, data: {} } as unknown as Ev)
    expect(noT.ok).toBe(false)
    expect(noT.errors.join(' ')).toMatch(/\bt\b/)
    const badName = validateEvent(ev('teleport', 10, 0))
    expect(badName.ok).toBe(false)
    expect(badName.errors.join(' ')).toMatch(/name/)
    const notObj = validateEvent(null as unknown as Ev)
    expect(notObj.ok).toBe(false)
    expect(notObj.errors.length).toBeGreaterThan(0)
  })

  it('push event không đạt schema ⇒ ok=false và ring giữ NGUYÊN số event + bytesOf', () => {
    const log = createTelemetry({ capBytes: CAP })
    log.push(ev('level_start', 100, 0))
    const bytes = log.bytesOf()
    expect(log.push(ev('not-an-event-name', 101, 1)).ok).toBe(false)
    expect(log.events()).toHaveLength(1)
    expect(log.bytesOf()).toBe(bytes)
  })
})

describe('TC-NET-04 · storage hỏng không giết game: push không ném, ring vẫn hợp lệ', () => {
  it('storage.setItem/getItem ném ⇒ createTelemetry + push không ném, ring vẫn đủ & đúng trần', () => {
    const log = createTelemetry({ capBytes: CAP, storage: brokenStorage })
    expect(() => {
      for (let i = 0; i < 500; i++) log.push(ev('level_start', 1000 + i, i))
    }).not.toThrow()
    expect(log.bytesOf()).toBeLessThanOrEqual(CAP)
    expect(log.events().length).toBeGreaterThan(0)
    // dữ liệu không mất chỉ vì hết quota: 10 event liên tiếp vẫn vào đủ
    const small = createTelemetry({ capBytes: CAP, storage: brokenStorage })
    for (let i = 0; i < 10; i++) expect(small.push(ev('fold', 2000 + i, i)).ok).toBe(true)
    expect(small.events().map((e) => e.data.seq)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})

describe('P4-06 · registry tên event phủ đủ funnel (chiều ⊆, không soi key mồ côi)', () => {
  it('FUNNEL fixture là TẬP CON của EVENT_NAMES; mỗi tên là token snake_case (PC-19)', () => {
    const registry = new Set(EVENT_NAMES)
    for (const name of FUNNEL) expect(registry.has(name), 'thiếu event ' + name).toBe(true)
    expect(FUNNEL.length).toBe(14)
    expect(registry.size).toBeGreaterThanOrEqual(FUNNEL.length)
    for (const name of EVENT_NAMES) {
      expect(name, name).toMatch(/^[a-z][a-z0-9_]*$/)
      expect(name).not.toContain('GẤP')
    }
  })
})
