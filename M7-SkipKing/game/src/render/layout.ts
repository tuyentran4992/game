/**
 * M7 Skip King — layout render (T3 Tầng B): hằng số projection + FX sống một chỗ.
 * Mọi hằng có đơn vị + rationale (CONTRACT mục 1 — 0 magic number rải rác);
 * số gameplay KHÔNG nằm đây (MechanicsConfig là nguồn duy nhất — đọc qua tham số).
 * Tầng B: được phép import Phaser-free (pure) để test jsdom nhanh.
 */

/** Kích thước sân chiếu (px trên canvas 720×1280 — CONTRACT §2). */
export const LAYOUT = {
  /** px — chân trời (y màn) ứng z=fieldZMax; trời chiếm phần trên. Detect từ art T6: y=576. */
  horizonY: 576,
  /** px — dòng nước gần (y màn) ứng z=0; đáy màn còn dải bờ dưới. */
  waterlineY: 1180,
  /** × — scale vật thể ở chân trời (co theo sâu tuyến tính từ 1 ở waterline). */
  horizonScale: 0.4,
  /** px — cỡ chữ HUD (≥24px trên canvas 720 — ROLE-RULES readability). */
  hudFontSizePx: 30,
  /** px — cao dải trời phía trên vẽ chữ HUD (y 20–100 — vùng đo QA-SUB-2). */
  hudBandHeightPx: 150,
  /**
   * — luminance worst-case pixel vùng HUD trên sunset_bg thật (T6:
   * scripts/measure_hud_contrast.py vùng A sky_top RGB(70,73,132) → L≈0.0773;
   * chữ trắng đo được 8.2:1 ≥ 4.5 AA PASS). QA-SUB-2 đo lại trên build thật.
   */
  hudBandLuminance: 0.078,
} as const;

/** Nhóm hằng aim guide + pull-back + feedback (CONTRACT 3.2 + §6). */
export const AIM = {
  /** px — sức kéo tối đa tính lực (≥44px touch target — config.touchTargetPx). */
  maxDragPx: 320,
  /** px — cú kéo ngắn hơn này bị coi là chạm nhầm → huỷ (≥ target chạm). */
  minDragPx: 20,
  /** px — độ dài aim guide khi kéo đầy lực. */
  aimMaxPx: 340,
  /** px — aim guide tối thiểu hiện rõ khi kéo đạt minDrag. */
  aimMinPx: 60,
  /** ms — mờ dần nhãn "DRAG & RELEASE" sau cú đầu (U2). */
  labelFadeMs: 600,
  /** ms — nhãn đứng yên trước khi mờ (đủ đọc). */
  labelHoldMs: 400,
  /** px — cỡ chữ nhãn DRAG & RELEASE (≥24px canvas 720). */
  labelFontSizePx: 26,
} as const;

/** Hằng FX juice (CONTRACT §6 — giữ 6, squash 80ms). */
export const FX = {
  /** ms — squash đúng CONTRACT §6 juice giữ. */
  squashMs: 80,
  /** objects — trần pool ripple (perf ROLE-RULES: pool, không new/destroy mỗi frame). */
  ripplePool: 12,
} as const;

export interface Projection {
  /** y màn (px) cho vị trí sâu z (m). */
  zToY(z: number): number;
  /** scale 0..1 cho vật ở sâu z (1 tại waterline → horizonScale tại horizon). */
  zScale(z: number): number;
  /** px trên mét ở sâu z (đo đá/ripple). */
  pxPerM(z: number): number;
  /** x màn (px) cho vị trí ngang x (m) quanh tâm sân. */
  xToScreenX(x: number, z: number): number;
  readonly horizonY: number;
  readonly waterlineY: number;
}

/**
 * Projection perspective tuyến tính z→y: z=0 → waterlineY (gần, đáy), z=fieldZMax → horizonY.
 * fieldZMax đọc từ MechanicsConfig (nguồn duy nhất số gameplay) — truyền vào lúc dựng.
 */
export function makeProjection(
  canvasWidth: number,
  canvasHeight: number,
  fieldZMax: number = 40,
): Projection {
  const horizonY = Math.min(LAYOUT.horizonY, canvasHeight);
  const waterlineY = Math.min(LAYOUT.waterlineY, canvasHeight);
  const spanY = waterlineY - horizonY;

  const zScale = (z: number): number => {
    const t = Math.min(1, Math.max(0, z / fieldZMax)); // 0 gần → 1 xa
    return 1 - (1 - LAYOUT.horizonScale) * t;
  };

  return {
    zToY: (z: number) => waterlineY - spanY * (Math.min(1, Math.max(0, z / fieldZMax))),
    zScale,
    pxPerM: (z: number) => 40 * zScale(z), // px/m tại waterline=40 → co đều theo sâu
    xToScreenX: (x: number, z: number) =>
      canvasWidth / 2 + x * pxPerMAt(z) * 0.8, // ±0.8: nẹp biên x∈[-5,5]m không chạm mép
    horizonY,
    waterlineY,
  };

  function pxPerMAt(z: number): number {
    return 40 * zScale(z);
  }
}
