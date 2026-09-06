// T4 TDD-B — onboarding logic (tầng A thuần thời gian — CONTRACT 3.1): beats B0–B4,
// cú demo theo ScriptedFlickProvider (CÙNG schema sim), plop đầu ≤3s session,
// sweet-zone highlight CHỈ demo (U2), demo-once qua storage inject (sk_done), skip-on-touch.
import { describe, it, expect } from 'vitest';
import { MECHANICS } from '../../config/mechanics';
import { ScriptedFlickProvider } from '../flickProvider';
import { OnboardingDirector, DEMO_DONE_KEY, isDemoDone } from '../onboarding';
import { memoryStorage } from '../runLifecycle';
import type { KvStorage } from '../runLifecycle';

function makeDirector(storage?: KvStorage): OnboardingDirector {
  return new OnboardingDirector(new ScriptedFlickProvider(MECHANICS), storage ?? memoryStorage());
}

describe('OnboardingDirector — beats B0–B4 (logic thời gian thuần, scene chỉ diễn)', () => {
  it('B0 0–1.5s: title "SKIP KING / FLICK TO SKIP" — không cú nào, không highlight sweet zone', () => {
    const d = makeDirector();
    expect(d.update(0).beat).toBe('B0');
    const u = d.update(0.8);
    expect(u.beat).toBe('B0');
    expect(u.banner).toBe('SKIP KING / FLICK TO SKIP');
    expect(u.flick).toBeNull();
    expect(u.sweetZone).toBe(false);
    expect(d.update(1.4).flick).toBeNull();
  });

  it('B1: cú demo ĐẦU tới đúng lúc 2.0s — plop đầu (nảy đầu B1) chạm trong ≤3.0s session', () => {
    const d = makeDirector();
    expect(d.update(1.5).beat).toBe('B1');
    expect(d.update(1.9).flick).toBeNull();
    const u = d.update(2.0);
    expect(u.beat).toBe('B1');
    expect(u.flick).not.toBeNull();
    // Timing ĐO ĐƯỢC: pick B1 của tầng A có firstBounceTime — session 2.0s + t_nảy_đầu ≤ 3.0s
    const p = new ScriptedFlickProvider(MECHANICS);
    const det = p.detailForBeat('B1');
    expect(det.firstBounceTime).not.toBeNull();
    expect(2.0 + (det.firstBounceTime as number)).toBeLessThanOrEqual(3.0 + 1e-9);
  });

  it('B1: highlight sweet zone BẬT trong demo (U2 — CHỈ trong demo)', () => {
    const d = makeDirector();
    d.update(1.5);
    d.update(2.0);
    expect(d.update(2.6).sweetZone).toBe(true);
  });

  it('B2 4–8s: 2 auto-flick tại 4.0/6.0 — cú 2-nảy-chìm, hụt bình thường KHÔNG game-over', () => {
    const d = makeDirector();
    d.update(2.0); // tiêu thụ cú B1
    expect(d.update(3.9).flick).toBeNull();
    const p = new ScriptedFlickProvider(MECHANICS);
    const b2 = p.flickForBeat('B2');
    const u1 = d.update(4.0);
    expect(u1.beat).toBe('B2');
    expect(u1.flick).toEqual(b2);
    expect(d.update(5.9).flick).toBeNull();
    expect(d.update(6.0).flick).toEqual(b2);
    // pick B2 của tầng A: đúng 2 nảy rồi chìm (splash) — hụt thật, không phải perfect
    expect(p.detailForBeat('B2').bounces).toBe(2);
    expect(p.detailForBeat('B2').terminal).toBe('splash');
    expect(p.detailForBeat('B2').judgedPerfect).toBe(false);
  });

  it('B3 8–11s: auto-flick PERFECT tại 8.0 + banner 2 dòng "PERFECT FLICK!"/"×2" + slow-mo + sweetZone', () => {
    const d = makeDirector();
    d.update(2.0);
    d.update(4.0);
    d.update(6.0);
    const p = new ScriptedFlickProvider(MECHANICS);
    const u = d.update(8.0);
    expect(u.beat).toBe('B3');
    expect(u.flick).toEqual(p.flickForBeat('B3'));
    expect(u.sweetZone).toBe(true);
    expect(u.slowmo).toBe(true);
    // banner 2 dòng do SCENE DIỄN khi engine phát 'perfect' (đường judge tầng A) — beat chỉ slow-mo
    expect(u.banner).toBeNull();
    expect(MECHANICS.comboBanner.line1 + '\n' + MECHANICS.comboBanner.line2).toBe('PERFECT FLICK!\n×2');
    // pick B3 đạt PERFECT + ≥ perfectMinBounces nảy (tầng A chọn từ sim)
    expect(p.detailForBeat('B3').judgedPerfect).toBe(true);
    expect(p.detailForBeat('B3').bounces).toBeGreaterThanOrEqual(MECHANICS.perfectMinBounces);
  });

  it('B4 11–12s: banner "YOUR TURN"; quá 12s done — tổng demo đúng trần 12s', () => {
    const st = memoryStorage();
    const d = makeDirector(st);
    d.update(2.0);
    d.update(4.0);
    d.update(6.0);
    d.update(8.0);
    expect(d.update(8.0).beat).toBe('B3'); // B3 kéo dài tới 11.0s (CONTRACT bảng beat)
    expect(d.update(11.5).banner).toBe('YOUR TURN'); // B4 = 11–12s
    expect(d.update(12.0).done).toBe(true);
  });

  it('cú demo NGUYÊN BẢN từ provider — KHÔNG qua assist Đ2 (CONTRACT: không đụng cú demo)', () => {
    const d = makeDirector();
    const p = new ScriptedFlickProvider(MECHANICS);
    const u = d.update(2.0);
    expect(u.flick).toEqual(p.flickForBeat('B1'));
  });

  it('demo CHỈ lần đầu session — done ghi sk_done vào storage inject; lần sau thẳng chơi', () => {
    expect(DEMO_DONE_KEY).toBe('sk_done');
    const st = memoryStorage();
    const d = makeDirector(st);
    d.update(2.0);
    d.update(4.0);
    d.update(6.0);
    d.update(8.0);
    d.update(12.0);
    expect(st.getItem(DEMO_DONE_KEY)).toBe('1');
    expect(isDemoDone(st)).toBe(true);
    const d2 = makeDirector(st);
    expect(d2.update(0).done).toBe(true); // lần 2 — không demo nữa
    expect(d2.update(5).flick).toBeNull();
  });

  it('skip-on-touch: skip() cắt NGAY — done true + storage ghi + state sạch (không flick nữa)', () => {
    const st = memoryStorage();
    const d = makeDirector(st);
    d.update(2.5);
    d.skip();
    const u = d.update(3.0);
    expect(u.done).toBe(true);
    expect(u.flick).toBeNull();
    expect(st.getItem(DEMO_DONE_KEY)).toBe('1');
  });
});
