import Phaser from 'phaser';
import { color, type, sp, z, dur, fontStyle, toColor, liquidPalette } from '../tokens';
import { drawGalaxyBg, drawPanel, drawButton, spawnNeonBurst, synthAudio, GalaxyBgObjects } from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';
import { inputGate } from '../input-gate';
import { showAdLoading } from '../ad-ux';
import { AD_FLOW_TIMEOUT_MS, raceTimeout } from '../logic/ad-pacing';
import { MECHANICS } from '../logic/mechanics';

export class LevelClearScene extends Phaser.Scene {
  private bgObjects!: GalaxyBgObjects;
  /** chống double-tap NEXT (mỗi lần bấm chỉ 1 lần xét quảng cáo) */
  private advancing = false;

  constructor() {
    super({ key: 'LevelClearScene' });
  }

  create(data: { level: number; moves: number; optimal?: number; best: number; seals?: number }) {
    const { width, height } = this.scale;
    this.advancing = false;
    this.bgObjects = drawGalaxyBg(this);
    this.cameras.main.fadeIn(dur.base, 0, 0, 0);

    const level = data?.level ?? 1;
    const moves = data?.moves ?? 0;
    const optimal = data?.optimal ?? Math.max(3, level * 2 + 1);
    const best = data?.best ?? moves;
    const seals = data?.seals ?? 0;

    // 1. Pháo hoa Neon Confetti bắn tỏa ra
    this.spawnConfetti(width, height, seals);

    // 2. Overlay mờ nền
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, toColor('#000000'), 0)
      .setDepth(z.overlay);
    this.tweens.add({ targets: overlay, fillAlpha: 0.65, duration: dur.base, ease: 'quad.out' });

    // 3. Panel Frosted Glass slide-up
    const pw = Math.min(460, width - sp[5] * 2);
    const ph = Math.min(440, height - sp[5] * 2);
    const cx = width / 2, cy = height / 2;
    const root = this.add.container(cx, cy + 50).setDepth(z.panel).setAlpha(0);

    const panel = drawPanel(this, 0, 0, pw, ph);
    root.add(panel);

    // Title: LEVEL CLEAR!
    const title = this.add.text(0, -ph / 2 + sp[6] + 8, '🎉 LEVEL CLEAR!', fontStyle(type.h1, color.success))
      .setOrigin(0.5).setDepth(z.panel + 1);
    title.setShadow(0, 0, color.success, 16, false, true);
    root.add(title);
    this.tweens.add({
      targets: title,
      scale: 1.06,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });

    // 4. Star Rating (3 Stars: <= optimal+2 -> 3 stars, <= optimal+6 -> 2 stars, otherwise 1 star)
    const starContainer = this.add.container(0, -ph / 2 + sp[6] + 62).setDepth(z.panel + 1);
    root.add(starContainer);

    const starsEarned = moves <= optimal + 2 ? 3 : (moves <= optimal + 6 ? 2 : 1);
    const starSpacing = 48;
    for (let s = 0; s < 3; s++) {
      const sx = (s - 1) * starSpacing;
      const isEarned = s < starsEarned;
      const starText = this.add.text(sx, 0, '★', {
        fontFamily: 'sans-serif',
        fontSize: '38px',
        color: isEarned ? color.warning : '#4A3E62',
      }).setOrigin(0.5).setScale(0);

      if (isEarned) {
        starText.setShadow(0, 0, color.warning, 12, false, true);
      }
      starContainer.add(starText);

      // Star pop animation
      this.tweens.add({
        targets: starText,
        scale: 1,
        duration: 350,
        delay: 200 + s * 140,
        ease: 'back.out',
        onStart: () => {
          if (isEarned) synthAudio.playSparkle(s);
        },
      });
    }

    // 5. Stats: Moves & Optimal & Best
    const movesObj = { count: 0 };
    const movesT = this.add.text(0, -ph / 2 + sp[6] + 118, `Moves: 0`, fontStyle(type.score, color.surface))
      .setOrigin(0.5).setDepth(z.panel + 1);
    movesT.setShadow(0, 2, color.shadow, 4, false, true);
    root.add(movesT);

    this.tweens.add({
      targets: movesObj,
      count: moves,
      duration: 600,
      delay: 300,
      ease: 'cubic.out',
      onUpdate: () => {
        movesT.setText(`Moves: ${Math.round(movesObj.count)}`);
      },
    });

    const infoText = (best > 0 && best < moves)
      ? `★ Optimal: ${optimal} moves  |  Best: ${best}`
      : `★ Optimal: ${optimal} moves`;
    const bestT = this.add.text(0, movesT.y + 36, infoText, fontStyle(type.body, color.accent))
      .setOrigin(0.5).setDepth(z.panel + 1);
    bestT.setShadow(0, 2, color.shadow, 4, false, true);
    root.add(bestT);

