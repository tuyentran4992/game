// [UPG2-N1] t_79d2b77d — newbiesim dọn literal: công thức cadence + speedMult phải ĐỌC
// MechanicsConfig (SCOPE+ round 2 lead — newbieBotSim.ts:194), không hardcode 1.35/0.38/...
// Sim dùng NHANH determinism hiện có (rng injectable) — test này khoá nguồn số, không đổi policy bot.
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { MECHANICS } from '../../config/mechanics';

const SRC = readFileSync('src/logic/__tests__/newbieBotSim.ts', 'utf8');

describe('UPG2-N1 — newbieBotSim đọc cadence/speedMult từ MechanicsConfig', () => {
  it('sim KHÔNG còn literal công thức spawn (1.35/0.38/0.0035/0.10) — đọc cfg.*', () => {
    expect(SRC).not.toMatch(/Math\.max\(\s*0\.38/);
    expect(SRC).not.toMatch(/1\.35\s*-\s*\(speed/);
    expect(SRC).toMatch(/cfg\.spawnIntervalBase/);
    expect(SRC).toMatch(/cfg\.spawnIntervalFloor/);
  });

  it('sim KHÔNG hardcode lại speedMult 1.18/1.0 — đọc qua config', () => {
    expect(SRC).not.toMatch(/===\s*'speedy'\s*\?\s*1\.18/);
    expect(SRC).toMatch(/speedyMult/);
  });

  it('MOVE_MS của sim khớp công thức config (laneMoveMs + laneMoveDelayMs) — physics 1:1 scene', () => {
    expect(SRC).toContain('cfg.laneMoveMs + cfg.laneMoveDelayMs');
    expect(MECHANICS.laneMoveMs + MECHANICS.laneMoveDelayMs).toBe(155);
  });
});
