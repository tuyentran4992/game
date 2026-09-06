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
/**
 * Màu highlight window PERFECT — CHỈ demo dùng (U2, ALIGNMENT-DECISION dòng 47:
 * "highlight vùng ngọt CHỈ trong demo"). Export để T4 (onboarding demo B3) gọi;
 * PlayScene stage local truyền highlightPerfect=false CỨNG — không lộ window cho người chơi.
 */
export const GAUGE_COLOR_PERFECT = 0x8ef6b2;

export class AimGuide {
  private line: Phaser.GameObjects.Graphics;
  private gauge: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  /** Vùng ngọt demo (U2) — CHỈ OnboardingPlayScene vẽ khi highlight bật. */
  private sweet: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, canvasWidth: number) {
    this.line = scene.add.graphics().setDepth(25);
    this.gauge = scene.add.graphics().setDepth(26);
    this.gauge.setData('testid', 'aim-gauge'); // QA soi gauge lực khi kéo
    this.sweet = scene.add.graphics().setDepth(24); // dưới line/gauge — nền vùng ngọt
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

  /** Tắt vùng ngọt demo (U2) — xoá graphics vùng highlight. */
  clearSweetZone(): void {
    this.sweet.clear();
  }

  /**
   * Vùng ngọt highlight (U2 — CHỈ demo T4 gọi): dải ngang quanh điểm xuất phát,
   * mép trong [minPx..maxPx] theo band lực window — rip cong 2 đầu.
   */
  renderSweetZone(
    ox: number,
    oy: number,
    minPx: number,
    maxPx: number,
    color: number,
    alpha: number,
    ripPx: number,
  ): void {
    this.sweet.clear();
    this.sweet.fillStyle(color, alpha);
    this.sweet.fillRoundedRect(ox - ripPx, oy - maxPx - ripPx, ripPx * 2 + 2, maxPx - minPx + ripPx * 2, ripPx);
  }

  /**
   * Vẽ aim guide từ điểm xuất phát đá theo FlickInput đang kéo.
   * input null → xoá sạch (không vẽ rác).
   * highlightPerfect CHỈ true khi stage demo (T4) — người chơi thật luôn false (U2).
   */
  render(
    ox: number,
    oy: number,
    input: FlickInput | null,
    highlightPerfect: boolean,
  ): void {
    this.line.clear();
    this.gauge.clear();
    if (!input) return;
    const power = Math.min(1, Math.max(0, input.power));
    const len = AIM.aimMinPx + (AIM.aimMaxPx - AIM.aimMinPx) * power;
    const angleDeg = throwAngleDeg(input);
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad); // hướng bắn ra xa (lên màn)
    const color = highlightPerfect ? GAUGE_COLOR_PERFECT : GAUGE_COLOR; // trắng-đục alpha 0.9 (U4)
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
