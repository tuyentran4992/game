import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../config/peelConfig';
import { PeelStateMachine } from '../logic/PeelStateMachine';
import { FruitRenderer } from '../render/FruitRenderer';
import { SpringRibbon } from '../render/SpringRibbon';
import { PeelEffects } from '../render/PeelEffects';
import { PeelAudioSynth } from '../audio/PeelAudioSynth';

export class PlayScene extends Phaser.Scene {
  private stateMachine!: PeelStateMachine;
  private fruitRenderer!: FruitRenderer;
  private ribbon!: SpringRibbon;
  private effects!: PeelEffects;
  private audioSynth!: PeelAudioSynth;

  // HUD: "QUẢ N" (trái) + "STREAK N" (phải)
  private fruitCounterText!: Phaser.GameObjects.Text;
  private streakCounterText!: Phaser.GameObjects.Text;

  private isPointerDown: boolean = false;
  private lastPointerPos: { x: number; y: number } = { x: 0, y: 0 };
  private currentKnifePos: {
    x: number;
    y: number;
    active: boolean;
    angle: number;
  } = {
    x: 0,
    y: 0,
    active: false,
    angle: 0,
  };

  private distanceSinceLastZest: number = 0;

  constructor() {
    super('PlayScene');
  }

  public create(): void {
    // 1. Khởi tạo Logic State Machine
    this.stateMachine = new PeelStateMachine(0);

    // 2. Khởi tạo Renderer, Ribbon & Audio
    this.fruitRenderer = new FruitRenderer(this);
    this.ribbon = new SpringRibbon(this);
    this.effects = new PeelEffects(this);
    this.audioSynth = new PeelAudioSynth();

    // 3. Khởi tạo HUD tối giản
    this.createMinimalHUD();

    // 4. Lắng nghe Input
    this.setupInputHandlers();

    // 5. Khởi tạo quả đầu tiên
    const currentFruit = this.stateMachine.getCurrentFruit();
    this.fruitRenderer.setFruit(currentFruit, this.stateMachine.getFruitIndex());
    this.fruitRenderer.triggerFruitSpawnBounce();
  }

  private createMinimalHUD(): void {
    // Góc trái: "QUẢ 1"
    this.fruitCounterText = this.add
      .text(32, 44, `QUẢ ${this.stateMachine.getFruitIndex()}`, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '24px',
        fontStyle: '800',
        color: '#94a3b8',
      })
      .setDepth(50);

    // Góc phải: "STREAK 0"
    this.streakCounterText = this.add
      .text(GAME_CONFIG.WIDTH - 32, 44, 'STREAK 0', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '24px',
        fontStyle: '900',
        color: '#f59e0b',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setDepth(50);
  }

  private updateHUD(): void {
    const fruitIdx = this.stateMachine.getFruitIndex();
    const streak = this.stateMachine.getStreak();

    this.fruitCounterText.setText(`QUẢ ${fruitIdx}`);

    if (streak > 0) {
      this.streakCounterText.setText(`STREAK ×${streak}`);
      this.streakCounterText.setColor('#fbbf24');
    } else {
      this.streakCounterText.setText('STREAK 0');
      this.streakCounterText.setColor('#64748b');
    }
  }

  private setupInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.audioSynth.resume();
      this.isPointerDown = true;
      this.lastPointerPos = { x: pointer.x, y: pointer.y };
      this.distanceSinceLastZest = 0;

      const fruit = this.stateMachine.getCurrentFruit();
      const started = this.stateMachine.startPeel(
        pointer.x,
        pointer.y,
        this.time.now
      );

      const angle = Math.atan2(
        pointer.y - GAME_CONFIG.CENTER_Y,
        pointer.x - GAME_CONFIG.CENTER_X
      );

      const initialTangent = angle + Math.PI * 0.5;

      this.currentKnifePos = {
        x: pointer.x,
        y: pointer.y,
        active: true,
        angle: initialTangent,
      };

      if (started) {
        this.fruitRenderer.onCutStarted(); // Fade ngay vòng hint trắng ấm
        this.ribbon.start(pointer.x, pointer.y, initialTangent, fruit, 1);
        this.fruitRenderer.eraseAt(pointer.x, pointer.y, pointer.x, pointer.y);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPointerDown) return;

