import {
  PEEL_CONFIG,
  FRUITS_ROTATION,
  FruitDefinition,
  GAME_CONFIG,
} from '../config/peelConfig';
import {
  ActiveStroke,
  DisconnectReason,
  GrooveState,
  PeelQuality,
  PeelStatus,
  PeelStrokeEndOutput,
  PeelUpdateOutput,
} from './types';

export class PeelStateMachine {
  private currentFruitIndex: number = 1;
  private fruitRotationIndex: number = 0;
  private streak: number = 0;
  private status: PeelStatus = 'IDLE';

  private activeStroke: ActiveStroke | null = null;
  private grooves: GrooveState[] = [];

  // Chiều dài cần vuốt ngang qua quả để hoàn thành 1 nhát gọt (px)
  public static readonly TARGET_SWIPE_PX: number = 260;

  constructor(initialFruitIndex: number = 0) {
    this.fruitRotationIndex = initialFruitIndex % FRUITS_ROTATION.length;
    this.initGrooves();
  }

  public initGrooves(): void {
    this.grooves = [];
    const count = 3;

    for (let i = 0; i < count; i++) {
      this.grooves.push({
        index: i,
        startAngleRad: 0,
        totalArcRad: Math.PI,
        peeledRatio: 0,
        isCompleted: false,
      });
    }
  }

  public getCurrentFruit(): FruitDefinition {
    return FRUITS_ROTATION[this.fruitRotationIndex];
  }

  public getFruitIndex(): number {
    return this.currentFruitIndex;
  }

  public getStreak(): number {
    return this.streak;
  }

  public getStatus(): PeelStatus {
    return this.status;
  }

  public getGrooves(): GrooveState[] {
    return this.grooves;
  }

  public getActiveStroke(): ActiveStroke | null {
    return this.activeStroke;
  }

  /**
   * Bắt đầu gọt: Chạm vào bất kỳ vị trí hợp lệ nào trên quả
   */
  public startPeel(
    x: number,
    y: number,
    timestampMs: number,
    cx: number = GAME_CONFIG.CENTER_X,
    cy: number = GAME_CONFIG.CENTER_Y
  ): boolean {
    const fruit = this.getCurrentFruit();
    const dx = x - cx;
    const dy = y - cy;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);

    // Kiểm tra nằm trong phạm vi bề mặt quả (bán kính ~ 180px + dung sai 35px)
    if (distFromCenter > fruit.radiusX + 35) {
      return false;
    }

    // Xác định dải gọt (0: Top, 1: Middle, 2: Bottom) dựa vào vị trí Y
    let targetIndex = 1;
    if (dy < -25) {
      targetIndex = 0;
    } else if (dy > 25) {
      targetIndex = 2;
    }

    // Nếu dải đó đã gọt xong, tìm dải chưa gọt gần nhất
    let targetGroove = this.grooves[targetIndex];
    if (targetGroove.isCompleted) {
      const uncompleted = this.grooves.filter((g) => !g.isCompleted);
      if (uncompleted.length === 0) return false;
      targetGroove = uncompleted[0];
    }

    this.status = 'PEELING';
    this.activeStroke = {
      grooveIndex: targetGroove.index,
      startAngleRad: x, // Lưu tọa độ X bắt đầu
      lastAngleRad: x,  // Lưu tọa độ X trước đó
      currentAngleRad: x,
      accumulatedArcRad: 0,
      targetArcRad: PeelStateMachine.TARGET_SWIPE_PX,
      direction: 1, // Vuốt từ phải sang trái (X giảm dần)
      startTimeMs: timestampMs,
      lastMoveTimeMs: timestampMs,
      peeledRatio: 0,
      points: [{ x, y, angle: 0, time: timestampMs }],
    };

