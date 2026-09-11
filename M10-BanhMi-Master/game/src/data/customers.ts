// DATA-MODEL §3 — 8 KHÁCH/CA, thứ tự cố định; nội dung order sinh từ seed (§4).
// CHỈNH ±20% THEO PROMPT BƯỚC 5 (sim gate §C "forgetful strikes median ≥1" fail với số
// gốc; chi tiết + bảng trước→sau ở BUILD-LOG.md BƯỚC 5):
//   c4 patienceS 38→31 · c5 32→26 · c6 36→29 · c8 40→32. c1/c2/c3/c7 GIỮ nguyên.
// Lưu ý SPEC §5 ghi đích danh VIP "patience ngắn nhất (32s)" → 26s sau tune (vẫn ngắn nhất).

export interface CustomerDef {
  readonly id: string
  readonly persona: string
  readonly layers: number // số layer GIỮA base/top
  readonly flashS: number
  readonly patienceS: number
  readonly tipMult: number
  readonly tutorial?: boolean // khách #1: highlight từng layer
  readonly changer?: boolean // khách #7: WAIT! đổi 1 layer
}

export const CUSTOMERS: readonly CustomerDef[] = [
  { id: 'c-student', persona: 'Học sinh', layers: 2, flashS: 6.0, patienceS: 45, tipMult: 1.0, tutorial: true },
  { id: 'c-granny', persona: 'Bà cụ', layers: 3, flashS: 5.0, patienceS: 42, tipMult: 1.0 },
  { id: 'c-office', persona: 'Dân văn phòng', layers: 4, flashS: 4.5, patienceS: 40, tipMult: 1.2 },
  { id: 'c-worker', persona: 'Công nhân', layers: 4, flashS: 4.0, patienceS: 31, tipMult: 1.0 },
  { id: 'c-vip', persona: 'Doanh nhân VIP', layers: 5, flashS: 4.0, patienceS: 26, tipMult: 2.0 },
  { id: 'c-rush', persona: 'Sinh viên vội', layers: 5, flashS: 3.5, patienceS: 29, tipMult: 1.2 },
  { id: 'c-changer', persona: 'Khách đổi ý', layers: 4, flashS: 4.0, patienceS: 40, tipMult: 1.2, changer: true },
  { id: 'c-regular', persona: 'Khách quen', layers: 6, flashS: 4.0, patienceS: 32, tipMult: 1.5 }
] as const

// art key theo manifest: cust_1..cust_8 tương ứng thứ tự
export const customerArtKey = (idx: number): string => `cust_${idx + 1}`
