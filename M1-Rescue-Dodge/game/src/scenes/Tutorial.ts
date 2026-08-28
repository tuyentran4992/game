import Phaser from 'phaser';
import { color, type, sp, radius, shadow, z, dur, fontStyle, toColor, paletteForLevel } from '../tokens';
import { ctx } from '../context';

export class TutorialScene extends Phaser.Scene {
  private hasAdvanced = false;

  constructor() { super({ key: 'TutorialScene' }); }

  private getPlayfieldBounds(width: number, height: number): { left: number; right: number; width: number; center: number } {
    const isPortrait = height >= width;
    const pfWidth = isPortrait ? width : Math.min(width, Math.min(460, Math.round(height * 0.58)));
    const left = (width - pfWidth) / 2;
    const right = left + pfWidth;
    return { left, right, width: pfWidth, center: width / 2 };
  }

  private getStraightRoadMetrics(width: number, _height: number) {
    const roadW = width * 0.72;
    const halfW = roadW / 2;
    const leftEdge = width / 2 - halfW;
    const laneWidth = roadW / 3;
    const bgScale = roadW / 330;
    return { roadW, halfW, leftEdge, laneWidth, bgScale };
  }

  create() {
    const { width, height } = this.scale;
    const isPortrait = height >= width;
    const pal = paletteForLevel(1);
    this.hasAdvanced = false;

    // 1. Road Metrics & Background Image
    const { leftEdge, laneWidth, bgScale } = this.getStraightRoadMetrics(width, height);
    const bg = this.add.image(width / 2, height / 2, 'bg_day').setDepth(z.bg);
    bg.setScale(bgScale);

    // 2. Compute 3 Lanes exactly matching Gameplay
    const pf = this.getPlayfieldBounds(width, height);
    const catY = height * 0.78;
    const lanes = [
      leftEdge + 0.5 * laneWidth,
      leftEdge + 1.5 * laneWidth,
      leftEdge + 2.5 * laneWidth,
    ];

    // 3. Road & Environment Graphics (Matches Gameplay 1:1)
    const envG = this.add.graphics().setDepth(z.bg + 1);

    // 4 Straight Vertical Road Lines (Line 0 to Line 3)
    for (let i = 0; i <= 3; i++) {
      const isDivider = (i === 1 || i === 2);
      const alpha = isDivider ? 0.08 : 0.14;
      const lineThickness = isDivider ? 1.8 : 2.4;
      const lineX = leftEdge + i * laneWidth;
      envG.lineStyle(lineThickness, 0x0F172A, alpha);
      envG.strokeLineShape(new Phaser.Geom.Line(lineX, 0, lineX, height));
    }

    // Outer playfield boundaries / vignettes
    if (width > pf.width + 10) {
      envG.lineStyle(2, 0x0F172A, 0.08);
      envG.strokeLineShape(new Phaser.Geom.Line(pf.left, 0, pf.left, height));
      envG.strokeLineShape(new Phaser.Geom.Line(pf.right, 0, pf.right, height));

      // Side vignettes on outer desktop margins
      envG.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.22, 0.0, 0.22, 0.0);
      envG.fillRect(0, 0, pf.left, height);
      envG.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.22, 0.0, 0.22);
      envG.fillRect(pf.right, 0, width - pf.right, height);
    } else {
      // Soft mobile side vignette
      const vigW = Math.min(36, width * 0.08);
      envG.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.12, 0.0, 0.12, 0.0);
      envG.fillRect(0, 0, vigW, height);
      envG.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.12, 0.0, 0.12);
      envG.fillRect(width - vigW, 0, vigW, height);
    }

    // Smooth top-edge gradient fade from rgba(0,0,0,0.35) at y=0 to transparent at y=120px (No hard seam)
    envG.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.35, 0.35, 0.0, 0.0);
    envG.fillRect(0, 0, width, 120);

    // 4. Volumetric 3D Tutorial Instruction Card (Top)
    const cardW = Math.min(320, pf.width - 36);
    const cardH = 92;
    const cardY = Math.max(68, height * 0.15);

    const cardContainer = this.add.container(pf.center, cardY).setDepth(z.tutorial);

    const cardG = this.add.graphics();
    // Shadow
    cardG.fillStyle(toColor(color.shadow), shadow.panel.alpha);
    cardG.fillRoundedRect(-cardW / 2, -cardH / 2 + 8, cardW, cardH, radius.md);
    // Volumetric Surface
    cardG.fillStyle(0xF8FAFC, 1);
    cardG.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.md);
    cardG.fillStyle(0xFFFFFF, 0.95);
    cardG.fillRoundedRect(-cardW / 2 + 3, -cardH / 2 + 3, cardW - 6, cardH * 0.52, radius.md - 2);
    // Primary 3D Border
    cardG.lineStyle(3.5, toColor(color.primary), 1);
    cardG.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.md);
    // Inner Highlight Line
    cardG.lineStyle(1.5, 0xFFFFFF, 0.75);
    cardG.strokeRoundedRect(-cardW / 2 + 2, -cardH / 2 + 2, cardW - 4, cardH - 4, radius.md - 2);

    // Header Badge Pill ("HOW TO PLAY")
    const badgeW = 110, badgeH = 22;
    const badgeG = this.add.graphics();
    badgeG.fillStyle(toColor(color.primary), 1);
    badgeG.fillRoundedRect(-badgeW / 2, -cardH / 2 - badgeH / 2 + 2, badgeW, badgeH, 11);
    badgeG.lineStyle(1.5, 0xFFFFFF, 0.9);
    badgeG.strokeRoundedRect(-badgeW / 2, -cardH / 2 - badgeH / 2 + 2, badgeW, badgeH, 11);
    const badgeTxt = this.add.text(0, -cardH / 2 + 2, 'HOW TO PLAY', fontStyle({ size: '11px', weight: '900', lh: 1 }, '#FFFFFF')).setOrigin(0.5);

    // Main Instruction Text
    const mainTxt = this.add.text(0, -6, 'Tap Left / Right to Dodge', fontStyle({ size: '17px', weight: '900', lh: 1.2 }, color.textPrimary))
      .setOrigin(0.5);
    mainTxt.setData('testid', 'tutorial-text');

    // Sub Instruction Text
    const subTxt = this.add.text(0, 20, '👉 Tap screen to start immediately 👈', fontStyle({ size: '12px', weight: '700', lh: 1 }, color.primaryDark))
      .setOrigin(0.5);

    cardContainer.add([cardG, badgeG, badgeTxt, mainTxt, subTxt]);

    // Card breathing animation
    this.tweens.add({
      targets: cardContainer,
      scale: 1.02,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });

    // 5. Visual Tap Indicators (Left & Right Hands / Arrows - Positioned safely above cat)
    const tapY = height * 0.48;
    const leftTap = this.add.container(lanes[0], tapY).setDepth(z.tutorial);
    const leftBg = this.add.graphics();
    leftBg.fillStyle(0x0F172A, 0.55); leftBg.fillCircle(0, 0, 26);
    leftBg.lineStyle(2, 0xFFFFFF, 0.8); leftBg.strokeCircle(0, 0, 26);
    const leftTxt = this.add.text(0, 0, '👈', { fontSize: '24px' }).setOrigin(0.5);
    leftTap.add([leftBg, leftTxt]);

    const rightTap = this.add.container(lanes[2], tapY).setDepth(z.tutorial);
    const rightBg = this.add.graphics();
    rightBg.fillStyle(0x0F172A, 0.55); rightBg.fillCircle(0, 0, 26);
    rightBg.lineStyle(2, 0xFFFFFF, 0.8); rightBg.strokeCircle(0, 0, 26);
    const rightTxt = this.add.text(0, 0, '👉', { fontSize: '24px' }).setOrigin(0.5);
    rightTap.add([rightBg, rightTxt]);

    // Pulse tap guides
    this.tweens.add({
      targets: [leftTap, rightTap],
      scale: 1.15,
      alpha: 0.7,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });

    // 6. Actors: Cat & Bee (Correct Sizing & Feathered Radial Shadow)
    const catH = Math.round(Math.min(120, laneWidth * 0.70));
    const catW = catH;
    const beeSize = Math.round(Math.min(84, laneWidth * 0.50));

    // Ground Contact Shadow (Radial-gradient ellipse: width ~1.4x cat body, height ~0.35x, peak alpha 0.22)
    const shadowG = this.add.graphics().setDepth(z.actor - 1);
    const drawShadow = (x: number, y: number, sq = 1) => {
      shadowG.clear();
      const shadowW = (catW * 1.40) * sq;
      const shadowH = (catH * 0.35) * sq;
      const shadowY = y + catH * 0.44;
      const steps = 10;
      const alphaStep = 0.22 / steps;
      for (let i = steps; i >= 1; i--) {
        const ratio = i / steps;
        shadowG.fillStyle(0x1B1008, alphaStep);
        shadowG.fillEllipse(x, shadowY, shadowW * ratio, shadowH * ratio);
      }
    };
    drawShadow(lanes[1], catY);

    const cat = this.add.image(lanes[1], catY, ctx.engine.getSelectedSkinTexture())
      .setDisplaySize(catW, catH).setDepth(z.actor);

    const baseScaleX = cat.scaleX;
    const baseScaleY = cat.scaleY;

    const bee = this.add.image(lanes[1], height * 0.32, 'bee_wasp')
      .setDisplaySize(beeSize, beeSize).setDepth(z.actor);

    // Bee floating bobbing
    this.tweens.add({
      targets: bee,
      y: catY - 70,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });

    // Cat dodging sequence (Jumps to Right Lane with tilt, then back)
    const startDodgeCycle = () => {
      this.time.delayedCall(450, () => {
        // Dodge Right
        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 320,
          delay: 35,
          ease: 'cubic.out',
          onUpdate: (tw) => {
            const p = tw.getValue() ?? 0;
            const curX = lanes[1] + (lanes[2] - lanes[1]) * p;
            const sq = 1 - Math.sin(p * Math.PI) * 0.22;
            drawShadow(curX, catY, sq);
          },
        });

        this.tweens.add({
          targets: cat,
          x: lanes[2],
          angle: 10,
          scaleX: baseScaleX * 0.90,
          scaleY: baseScaleY * 1.10,
          duration: 320,
          ease: 'cubic.out',
          onComplete: () => {
            cat.setAngle(0).setScale(baseScaleX, baseScaleY);
            drawShadow(lanes[2], catY);

            // Hold on safe lane, then return to center
            this.time.delayedCall(800, () => {
              this.tweens.addCounter({
                from: 0,
                to: 1,
                duration: 320,
                delay: 35,
                ease: 'cubic.out',
                onUpdate: (tw) => {
                  const p = tw.getValue() ?? 0;
                  const curX = lanes[2] + (lanes[1] - lanes[2]) * p;
                  const sq = 1 - Math.sin(p * Math.PI) * 0.22;
                  drawShadow(curX, catY, sq);
                },
              });

              this.tweens.add({
                targets: cat,
                x: lanes[1],
                angle: -10,
                scaleX: baseScaleX * 0.90,
                scaleY: baseScaleY * 1.10,
                duration: 320,
                ease: 'cubic.out',
                onComplete: () => {
                  cat.setAngle(0).setScale(baseScaleX, baseScaleY);
                  drawShadow(lanes[1], catY);
                },
              });
            });
          },
        });
      });
    };

    startDodgeCycle();

    // 7. Advance to Gameplay (Immediate tap or Auto-advance after 3.2s)
    const advance = () => {
      if (this.hasAdvanced) return;
      this.hasAdvanced = true;
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => {
        this.scene.start('GameplayScene', { resume: false });
      });
    };

    this.input.on('pointerdown', () => advance());
    this.time.delayedCall(3200, () => advance());

    this.scale.on('resize', (sz: Phaser.Structs.Size) => {
      this.cameras.main.setSize(sz.width, sz.height);
    });
  }
}

