// T1e (card t_c4495ee8) — HudRenderer: vẽ + cập nhật HUD từ state GameEngine.
// Tầng B (CONTRACT K0 §6): CHỈ render — đọc state qua public interface (CONTRACT §2),
// CẤM mutate engine, CẤM tính luật chơi. Format chapter (`CH2 · NEXT 8/22`) là việc
// card CH sau — KHÔNG làm ở đây (đề bài card). Giữ NGUYÊN layout/testid cũ:
// score-label · level-label · level-progress (N3 diff-rỗng).
import Phaser from 'phaser';
import { type, z, dur, fontStyle } from '../../tokens';
import { MECHANICS } from '../../logic/mechanics';
import type { GameEngine } from '../../logic/GameEngine';

export class HudRenderer {
  private scene: Phaser.Scene;
  private engine: GameEngine;
  private getElapsed: () => number;

  // Game object HUD (root field riêng để Gameplay không giữ text node trực tiếp)
  private scoreLabel!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private fishLabel!: Phaser.GameObjects.Text;
  private feverBarG!: Phaser.GameObjects.Graphics;
  private feverStatusLabel!: Phaser.GameObjects.Text;
  private levelProgressG!: Phaser.GameObjects.Graphics;
  private levelProgressLabel!: Phaser.GameObjects.Text;
  private feverFlameImg!: Phaser.GameObjects.Image;
  private lastFeverUiKey = '';

  constructor(
    scene: Phaser.Scene,
    engine: GameEngine,
    opts: {
      // Nguồn elapsed của scene (dùng cho pulse glow fever/progress — khớp nhịp cũ)
      getElapsed: () => number;
      // Texture flame bake sẵn từ GameplayScene (FLOW_TEX.flame) — renderer không bake lại
      flameTexture: (fever: boolean) => string;
      // Metrics layout của playfield/HUD — single source ở scene
      playfield: () => { left: number; right: number; width: number; center: number };
      hudY: () => number;
    },
  ) {
    this.scene = scene;
    this.engine = engine;
    this.getElapsed = opts.getElapsed;
    this.flameTexture = opts.flameTexture;
    this.playfield = opts.playfield;
    this.hudY = opts.hudY;
    this.create();
  }

  private flameTexture: (fever: boolean) => string;
  private playfield: () => { left: number; right: number; width: number; center: number };
  private hudY: () => number;

  /** Khởi tạo game object — mirror NGUYÊN create cũ (vị trí/style/depth/testid giữ nguyên). */
  private create() {
    const { width, height } = this.scene.scale;
    const pf = this.playfield();
    const hudY = Math.max(38, height * 0.05);

    // 3. Score Label (Center Top - Arcade Casual Stroke)
    this.scoreLabel = this.scene.add.text(pf.center, hudY - 4, String(this.engine.score), fontStyle(type.score, '#FFFFFF'))
      .setOrigin(0.5, 0.5).setDepth(z.hud)
      .setStroke('#1E0E02', 6)
      .setShadow(0, 3, 'rgba(0,0,0,0.45)', 4, false, true);
    this.scoreLabel.setData('testid', 'score-label');

    // 4. Level & Fish Labels (Top-Right inside playfield column)
    this.levelLabel = this.scene.add.text(pf.right - 44, hudY - 2, 'Level ' + this.engine.getLevel(), fontStyle(type.small, '#FFFFFF'))
      .setOrigin(0.5, 0.7).setDepth(z.hud)
      .setStroke('#1E0E02', 4);
    this.levelLabel.setData('testid', 'level-label');

    this.fishLabel = this.scene.add.text(pf.right - 44, hudY + 20, `🐟 ×${this.engine.fish}`, fontStyle(type.small, '#FFD700'))
      .setOrigin(0.5, 0.7).setDepth(z.hud)
      .setStroke('#1E0E02', 4);

    // Fever Bar Graphics & Label (Pill 28px height, Graphics vector flame icon)
    this.feverBarG = this.scene.add.graphics().setDepth(z.hud);
    this.feverStatusLabel = this.scene.add.text(pf.center + 8, hudY + 38, 'FEVER 0%', fontStyle({ size: '13px', weight: '900', lh: 1 }, '#FFFFFF'))
      .setOrigin(0.5).setDepth(z.hud + 1)
      .setStroke('#1E0E02', 3.5)
      .setAlpha(0.95);

    // Level Progress Pill (D-A2: cảm giác tiến bộ nhìn thấy được — testid level-progress)
    this.levelProgressG = this.scene.add.graphics().setDepth(z.hud);
    this.levelProgressLabel = this.scene.add.text(pf.center, hudY + 81, `CH${this.engine.paletteIndex + 1} · NEXT 0/${MECHANICS.milestoneInterval}`, fontStyle({ size: '13px', weight: '900', lh: 1 }, '#FFFFFF'))
      .setOrigin(0.5).setDepth(z.hud + 1)
      .setStroke('#1E0E02', 3.5)
      .setAlpha(0.95);
    this.levelProgressLabel.setData('testid', 'level-progress');
  }

