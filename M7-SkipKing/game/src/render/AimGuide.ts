/**
 * M7 Skip King — AimGuide (T3 Tầng B): đường ngắm khi kéo (CONTRACT §6 THIẾU-CẤM (b)):
 * line theo hướng bắn (ngược kéo), dài/dày ∝ lực + aim-gauge testid (CONTRACT mục 4).
 * Thuần vẽ — góc/lực đã do PullBackInput tính qua schema tầng A.
 */
import * as Phaser from 'phaser';
import type { FlickInput } from '../logic/types';
import { AIM } from './layout';
import { throwAngleDeg } from '../logic/mechanics';

const GAUGE_COLOR = 0xffffff;
const GAUGE_COLOR_PERFECT = 0x8ef6b2;

export class AimGuide {
  private line: Phaser.GameObjects.Graphics;
  private gauge: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, canvasWidth: number) {
    this.line = scene.add.graphics().setDepth(25);
    this.gauge = scene.add.graphics().setDepth(26);
    this.gauge.setData('testid', 'aim-gauge'); // QA soi gauge lực khi kéo
    this.label = scene.add
      .text(canvasWidth / 2, 0, 'DRAG & RELEASE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${AIM.labelFontSizePx}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(27)
      .setAlpha(0);
  }

  /** Nhãn hướng dẫn (U2) — alpha 0..1 (scene điều khiển mờ dần sau cú đầu). */
  setLabelAlpha(a: number): void {
    this.label.setAlpha(Math.max(0, Math.min(1, a)));
  }

  setLabelY(y: number): void {
    this.label.setY(y);
  }

  /**
   * Vẽ aim guide từ điểm xuất phát đá theo FlickInput đang kéo.
   * input null → xoá sạch (không vẽ rác).
   */
  render(ox: number, oy: number, input: FlickInput | null, isPerfect: boolean): void {
    this.line.clear();
    this.gauge.clear();
    if (!input) return;
    const power = Math.min(1, Math.max(0, input.power));
    const len = AIM.aimMinPx + (AIM.aimMaxPx - AIM.aimMinPx) * power;
    const angleDeg = throwAngleDeg(input);
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad); // hướng bắn ra xa (lên màn)
    const color = isPerfect ? GAUGE_COLOR_PERFECT : GAUGE_COLOR;
    const width = 2 + 5 * power; // dày ∝ lực
    // Đường ngắm đứt nét tiến dần — mũi tên chỉ hướng bay.
    this.line.lineStyle(width, color, 0.9);
    this.line.beginPath();
    this.line.moveTo(ox, oy);
    this.line.lineTo(ox + dx * len, oy + dy * len);
    this.line.strokePath();
    // Đầu mũi tên.
    const tx = ox + dx * len;
    const ty = oy + dy * len;
    this.line.fillStyle(color, 0.9);
    this.line.fillTriangle(
      tx,
      ty,
      tx - dx * 14 + dy * 7,
      ty - dy * 14 - dx * 7,
      tx - dx * 14 - dy * 7,
      ty - dy * 14 + dx * 7,
    );
    // Gauge lực: cung quét theo power quanh điểm xuất phát (dễ đọc liếc 0.3s).
    const gaugeR = 26;
    this.gauge.lineStyle(5, color, 0.95);
    this.gauge.beginPath();
    this.gauge.arc(ox, oy, gaugeR, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * power, false);
    this.gauge.strokePath();
  }
}