    // 6. Next Level Button (data-testid: next-level-btn)
    const { container: nextBtn } = drawButton(this, 0, ph / 2 - sp[6] - 14, 'NEXT LEVEL ▶', {
      testid: 'next-level-btn',
      width: 250,
      height: 64,
      variant: 'primary',
      glowColor: color.primary,
    });
    root.add(nextBtn);

    nextBtn.on('pointerdown', () => {
      if (!inputGate.enabled || this.advancing) return;   // B2 pre-roll gate + chống double-tap
      this.advancing = true;
      synthAudio.playClick();
      void this.advance(level);
    });

    // Panel entrance tween
    this.tweens.add({
      targets: root,
      y: cy,
      alpha: 1,
      duration: dur.slow,
      ease: 'cubic.out',
    });

    this.scale.on('resize', (sz: Phaser.Structs.Size) => {
      this.cameras.main.setSize(sz.width, sz.height);
      root.setPosition(sz.width / 2, sz.height / 2);
      overlay.setPosition(sz.width / 2, sz.height / 2).setSize(sz.width, sz.height);
    });
  }

  // ==========================================================================
  // NEXT LEVEL + INTERSTITIAL PACING (AUDIT §B2-2/B2-3, M2-07)
  //
  //   * Cổng: level >= 3 && >= 2 level kể từ ad trước && cooldown 75 s
  //     (trước đây: 100 % số lần clear từ level 2 → nguy cơ policy + churn).
  //   * `Promise.race([ad, timeout(4 s)])` → nút NEXT KHÔNG BAO GIỜ treo;
  //     timeout / no-fill / lỗi → đi tiếp im lặng, không bao giờ bẫy người chơi.
  //   * Spinner "Ad loading…" trong lúc chờ (không phải màn hình đen im lặng).
  //   * Pacing được PERSIST (save v2.1 `ads.last_interstitial_ts/levels_since_ad`)
  //     nên reload / đổi phiên không reset cooldown.
  // ==========================================================================
  private async advance(level: number) {
    const now = Date.now();
    const wantAd = MECHANICS.ad.interstitialAfterClear
      && ctx.canShowInterstitial(level, now)
      && sdk.isInterstitialAvailable();

    if (wantAd) {
      // Ghi nhận NGAY (kể cả khi ad timeout/no-fill) → không thử lại dồn dập.
      ctx.markInterstitialShown(now);
      const spinner = showAdLoading(this, 'Ad loading…');
      try {
        await raceTimeout(
          sdk.requestInterstitialAd(AD_FLOW_TIMEOUT_MS).then(() => true),
          AD_FLOW_TIMEOUT_MS,
          false,
        );
      } catch (e) {
        console.warn('[ads] interstitial failed, continuing', e);
      } finally {
        spinner.destroy();
      }
    }

    if (!this.scene.isActive()) return;   // scene đã bị đổi trong lúc chờ ad

    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      ctx.currentLevel = level + 1;
      ctx.clearSession();          // P0-2: level mới → không resume board cũ
      void ctx.saveNow();          // flush ngay khi sang level (không chờ debounce)
      this.scene.start('GameplayScene');
    };

    this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
    this.time.delayedCall(dur.scene, go);
    // Chốt an toàn bằng timer THẬT: nếu scene bị platform pause đúng lúc chuyển
    // (ad chồng lấn), Phaser timer sẽ đứng → không bao giờ để người chơi kẹt ở
    // màn LEVEL CLEAR chỉ vì 1 quảng cáo.
    setTimeout(go, dur.scene + 2500);
  }

  // Confetti neon: burst giữa màn + vệt sáng rơi từ trên (ADD blend → phát sáng)
  private spawnConfetti(width: number, height: number, seals: number) {
    const cx = width / 2, cy = height * 0.42;

    spawnNeonBurst(this, cx, cy, liquidPalette, 46, Math.min(360, width * 0.7), z.overlay + 1);

    const streaks = 18 + Math.min(12, seals * 2);
    for (let i = 0; i < streaks; i++) {
      const hex = liquidPalette[Math.floor(Math.random() * liquidPalette.length)];
      const x = Phaser.Math.Between(sp[5], Math.max(sp[5] + 1, width - sp[5]));
      const p = this.add.rectangle(x, -20, 3, Phaser.Math.Between(10, 22), toColor(hex), 1)
        .setDepth(z.overlay + 1)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: p,
        y: height + 30,
        x: x + Phaser.Math.Between(-60, 60),
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0.2,
        duration: Phaser.Math.Between(1100, 2000),
        delay: i * 45,
        ease: 'sine.in',
        onComplete: () => p.destroy(),
      });
    }
  }
}
