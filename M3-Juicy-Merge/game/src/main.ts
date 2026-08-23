// M3 Juicy Merge — main / boot
import Phaser from 'phaser';
import { sdk } from './sdk-instance';
import { StartScene } from './scenes/Start';
import { GameplayScene } from './scenes/Gameplay';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#FFF8E7',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  scene: [StartScene, GameplayScene],
};

new Phaser.Game(config);

// Playables SDK: pause/resume + mute
sdk.onPause(() => { /* scene xử lý */ });
sdk.onResume(() => {});
sdk.onAudioEnabledChange((_enabled: boolean) => {});
// sẵn sàng tương tác
sdk.gameReady();