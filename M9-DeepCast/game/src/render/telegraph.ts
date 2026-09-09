// Bite telegraph (Stage C): fish that WILL bite the still bait within ~1-2s get a
// blinking '!' — render-side read of state.fish only, the deterministic core is
// untouched (attach still happens exclusively in tick.ts). A fish is a prospect
// when the hook is parked (NIN), a slot is free and the fish is inside
// TELEGRAPH_R — at the attraction approach speed (~19-32 px/s) that warns ~1-2s
// ahead of the core HOOK_REACH = 30 attach.
import Phaser from 'phaser';
import type { FishInstance, GameState } from '../core/types.ts';
import { hookedWeight } from '../core/rules.ts';

export const TELEGRAPH_R = 56; // px warning radius (core attach radius is 30)

const maxSlots = (state: GameState): number => (state.doubleHook ? 2 : 1);

// Fish that are about to bite: still bait, free slot, inside the warning radius.
export const findProspects = (state: GameState): FishInstance[] => {
  if (state.phase !== 'dive' || state.hookMode !== 'hold' || state.whaleHooked) return [];
  if (state.hooked.length >= maxSlots(state)) return [];
  // a heavy catch (>=40kg) scares other fish off — mirror of the tick.ts gate
  if (state.hooked.length > 0 && hookedWeight(state) >= 40) return [];
  if (state.attachLock > 0) return [];
  const out: FishInstance[] = [];
  for (const f of state.fish) {
    if (!f.alive || state.hooked.includes(f.uid)) continue;
    if (f.defId === 'whale') continue;
    const dx = f.x - state.hookX;
    const dy = f.y - state.hookY;
    if (dx * dx + dy * dy < TELEGRAPH_R * TELEGRAPH_R) out.push(f);
  }
  return out;
};

export class Telegraph {
  private scene: Phaser.Scene;
  private marks = new Map<number, Phaser.GameObjects.Text>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(state: GameState, timeS: number): void {
    const prospects = findProspects(state);
    const seen = new Set<number>();
    for (const f of prospects) {
      seen.add(f.uid);
      let mark = this.marks.get(f.uid);
      if (!mark) {
        mark = this.scene.add
          .text(f.x, f.y - 26, '!', {
            fontFamily: 'sans-serif', fontSize: '26px', color: '#FFE66D',
            stroke: '#1B2A41', strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setDepth(14);
        this.marks.set(f.uid, mark);
      }
      // closer fish = faster blink, bigger mark, slight lift (urgency reads at a glance)
      const dist = Math.hypot(f.x - state.hookX, f.y - state.hookY);
      const urgency = 1 - Math.min(1, dist / TELEGRAPH_R);
      // pulse 0.5..1 (never fully off): the scale+lift carry the urgency, and a
      // paused frame always shows the mark (screenshot QA freezes on it)
      const blink = 0.75 + 0.25 * Math.sin(timeS * (9 + urgency * 9));
      mark.setPosition(f.x, f.y - 26 - urgency * 6)
        .setAlpha(Math.max(0.15, blink))
        .setScale(1 + urgency * 0.35)
        .setVisible(true);
    }
    for (const [uid, mark] of this.marks) {
      if (!seen.has(uid)) {
        mark.destroy();
        this.marks.delete(uid);
      }
    }
  }
}