  /** Cập nhật score/fish + pulse — mirror updateHud cũ (gọi khi score/fish đổi). */
  update() {
    this.scoreLabel.setText(String(this.engine.score));
    this.fishLabel.setText(`🐟 ×${this.engine.fish}`);
    this.scene.tweens.add({ targets: this.scoreLabel, scale: 1.35, duration: 150, yoyo: true, ease: 'back.out' });
  }

  /** Level label + tween — tách từ onLevelUp cũ (chỉ phần text, popup/confetti vẫn ở scene). */
  setLevel(level: number) {
    this.levelLabel.setText('Level ' + level);
    this.scene.tweens.add({ targets: this.levelLabel, scale: 1.3, duration: dur.tn, yoyo: true, ease: 'back.out' });
  }

  /** Pill tiến độ lên level tiếp theo — mirror drawLevelProgress cũ (same pattern fever bar). */
  drawLevelProgress() {
    const { width, height } = this.scene.scale;
    const pf = this.playfield();
    const hudY = Math.max(38, height * 0.05);
    const barW = Math.min(180, Math.max(140, pf.width * 0.38));
    const barH = 12;
    const barX = pf.center - barW / 2;
    const barY = hudY + 62; // ngay dưới fever pill (fever bottom = hudY+52)

    const interval = MECHANICS.milestoneInterval;
    const score = this.engine.score;
    const into = score % interval;
    const ratio = Phaser.Math.Clamp(into / interval, 0, 1);

    const g = this.levelProgressG;
    g.clear();

    // Track
    g.fillStyle(0xFFFFFF, 0.12);
    g.fillRoundedRect(barX, barY, barW, barH, barH / 2);
    g.lineStyle(1.5, 0xFFFFFF, 0.22);
    g.strokeRoundedRect(barX, barY, barW, barH, barH / 2);

    // Fill — xanh success (khác nhiệt gradient cam đỏ của Fever để đọc nhanh)
    if (ratio > 0) {
      g.fillGradientStyle(0x5ED07A, 0x2ECC71, 0x5ED07A, 0x2ECC71, 1, 1, 1, 1);
      g.fillRoundedRect(barX, barY, Math.max(barH, barW * ratio), barH, barH / 2);
    }

    // Pulsing glow khi sắp lên level (>=80%)
    if (ratio >= 0.8) {
      const glowAlpha = 0.35 + 0.3 * Math.sin(this.getElapsed() * 8);
      g.lineStyle(2.5, 0x2ECC71, glowAlpha);
      g.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, (barH + 4) / 2);
    }

