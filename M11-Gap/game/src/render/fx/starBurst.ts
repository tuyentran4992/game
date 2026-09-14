// Pattern: FX (particle vàng khi nhận sao) — B4
// TRÁCH NHIỆM: NỔ một chùm tia vàng theo DÃY đã lên lịch ở anim/juicePlan (seed, không random),
//   dùng một texture tự bake lúc chạy ⇒ không phải file asset mới (pack B4: không vẽ asset).
// RÀNG BUỘC: số tia/góc/cỡ/trễ KHÔNG sinh ở đây — đây chỉ là kẻ vẽ lại `Spark[]`; màu do
//   caller đưa (token ACCENT của manifest) để file này không sở hữu hex nào.

import Phaser from 'phaser';
import { JUICE, type Spark } from '../anim/juicePlan';
import { parseHex } from '../theme/paperTheme';

/** Khoá texture của chấm sáng — một texture duy nhất cho mọi màn. */
const SPARK_KEY = 'fx-spark';

/** Bake một lần cho cả game; có rồi là để nguyên (không dựng lại texture đang dùng). */
export function ensureSparkTexture(scene: Phaser.Scene): string {
  if (!scene.textures.exists(SPARK_KEY)) {
    const bake = scene.add.graphics();
    const px = JUICE.sparkPx;
    bake.fillStyle(0xffffff, 1);
    bake.fillCircle(px / 2, px / 2, px / 2 - 1);
    bake.generateTexture(SPARK_KEY, px, px);
    bake.destroy();
  }
  return SPARK_KEY;
}

/**
 * Một chùm tia bay từ (cx, cy) ra ngoài theo `reach` px, mỗi tia đúng một dòng `Spark`.
 * Trả về tổng thời gian của hiệu ứng (ms) để scene xếp tiếng/phần thưởng phía sau nếu cần.
 */
export function starBurst(
  scene: Phaser.Scene, cx: number, cy: number, reach: number, sparks: readonly Spark[], colorHex: string,
): number {
  const key = ensureSparkTexture(scene);
  const tint = parseHex(colorHex);
  let lastMs = 0;
  for (const spark of sparks) {
    const dot = scene.add.image(cx, cy, key).setDepth(50).setTint(tint).setScale(spark.scale).setAlpha(1);
    const endMs = spark.delayMs + spark.lifeMs;
    if (endMs > lastMs) lastMs = endMs;
    scene.tweens.add({
      targets: dot,
      x: cx + spark.nx * reach * spark.reach,
      y: cy + spark.ny * reach * spark.reach,
      alpha: 0,
      scale: spark.scale * 0.4,
      delay: spark.delayMs,
      duration: spark.lifeMs,
      ease: 'Cubic.Out',
      onComplete: () => dot.destroy(),
    });
  }
  return lastMs;
}
