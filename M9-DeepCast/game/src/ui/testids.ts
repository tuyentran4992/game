// DOM testid bridge for QA browser (DESIGN-SPEC §6): hidden spans updated from the scene.
const IDS = [
  'hud-air', 'hud-tension', 'hud-money', 'hud-depth', 'hud-hearts', 'btn-sonar', 'screen-title',
  'popup-result', 'screen-win', 'screen-lose', 'btn-retry', 'rank-badge', 'debug-seed',
] as const;

let container: HTMLDivElement | null = null;
const spans = new Map<string, HTMLSpanElement>();
const lastValues = new Map<string, string>();

const ensureContainer = (): HTMLDivElement => {
  if (!container) {
    container = document.createElement('div');
    container.id = 'qa-testids';
    container.style.display = 'none';
    document.body.appendChild(container);
    for (const id of IDS) {
      const span = document.createElement('span');
      span.dataset.testid = id;
      span.textContent = '0';
      container.appendChild(span);
      spans.set(id, span);
    }
  }
  return container;
};

export const publishTestIds = (values: Record<string, string>): void => {
  if (typeof document === 'undefined') return;
  ensureContainer();
  for (const [key, val] of Object.entries(values)) {
    const span = spans.get(key);
    if (span && lastValues.get(key) !== val) {
      span.textContent = val;
      lastValues.set(key, val);
    }
  }
};