    this.levelProgressLabel.setPosition(pf.center, barY + barH / 2 + 14);
    // UPG2-CH: chip chương — CH{paletteIndex+1} đọc qua interface tầng A (CONTRACT §2)
    this.levelProgressLabel.setText(`CH${this.engine.paletteIndex + 1} · NEXT ${into}/${interval}`);
  }

  /** Fever pill + label + flame icon — mirror drawFeverBar cũ (dirty-flag PERF-FIX A/C giữ nguyên). */
  drawFeverBar() {
    const { width, height } = this.scene.scale;
    const pf = this.playfield();
    const hudY = Math.max(38, height * 0.05);
    const barW = Math.min(180, Math.max(140, pf.width * 0.38));
    const barH = 28;
    const barX = pf.center - barW / 2;
    const barY = hudY + 24; // >= 10px gap from score text (score at hudY - 4, bottom at hudY + 11)

    const isFever = this.engine.isFeverActive();
    let ratio = this.engine.fever / 100;
    if (isFever) {
      ratio = this.engine.feverTimeRemaining / MECHANICS.feverDurationSec;
    }
    ratio = Phaser.Math.Clamp(ratio, 0, 1);

    // PERF-FIX A/C: dirty-flag — chỉ clear()+redraw khi trạng thái nhìn thấy được đổi
    // (fillW quantize 0.5px, glow alpha quantize 0.1 step). Bản cũ tessellate lại mỗi frame.
    const fillW = Math.max(0, barW * ratio);
    const pulsing = isFever || ratio >= 1.0;
    const glowAlpha = pulsing ? 0.45 + 0.35 * Math.sin(this.getElapsed() * 10) : 0;
    const key = `${barX.toFixed(1)}|${barY}|${barW}|${Math.round(fillW * 2)}|${isFever ? 1 : 0}|${Math.round(glowAlpha * 10)}|${Math.round(this.engine.fever)}`;
    const layoutChanged = key !== this.lastFeverUiKey;
    this.lastFeverUiKey = key;

    if (layoutChanged) {
      const g = this.feverBarG;
      g.clear();

      // 1. Pill Track: rgba(255,255,255,0.12), fully rounded (14px)
      g.fillStyle(0xFFFFFF, 0.12);
      g.fillRoundedRect(barX, barY, barW, barH, 14);
      g.lineStyle(1.5, 0xFFFFFF, 0.22);
      g.strokeRoundedRect(barX, barY, barW, barH, 14);

      // 2. Horizontal gradient fill (#FF9F1C -> #E71D36) when > 0
      if (fillW > 0) {
        g.fillGradientStyle(0xFF9F1C, 0xE71D36, 0xFF9F1C, 0xE71D36, 1, 1, 1, 1);
        g.fillRoundedRect(barX, barY, Math.max(28, fillW), barH, 14);
      }

      // 3. Pulsing outer glow when full or fever mode
      if (pulsing) {
        g.lineStyle(3.5, 0xFF9F1C, glowAlpha);
        g.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 16);
      }
    }

    // 4. Flame icon: Image của texture bake sẵn (2 biến thể), chỉ đổi texture khi fever đổi
    const flameCX = barX + 16;
    const flameCY = barY + barH / 2;
    if (!this.feverFlameImg || !this.feverFlameImg.active) {
      this.feverFlameImg = this.scene.add.image(flameCX, flameCY, this.flameTexture(isFever)).setDepth(z.hud + 1);
    } else {
      const wantTex = this.flameTexture(isFever);
      if (this.feverFlameImg.texture.key !== wantTex && this.scene.textures.exists(wantTex)) this.feverFlameImg.setTexture(wantTex);
      this.feverFlameImg.setPosition(flameCX, flameCY);
    }

    // 5. Bold >= 12px readable label at small scale
    const labelX = barX + barW / 2 + 8;
    const labelY = barY + barH / 2;
    this.feverStatusLabel.setPosition(labelX, labelY);
    if (isFever) {
      if (this.feverStatusLabel.text !== 'FEVER 2X!') this.feverStatusLabel.setText('FEVER 2X!').setColor('#FFF275');
    } else {
      const txt = `FEVER ${Math.round(this.engine.fever)}%`;
      if (this.feverStatusLabel.text !== txt) this.feverStatusLabel.setText(txt).setColor('#FFFFFF');
    }
  }

  /** Reposition khi màn hình đổi kích thước — tách từ onResize cũ (phần HUD label). */
  relayout(pf: { left: number; right: number; width: number; center: number }, hudY: number) {
    if (this.scoreLabel) this.scoreLabel.setPosition(pf.center, hudY - 4);
    if (this.levelLabel) this.levelLabel.setPosition(pf.right - 44, hudY - 2);
    if (this.fishLabel) this.fishLabel.setPosition(pf.right - 44, hudY + 20);
  }

  /** Dọn game object khi scene shutdown (destroy theo chủ sở hữu — scene gọi 1 lần). */
  destroy() {
    this.feverBarG.destroy();
    this.levelProgressG.destroy();
    this.scoreLabel.destroy();
    this.levelLabel.destroy();
    this.fishLabel.destroy();
    this.feverStatusLabel.destroy();
    this.levelProgressLabel.destroy();
    if (this.feverFlameImg && this.feverFlameImg.active) this.feverFlameImg.destroy();
  }
}
