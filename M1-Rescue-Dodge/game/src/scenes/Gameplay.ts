import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, fontStyle, paletteForLevel, toColor } from '../tokens';
import { drawGradientBg } from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';
import { MECHANICS } from '../logic/mechanics';

interface Bee { sprite: Phaser.GameObjects.Image; lane: number; dodged: boolean; }

export class GameplayScene extends Phaser.Scene {
  private scoreLabel!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private levelPopup!: Phaser.GameObjects.Text;
  private comboPopup!: Phaser.GameObjects.Text;
  private recordPopup!: Phaser.GameObjects.Container;
  private cat!: Phaser.GameObjects.Image;
  private bgG!: Phaser.GameObjects.Graphics;

  private lanes: number[] = [];
  private currentLane = 1;
  private moveSeq = 0; // phiên chuỗi di chuyển lane — input mới bump seq để hủy chuỗi cũ
  private bees: Bee[] = [];
  private elapsed = 0;
  private lastTick = 0;
  private lastSpawn = 0;
  private running = false;
  private muted = false;

  constructor() { super({ key: 'GameplayScene' }); }

  async create() {
    const { width, height } = this.scale;
    ctx.engine.startNewGame();
    this.elapsed = 0; this.lastTick = 0; this.lastSpawn = 0; this.bees = []; this.currentLane = 1;
    this.moveSeq = 0;
    this.running = false; this.muted = !sdk.isAudioEnabled();

    // 3 lane dọc (DESIGN-SPEC 2.3): y từ h*0.55 đến h*0.80, cách 160px (co theo viewport)
    const laneSpan = Math.min(160, height * 0.12);
    const laneCenter = height * 0.72;
    this.lanes = [laneCenter - laneSpan, laneCenter, laneCenter + laneSpan];

    this.drawLevelBg(1);

    // HUD (DESIGN-SPEC 3.2)
    this.scoreLabel = this.add.text(sp[4] + 50, sp[4] + 20, '0', fontStyle(type.score, color.textOnAccent))
      .setOrigin(0.5).setDepth(z.hud);
    this.scoreLabel.setData('testid', 'score-label');
    this.levelLabel = this.add.text(sp[4] + 160, sp[4] + 20, 'Level 1', fontStyle(type.small, color.textPrimary))
      .setOrigin(0.5).setDepth(z.hud);
    this.levelLabel.setData('testid', 'level-label');

    // Popups (non-blocking, z30)
    this.levelPopup = this.add.text(width / 2, height * 0.40, '', fontStyle(type.h1, color.textOnAccent))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);
    this.levelPopup.setData('testid', 'level-popup');
    this.comboPopup = this.add.text(width / 2, height * 0.55, '', fontStyle(type.display, color.success))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);
    this.comboPopup.setData('testid', 'combo-popup');
    this.recordPopup = this.add.container(width / 2, height * 0.28).setDepth(z.tutorial).setAlpha(0);
    this.recordPopup.setData('testid', 'record-popup');

    // Mèo
    this.cat = this.add.image(width / 2, this.lanes[this.currentLane], 'cat_idle')
      .setDisplaySize(120, 120).setDepth(z.actor);
    this.cat.setData('testid', 'cat');
    // F5: ong spawn bên phải (x = width+60) bay sang trái → mèo quay mặt PHẢI về phía ong.
    // Sprite cat_idle mặc định quay TRÁI (khối lượng đầu/râu nằm bên trái) → lật ngang.
    this.cat.setFlipX(true);

    // Input (SPEC 4.1): chạm/click về phía lane muốn né — mèo đi tới lane GẦN vị trí chạm nhất
    // (từng lane một, tween ~120ms/lane). Trùng lane hiện tại → không di chuyển (đỡ giật).
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.running) return;
      this.moveToNearestLane(p.y);
    });

    // Bàn phím desktop (SPEC 4.1): ↑/W → lane trên, ↓/S → lane dưới (clamp 3 lane)
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!this.running) return;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.moveLane(-1);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.moveLane(1);
      }
    });

    // Audio mute platform
    sdk.onAudioEnabledChange((enabled: boolean) => { this.muted = !enabled; });

    // Bắt đầu sau fade-in
    this.cameras.main.fadeIn(dur.scene, 0, 0, 0);
    this.cameras.main.once('camerafadeincomplete', () => { this.running = true; });

    // F9 (ĐỢT 8): BGM loop khi vào Gameplay (setLoop true, volume 0.3).
    // Tôn trọng mute toàn cục (game.sound.mute do sdk.onAudioEnabledChange set).
    this.startBgm();

    this.scale.on('resize', (g: Phaser.Structs.Size) => this.onResize(g));
  }

  // F9: phát BGM loop (idempotent — không overlap nếu đang phát).
  private startBgm() {
    const bgm = this.sound.get('bgm_main');
    if (!bgm || !bgm.isPlaying) {
      this.sound.play('bgm_main', { loop: true, volume: 0.3 });
    }
  }

  // F9: helper phát sfx tôn trọng mute phiên + chỉ khi audio đã preload (tránh warning).
  private playSfx(key: string, volume = 0.35) {
    if (this.muted) return;
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume });
  }

  private drawLevelBg(level: number) {
    if (this.bgG) this.bgG.destroy();
    const pal = paletteForLevel(level);
    this.bgG = drawGradientBg(this, pal.bgTop, pal.bgBottom, pal.grass);
    // vạch lane (DESIGN-SPEC 2.3)
    const g = this.bgG;
    const { width, height } = this.scale;
    g.lineStyle(4, toColor(pal.lane), 0.35);
    for (const ly of this.lanes) {
      // nét đứt: vẽ nhiều đoạn ngắn
      for (let x = 0; x < width; x += 30) g.strokeLineShape(new Phaser.Geom.Line(x, ly, x + 18, ly));
    }
  }

  // SPEC 4.1: lane gần vị trí chạm/click nhất (trong this.lanes)
  private laneAt(y: number): number {
    let best = this.currentLane;
    for (let i = 0; i < this.lanes.length; i++) {
      if (Math.abs(this.lanes[i] - y) < Math.abs(this.lanes[best] - y)) best = i;
    }
    return best;
  }

  // SPEC 4.1: chạm/click → mèo đi TỪNG LANE (tween ~120ms/lane) tới lane gần vị trí chạm nhất.
  // Input mới bump moveSeq → chuỗi cũ tự hủy (không xếp đống tween giật nhau).
  private moveToNearestLane(y: number) {
    const seq = ++this.moveSeq;
    this.stepTo(this.laneAt(y), seq);
  }

  // Bàn phím (SPEC 4.1): ↑/W → -1 (lên 1 lane), ↓/S → +1 (xuống 1 lane). Clamp trong stepTo.
  private moveLane(dir: number) {
    const seq = ++this.moveSeq;
    this.stepTo(this.currentLane + dir, seq);
  }

  // 1 bước tween sang lane kề; xong nối tiếp về target nếu chuỗi còn hợp lệ (seq khớp moveSeq).
  private stepTo(target: number, seq: number) {
    const clamped = Phaser.Math.Clamp(target, 0, MECHANICS.laneCount - 1);
    if (clamped === this.currentLane) return; // trùng lane hiện tại → không di chuyển (đỡ giật)
    const next = this.currentLane + Math.sign(clamped - this.currentLane);
    const prev = this.currentLane;
    this.currentLane = next;
    this.tweens.killTweensOf(this.cat); // hủy tween lane cũ tránh 2 tween giật nhau
    // tween đổi lane (5.3) — F5: lật flipX nên đảo dấu rotate giữ hướng nghiêng đúng (lên = -15°, xuống = +15°)
    this.tweens.add({
      targets: this.cat, y: this.lanes[next],
      duration: dur.tn, ease: 'cubic.inout',
      onUpdate: () => { this.cat.setRotation(-(next - prev) * 0.26); },
      onComplete: () => {
        this.cat.setRotation(0);
        if (seq === this.moveSeq && this.currentLane !== clamped) this.stepTo(clamped, seq);
      },
    });
  }

  update(time: number, deltaMs: number) {
    if (!this.running) return;
    const dt = deltaMs / 1000;
    this.elapsed += dt;

    // score +1/s (BR time)
    this.lastTick += dt;
    if (this.lastTick >= 1) {
      this.lastTick -= 1;
      ctx.engine.tickSecond();
      this.updateHud();
    }

    // spawn ong theo difficulty
    const diff = ctx.engine.difficulty(this.elapsed, ctx.engine.getLevel());
    this.lastSpawn += dt;
    const spawnInterval = Math.max(0.6, 2.0 - (diff.speed - MECHANICS.startSpeed) * 0.005);
    if (this.lastSpawn >= spawnInterval && this.bees.length < diff.spawnCount + 1) {
      this.lastSpawn = 0;
      this.spawnBee(diff.speed);
    }

    // di chuyển + va chạm
    const catX = this.cat.x;
    for (const b of this.bees) {
      b.sprite.x -= diff.speed * dt;
      // né thành công: bee qua mèo mà không cùng lane
      if (!b.dodged && b.sprite.x < catX - 10) {
        b.dodged = true;
        if (b.lane !== this.currentLane) {
          this.onDodge(b);
        }
      }
      // va chạm: bee cùng lane & trùng x
      if (b.lane === this.currentLane && Math.abs(b.sprite.x - catX) < 50 && b.sprite.x > catX - 60) {
        return this.onHit();
      }
      if (b.sprite.x < -120) { b.sprite.destroy(); }
    }
    this.bees = this.bees.filter(b => b.sprite.active);

    // kỷ lục mới (BR-16) popup 1 lần/phiên
    if (ctx.engine.checkRecord()) this.showRecordPopup();
  }

  private spawnBee(speed: number) {
    const lane = Phaser.Math.Between(0, MECHANICS.laneCount - 1);
    const sprite = this.add.image(this.scale.width + 60, this.lanes[lane], 'bee_wasp')
      .setDisplaySize(80, 80).setDepth(z.actor);
    const bee: Bee = { sprite, lane, dodged: false };
    this.bees.push(bee);
    // sin nhẹ dọc (5.7)
    this.tweens.add({ targets: sprite, y: this.lanes[lane] + 20, duration: 1000, yoyo: true, repeat: -1, ease: 'sine.inout' });
  }

  private onDodge(_bee: Bee) {
    const r = ctx.engine.registerDodge();
    this.updateHud();
    // F9 (ĐỢT 8): né → sfx_dodge; +điểm mỗi lần né → sfx_score.
    this.playSfx('sfx_dodge', 0.4);
    this.playSfx('sfx_score', 0.3);
    if (r.comboTriggered) this.showComboPopup();
    if (r.levelUp) this.onLevelUp(r.newLevel);
  }

  private onLevelUp(level: number) {
    this.drawLevelBg(level);
    this.levelLabel.setText('Level ' + level);
    this.tweens.add({ targets: this.levelLabel, scale: 1.3, duration: dur.tn, yoyo: true, ease: 'back.out' });
    this.levelPopup.setText('Level ' + level);
    this.tweens.add({
      targets: this.levelPopup, alpha: 1, scale: { from: 0.6, to: 1 }, duration: 200, ease: 'back.out',
      onComplete: () => this.tweens.add({ targets: this.levelPopup, alpha: 0, duration: 300, delay: 1000, ease: 'cubic.in' }),
    });
    // F9: level up → sfx_levelup
    this.playSfx('sfx_levelup', 0.4);
  }

  private showComboPopup() {
    this.comboPopup.setText('+5');
    this.comboPopup.setPosition(this.cat.x, this.cat.y - 40).setAlpha(1).setScale(0.7);
    this.tweens.add({
      targets: this.comboPopup, y: this.cat.y - 120, alpha: 0, scale: 1.25, duration: 700, ease: 'quad.out',
    });
    // F9: combo +5 → sfx_combo
    this.playSfx('sfx_combo', 0.4);
  }

  private showRecordPopup() {
    const { width } = this.scale;
    const bg = this.add.graphics();
    bg.fillStyle(toColor(color.surface), 0.95); bg.fillRoundedRect(-160, -28, 320, 56, radius.lg);
    bg.lineStyle(4, toColor(color.warning), 1); bg.strokeRoundedRect(-160, -28, 320, 56, radius.lg);
    const t = this.add.text(0, 0, 'NEW RECORD!', fontStyle(type.h1, color.warning)).setOrigin(0.5);
    this.recordPopup.removeAll(true);
    this.recordPopup.add([bg, t]);
    this.recordPopup.setPosition(width / 2, this.scale.height * 0.28).setAlpha(0).setScale(0.8);
    this.tweens.add({
      targets: this.recordPopup, alpha: 1, scale: 1, duration: 250, ease: 'back.out',
      onComplete: () => this.tweens.add({ targets: this.recordPopup, alpha: 0, duration: 350, delay: 1000, ease: 'linear' }),
    });
  }

  private updateHud() {
    this.scoreLabel.setText(String(ctx.engine.score));
    this.tweens.add({ targets: this.scoreLabel, scale: 1.35, duration: 150, yoyo: true, ease: 'back.out' });
  }

  private async onHit() {
    this.running = false;
    this.moveSeq++; // hủy chuỗi di chuyển lane đang treo (tween chết của mèo nhận quyền)
    ctx.engine.registerHit();
    // F9: va chạm ong → sfx_hit; dừng BGM khi kết thúc (Game Over sẽ phát sfx_gameover).
    this.playSfx('sfx_hit', 0.4);
    this.sound.stopByKey('bgm_main');
    this.cameras.main.shake(160, 0.01);
    this.tweens.add({ targets: this.cat, angle: 30, y: this.cat.y + 90, duration: 350, ease: 'cubic.out' });
    const end = ctx.engine.endGame();
    sdk.sendScore(end.score);
    await ctx.saveBest();
    this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
    this.time.delayedCall(dur.scene + 100, () => {
      this.scene.start('GameOverScene', {
        score: end.score, bestScore: end.bestScore, isNewRecord: end.isNewRecord,
      });
    });
  }

  private onResize(g: Phaser.Structs.Size) {
    const laneSpan = Math.min(160, g.height * 0.12);
    const laneCenter = g.height * 0.72;
    this.lanes = [laneCenter - laneSpan, laneCenter, laneCenter + laneSpan];
    // resize giữa chừng tween lane → snap thẳng về lane hiện tại (BR-05 giữ state)
    this.moveSeq++;
    this.tweens.killTweensOf(this.cat);
    if (this.cat) this.cat.x = g.width / 2, this.cat.y = this.lanes[this.currentLane];
    if (this.scoreLabel) this.scoreLabel.setPosition(sp[4] + 50, sp[4] + 20);
    if (this.levelLabel) this.levelLabel.setPosition(sp[4] + 160, sp[4] + 20);
    if (this.levelPopup) this.levelPopup.setPosition(g.width / 2, g.height * 0.40);
  }
}
