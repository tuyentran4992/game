// UT Stage Clear Wiring — xác minh wiring StageClearModal, testid và chuyển stage (TDD-B).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('Stage Clear Wiring — Static Contract & Testids', () => {
  it('Gameplay.ts có wiring StageClearModal và xử lý stageClear', () => {
    const src = readFileSync('src/scenes/Gameplay.ts', 'utf8');
    expect(src).toContain("import { StageClearModal } from '../ui/StageClearModal'");
    expect(src).toContain('onStageClear');
    expect(src).toContain('handleNextStage');
    expect(src).toContain('advanceToNextStage()');
  });

  it('StageClearModal.ts có đủ các data-testid chuẩn studio', () => {
    const src = readFileSync('src/ui/StageClearModal.ts', 'utf8');
    expect(src).toContain("'stage-clear-modal'");
    expect(src).toContain("'next-stage-btn'");
    expect(src).toContain("'stage-stars'");
  });

  it('GameOver.ts hiển thị thông tin STAGE khi kết thúc màn', () => {
    const src = readFileSync('src/scenes/GameOver.ts', 'utf8');
    expect(src).toContain('STAGE');
    expect(src).toContain('retryCurrentStage');
    expect(src).toContain('retryStage: true');
  });

  it('HudRenderer.ts hiển thị Stage trên levelLabel', () => {
    const src = readFileSync('src/scenes/render/HudRenderer.ts', 'utf8');
    expect(src).toContain("'Stage '");
    expect(src).toContain('setStage');
  });

  it('context.ts lưu và tải bestStage', () => {
    const src = readFileSync('src/context.ts', 'utf8');
    expect(src).toContain('bestStage');
    expect(src).toContain('best_stage');
  });

  it('Gameplay.ts sử dụng getProgressionLevel và ngăn chặn race condition Ong Chúa', () => {
    const src = readFileSync('src/scenes/Gameplay.ts', 'utf8');
    expect(src).toContain('ctx.engine.getProgressionLevel()');
    expect(src).toContain('fatBeePending');
    expect(src).toMatch(/if\s*\(\s*this\.fatBeeActive\s*\|\|\s*this\.fatBeePending/);
    expect(src).toContain('this.spawnDirector?.startSession(this.elapsed)');
  });

  it('GameEngine và StageClearModal hỗ trợ Victory và Coming Soon khi hoàn thành Stage 3', () => {
    const srcModal = readFileSync('src/ui/StageClearModal.ts', 'utf8');
    expect(srcModal).toContain('VICTORY');
    expect(srcModal).toContain('COMING SOON');
    expect(srcModal).toContain('PLAY AGAIN');

    const srcGameplay = readFileSync('src/scenes/Gameplay.ts', 'utf8');
    expect(srcGameplay).toContain('handlePlayAgainAfterVictory');
    expect(srcGameplay).toContain('handleMenuAfterVictory');
  });

  it('Gameplay.ts duy trì tốc độ bay liên tục và sử dụng stageLevel để mật độ ong chuyển từ DỄ -> KHÓ ở mỗi Stage', () => {
    const src = readFileSync('src/scenes/Gameplay.ts', 'utf8');
    expect(src).toContain('this.spawnDirector?.startSession(this.elapsed)');
    expect(src).toContain('stageLevelClamped = Math.min(9, Math.max(1, ctx.engine.stageLevel ?? 1))');
  });
});

