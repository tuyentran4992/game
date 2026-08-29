import { requestExpandedMode } from '@devvit/web/client';

document.addEventListener('DOMContentLoaded', () => {
  const playBtn = document.getElementById('play-btn');

  if (playBtn) {
    playBtn.addEventListener('click', (event: MouseEvent) => {
      try {
        // Request Reddit to expand to full screen and load the 'game' entrypoint (index.html)
        requestExpandedMode(event, 'game');
      } catch (err) {
        console.warn('[Juicy Merge Preview] requestExpandedMode fallback:', err);
        // Fallback for standalone/local testing outside Reddit iframe
        window.location.href = 'index.html';
      }
    });
  }
});
