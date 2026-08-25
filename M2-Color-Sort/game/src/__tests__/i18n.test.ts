// Unit test i18n (M2 Phase 5, AUDIT §B6 / SPEC §5): pickLang + t() + tr() +
// tính nhất quán VI/EN (hai bộ copy CÙNG key).
import { describe, it, expect } from 'vitest';
import { COPY, pickLang, t, tr, fmt } from '../i18n';

describe('i18n — chọn ngôn ngữ (pickLang)', () => {
  it('map mã hợp lệ → vi/en; region bỏ qua', () => {
    expect(pickLang('vi')).toBe('vi');
    expect(pickLang('vi-VN')).toBe('vi');
    expect(pickLang('VI')).toBe('vi');
    expect(pickLang('en')).toBe('en');
    expect(pickLang('en-US')).toBe('en');
  });

  it('mã lạ / rỗng → fallback en', () => {
    expect(pickLang('fr')).toBe('en');
    expect(pickLang('zh-hans')).toBe('en');
    expect(pickLang('')).toBe('en');
    expect(pickLang(undefined)).toBe('en');
    expect(pickLang(null)).toBe('en');
  });
});

describe('i18n — t()/tr()/fmt()', () => {
  it('trả đúng chuỗi theo ngôn ngữ', () => {
    expect(t('play', 'vi')).toBe('CHƠI');
    expect(t('play', 'en')).toBe('PLAY');
    expect(t('next_level', 'vi')).toBe('CẤP TIẾP');
    expect(t('next_level', 'en')).toBe('NEXT LEVEL');
  });

  it('key thiếu → fallback EN → key gốc (không crash, không invent)', () => {
    expect(t('missing_key_xyz', 'vi')).toBe('missing_key_xyz');
    expect(t('missing_key_xyz', 'en')).toBe('missing_key_xyz');
  });

  it('placeholder {0},{1} điền đúng (tr)', () => {
    expect(tr('start_level', 'vi', 3)).toBe('Bắt đầu cấp 3');
    expect(tr('start_level', 'en', 3)).toBe('Start Level 3');
    expect(tr('clear_title', 'vi', 7)).toBe('HOÀN THÀNH CẤP 7');
    expect(tr('best', 'en', 12, 8)).toBe('Best: 12   Optimal: 8');
  });

  it('fmt thay thế mọi placeholder', () => {
    expect(fmt('Nước: {0}', 5)).toBe('Nước: 5');
  });
});

describe('i18n — VI/EN copy nhất quán (SPEC §5)', () => {
  it('hai bộ copy có ĐÚNG cùng tập key', () => {
    const enKeys = Object.keys(COPY.en).sort();
    const viKeys = Object.keys(COPY.vi).sort();
    expect(viKeys).toEqual(enKeys);
  });

  it('bộ copy có các mục SPEC §5: Chơi/Play, Level tiếp/Next, Quay lại/Undo…', () => {
    expect(COPY.en.next_level).toBe('NEXT LEVEL');
    expect(COPY.vi.next_level).toBe('CẤP TIẾP');
    // cụm "Chơi" / "Play"
    expect(COPY.vi.play).toBe('CHƠI');
    expect(COPY.en.play).toBe('PLAY');
  });
});
