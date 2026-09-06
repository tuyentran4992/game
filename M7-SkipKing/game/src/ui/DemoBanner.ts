/**
 * M7 Skip King — DemoBanner (T4 TẦNG B — CONTRACT 3.1): banner beat titles cho onboarding demo.
 * B0: "SKIP KING / FLICK TO SKIP" (2 dòng title) · B4: "YOUR TURN" (trao tay).
 * SWEET = vùng ngọt highlight (U2 — CHỈ demo) · SOUND OFF = audio resume fail.
 * Text 100% EN (PB-5). testid demo-banner (CONTRACT mục 4).
 */
import * as Phaser from 'phaser';

const TITLE_SIZE_PX = 54;
const SUB_SIZE_PX = 40;
const NOTE_SIZE_PX = 34;

export class DemoBanner {
  private main: Phaser.GameObjects.Text;
  private sub: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, cx: number, cy: number) {
    this.main = scene.add
      .text(cx, cy, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${TITLE_SIZE_PX}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(29)
      .setAlpha(0);
    this.sub = scene.add
      .text(cx, cy + 74, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${SUB_SIZE_PX}px`,
        color: '#dff1ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(29)
      .setAlpha(0);
    // QA soi banner demo (CONTRACT mục 4).
    this.main.setData('testid', 'demo-banner');
    this.sub.setData('testid', 'demo-banner');
  }

  /** B0 — title mở màn. */
  showTitle(main: string, sub: string): void {
    this.main.setFontSize(TITLE_SIZE_PX).setText(main).setColor('#ffffff').setAlpha(1);
    this.sub.setFontSize(SUB_SIZE_PX).setText(sub).setColor('#dff1ff').setAlpha(1);
  }

  /** B4 — trao tay. */
  showYourTurn(text = 'YOUR TURN'): void {
    this.main.setFontSize(TITLE_SIZE_PX).setText(text).setColor('#ffffff').setAlpha(1);
    this.sub.setText('').setAlpha(0);
  }

  /** Ghi chú nhỏ (sweet zone / SOUND OFF) — alpha theo mode highlight demo. */
  showNote(text: string): void {
    this.sub.setFontSize(NOTE_SIZE_PX).setText(text).setColor('#8ef6b2').setAlpha(1);
  }

  /** Xoá sạch banner — hết beat / skip / hết demo. */
  clear(): void {
    this.main.setText('').setAlpha(0);
    this.sub.setText('').setAlpha(0);
  }
}