    return true;
  }

  /**
   * Cập nhật chuyển động vuốt gọt ngang qua mặt quả
   */
  public updatePeel(
    x: number,
    y: number,
    timestampMs: number,
    cx: number = GAME_CONFIG.CENTER_X,
    cy: number = GAME_CONFIG.CENTER_Y
  ): PeelUpdateOutput {
    if (this.status !== 'PEELING' || !this.activeStroke) {
      return {
        status: this.status,
        peeledDeltaArcRad: 0,
        currentRatio: 0,
        currentAngleRad: 0,
        currentRadius: 180,
        speedDegPerFrame: 0,
        isDisconnected: false,
        isGrooveCompleted: false,
        allGroovesCompleted: false,
        streak: this.streak,
      };
    }

    const stroke = this.activeStroke;
    const deltaMs = timestampMs - stroke.lastMoveTimeMs;

    // 1. Kiểm tra dừng tay quá 220ms
    if (deltaMs > 220) {
      return this.triggerDisconnect('TIMEOUT_STALLED', x, y);
    }

    // 2. Kiểm tra nếu ngón tay bay quá xa khỏi quả (> 220px)
    const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (distFromCenter > 220) {
      return this.triggerDisconnect('OUT_OF_TRACK', x, y);
    }

    // 3. Tính quãng đường vuốt sang trái (x giảm dần)
    const deltaX = stroke.lastAngleRad - x; // Dương khi di chuyển sang trái

    // Nếu vuốt ngược chiều sang phải quá 22px -> Đứt
    if (deltaX < -22) {
      return this.triggerDisconnect('REVERSED_DIRECTION', x, y);
    }

    const effectiveDelta = Math.max(0, deltaX);
    stroke.accumulatedArcRad += effectiveDelta;

    const currentRatio = Math.min(
      1.0,
      stroke.accumulatedArcRad / stroke.targetArcRad
    );
    stroke.peeledRatio = currentRatio;

    const groove = this.grooves[stroke.grooveIndex];
    if (groove) {
      groove.peeledRatio = Math.max(groove.peeledRatio, currentRatio);
    }

    const speedDegPerFrame =
      (Math.abs(effectiveDelta) / Math.max(1, deltaMs)) * (1000 / 60);

    stroke.lastAngleRad = x;
    stroke.currentAngleRad = x;
    stroke.lastMoveTimeMs = timestampMs;
    stroke.points.push({ x, y, angle: currentRatio * Math.PI, time: timestampMs });

    // Hoàn thành rãnh khi đạt >= 80% (rất tự nhiên và dễ đạt)
    const isGrooveCompleted = currentRatio >= 0.80;
    if (isGrooveCompleted && groove) {
      groove.isCompleted = true;
    }

    const allGroovesCompleted = this.checkAllGroovesCompleted();

    return {
      status: this.status,
      peeledDeltaArcRad: effectiveDelta,
      currentRatio,
      currentAngleRad: currentRatio * Math.PI,
      currentRadius: 180,
      speedDegPerFrame,
      isDisconnected: false,
      isGrooveCompleted,
      allGroovesCompleted,
      streak: this.streak,
    };
  }

  public endPeel(timestampMs: number): PeelStrokeEndOutput {
    if (!this.activeStroke) {
      return {
        quality: 'FAILED',
        ratio: 0,
        grooveIndex: 0,
        streak: this.streak,
        allGroovesCompleted: this.checkAllGroovesCompleted(),
      };
    }

    const stroke = this.activeStroke;
    const ratio = stroke.peeledRatio;
    const grooveIndex = stroke.grooveIndex;
    let quality: PeelQuality = 'FAILED';

    // Ngưỡng hoàn thành nhát gọt
    if (ratio >= 0.75) {
      quality = 'PERFECT';
      this.streak += PEEL_CONFIG.COMBO_INCREMENT;
      this.grooves[grooveIndex].isCompleted = true;
      this.grooves[grooveIndex].peeledRatio = 1.0;
    } else if (ratio >= 0.50) {
      quality = 'GOOD';
      this.grooves[grooveIndex].isCompleted = true;
      this.grooves[grooveIndex].peeledRatio = 1.0;
    } else {
      quality = 'INCOMPLETE';
      this.streak = 0;
    }

    this.activeStroke = null;
    this.status = 'IDLE';

    const allCompleted = this.checkAllGroovesCompleted();
    if (allCompleted) {
      this.advanceToNextFruit();
    }

    return {
      quality,
      ratio,
      grooveIndex,
      streak: this.streak,
      allGroovesCompleted: allCompleted,
    };
  }

  private triggerDisconnect(
    reason: DisconnectReason,
    _x: number,
    _y: number
  ): PeelUpdateOutput {
    this.status = 'DISCONNECTED';
    this.streak = 0;

    const currentRatio = this.activeStroke?.peeledRatio ?? 0;
    this.activeStroke = null;

    return {
      status: 'DISCONNECTED',
      peeledDeltaArcRad: 0,
      currentRatio,
      currentAngleRad: 0,
      currentRadius: 180,
      speedDegPerFrame: 0,
      isDisconnected: true,
      disconnectReason: reason,
      quality: 'FAILED',
      isGrooveCompleted: false,
      allGroovesCompleted: false,
      streak: this.streak,
    };
  }

  public checkAllGroovesCompleted(): boolean {
    return this.grooves.every((g) => g.isCompleted);
  }

  public advanceToNextFruit(): void {
    this.currentFruitIndex += 1;
    this.fruitRotationIndex =
      (this.fruitRotationIndex + 1) % FRUITS_ROTATION.length;
    this.initGrooves();
    this.status = 'IDLE';
    this.activeStroke = null;
  }
}
