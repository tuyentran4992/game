/**
 * M7 Skip King — MuteButton (TẦNG B UI — FUN2-C1): nút SOUND ON/OFF góc phải-dưới
 * (thumb reach — không đè HUD/HUD band), ≥44px touch target (MECHANICS.touchTargetPx).
 * Persist localStorage qua KvStorage inject (key sk_muted — '1' muted, '0' audible);
 * trạng thái áp NGAY vào plopSynth.setMuted() → play/playWhoosh no-op 0 node (tầng B chặn).
 * Text 100% EN (PB-5) từ hằng file này. Testid: mute-btn (label) + mute-btn-bg (nền).
 */
import * as Phaser from 'phaser';
import { MECHANICS } from '../config/mechanics';
import type { PlopSynth } from '../audio/plopSynth';
import type { KvStorage } from '../logic/runLifecycle';

/** Key persist mute (localStorage qua KvStorage — xuyên phiên). */
export const MUTE_KEY = 'sk_muted';

const LABEL_SIZE_PX = 24; // px — text ≥24 trên canvas 720 (ROLE-RULES game)
const PAD_X_PX = 18; // px — padding ngang nền nút [PLACEHOLDER] feel-tune
const PAD_Y_PX = 14; // px — padding dọc
const MARGIN_PX = 16; // px — cách mép màn
const BTN_COLOR = 0x1e3a5f; // xanh dịu — không cạnh tranh CTA end-card
const LABEL_ON = 'SOUND ON'; // EN (PB-5) — đang có tiếng
const LABEL_OFF = 'SOUND OFF'; // EN — đang câm (mute)

export class MuteButton {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private synth: PlopSynth;
  private storage: KvStorage;
  private muted: boolean;

  constructor(scene: Phaser.Scene, synth: PlopSynth, storage: KvStorage) {
    this.synth = synth;
    this.storage = storage;
    // Khôi phục trạng thái mute phiên trước (persist xuyên phiên — FUN2-C1).
    this.muted = storage.getItem(MUTE_KEY) === '1';
    synth.setMuted(this.muted);

    const w = scene.scale.width;
    const h = scene.scale.height;
    this.label = scene.add
      .text(0, 0, this.muted ? LABEL_OFF : LABEL_ON, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${LABEL_SIZE_PX}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(46);
    // Nền ≥ touchTargetPx theo cả 2 trục — tâm góc phải-dưới (thumb reach).
    const bw = Math.max(Math.ceil(this.label.width) + PAD_X_PX, MECHANICS.touchTargetPx);
    const bh = Math.max(Math.ceil(this.label.height) + PAD_Y_PX, MECHANICS.touchTargetPx);
    this.bg = scene.add
      .rectangle(w - MARGIN_PX - bw / 2, h - MARGIN_PX - bh / 2, bw, bh, BTN_COLOR, 0.92)
      .setDepth(45)
      .setInteractive({ useHandCursor: true });
    this.label.setPosition(this.bg.x, this.bg.y);
    this.bg.on('pointerdown', () => this.toggle());
    // QA soi qua testid (CONTRACT mục 4 — TEST-FIELDS mục mute-btn).
    this.label.setData('testid', 'mute-btn');
    this.bg.setData('testid', 'mute-btn-bg');
  }

  /** Đảo mute — áp synth NGAY + persist. Đường chung cho pointer + mirror test. */
  toggle(): void {
    this.muted = !this.muted;
    this.synth.setMuted(this.muted); // play/playWhoosh no-op 0 node khi true (tầng B)
    this.storage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    this.label.setText(this.muted ? LABEL_OFF : LABEL_ON);
  }

  // ---- mirror test (không lộ logic mới) ----
  isMuted(): boolean {
    return this.muted;
  }
  labelText(): string {
    return this.label.text;
  }
  bgCenterX(): number {
    return this.bg.x;
  }
  bgCenterY(): number {
    return this.bg.y;
  }
  minSidePx(): number {
    return Math.min(this.bg.width, this.bg.height);
  }
}