      const dx = pointer.x - this.lastPointerPos.x;
      const dy = pointer.y - this.lastPointerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // ĐỘ TRỄ MASK = 0: Vẽ vết xóa ngay lập tức cùng frame tại pointer thật
      this.fruitRenderer.eraseAt(
        this.lastPointerPos.x,
        this.lastPointerPos.y,
        pointer.x,
        pointer.y
      );

      let swipeAngle = this.currentKnifePos.angle;
      if (dist > 2) {
        swipeAngle = Math.atan2(dy, dx);
      }

      this.currentKnifePos = {
        x: pointer.x,
        y: pointer.y,
        active: true,
        angle: swipeAngle,
      };

      const fruit = this.stateMachine.getCurrentFruit();
      const update = this.stateMachine.updatePeel(
        pointer.x,
        pointer.y,
        this.time.now
      );

      if (update.status === 'PEELING') {
        // Cập nhật Ribbon
        this.ribbon.updateHead(
          pointer.x,
          pointer.y,
          swipeAngle,
          update.speedDegPerFrame
        );

        // Bắn 2-4 vụn vỏ cam 2 tông màu theo pháp tuyến
        this.distanceSinceLastZest += dist;
        if (this.distanceSinceLastZest >= 14) {
          const normalAngle = swipeAngle - Math.PI * 0.5;
          const count = 2 + Math.floor(Math.random() * 3);
          this.effects.emitCuttingZest(
            pointer.x,
            pointer.y,
            normalAngle,
            fruit.rindColor,
            fruit.fleshColor,
            count
          );
          this.distanceSinceLastZest = 0;
        }

        this.audioSynth.updateFriction(update.speedDegPerFrame, true);
      } else if (update.isDisconnected) {
        this.handleDisconnect();
      }

      this.lastPointerPos = { x: pointer.x, y: pointer.y };
      this.updateHUD();
    });

    this.input.on('pointerup', () => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;
      this.currentKnifePos.active = false;
      this.audioSynth.updateFriction(0, false);

      const oldFruitIndex = this.stateMachine.getFruitIndex();
      const fruit = this.stateMachine.getCurrentFruit();
      const strokeEnd = this.stateMachine.endPeel(this.time.now);

      if (strokeEnd.quality === 'PERFECT') {
        this.audioSynth.playPop(true);
        this.effects.showPopText('PERFECT PEEL!', '#FFD700', true);
        this.effects.emitPerfectBurst(
          this.currentKnifePos.x || GAME_CONFIG.CENTER_X,
          this.currentKnifePos.y || GAME_CONFIG.CENTER_Y,
          fruit.rindColor
        );
        this.ribbon.release(true);
      } else if (strokeEnd.quality === 'GOOD') {
        this.audioSynth.playPop(false);
        this.effects.showPopText('GOOD PEEL!', '#4ADE80', false);
        this.ribbon.release(true);
      } else {
        this.handleDisconnect();
      }

      // Đổi quả nếu xong cả 3 rãnh
      if (this.stateMachine.getFruitIndex() !== oldFruitIndex) {
        const nextFruit = this.stateMachine.getCurrentFruit();
        this.fruitRenderer.setFruit(nextFruit, this.stateMachine.getFruitIndex());
        this.time.delayedCall(120, () => {
          this.fruitRenderer.triggerFruitSpawnBounce();
        });
      }

      this.updateHUD();
    });
  }

  private handleDisconnect(): void {
    this.audioSynth.updateFriction(0, false);
    this.audioSynth.playRip();
    this.fruitRenderer.triggerRedFlash();
    this.ribbon.release(false);
    this.updateHUD();
  }

  public update(_time: number, delta: number): void {
    this.ribbon.update(delta);
    this.effects.update();

    const fruit = this.stateMachine.getCurrentFruit();
    const grooves = this.stateMachine.getGrooves();
    this.fruitRenderer.render(
      fruit,
      grooves,
      this.currentKnifePos.active ? this.currentKnifePos : null,
      delta
    );
  }
}
