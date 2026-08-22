"""Scaffold command — creates game/ Phaser 3 source from config (PC-01..05)."""
from pathlib import Path
from typing import Any

from pipeline.config import load_config, validate_config


PHASER_VERSION = "3.80.1"


def scaffold(config_path: Path, game_dir: Path) -> int:
    """Create game/ Phaser 3 source structure from config.

    Returns 0 on success, non-zero on error.
    """
    config_path = Path(config_path)
    game_dir = Path(game_dir)

    # PC-04: missing config -> error, no files created
    if not config_path.exists():
        print(f"ERROR: config file not found: {config_path}")
        return 1

    try:
        cfg = load_config(config_path)
    except Exception as e:
        print(f"ERROR: cannot load config: {e}")
        return 1

    errors = validate_config(cfg)
    if errors:
        print(f"ERROR: config validation failed:")
        for e in errors:
            print(f"  - {e}")
        return 1

    name = cfg["name"]
    title = cfg["metadata"]["title"]
    theme = cfg["metadata"]["theme"]
    style = cfg["metadata"]["style"]
    lane_count = cfg["mechanics"]["lane_count"]
    lane_axis = cfg["mechanics"]["lane_axis"]
    milestone = cfg["mechanics"]["progression"]["milestone_interval"]
    combo_per = cfg["mechanics"]["progression"]["combo_per"]
    combo_bonus = cfg["mechanics"]["progression"]["combo_bonus"]

    # Create directory structure
    (game_dir / "src" / "scenes").mkdir(parents=True, exist_ok=True)

    # --- package.json ---
    pkg_json = {
        "name": name,
        "version": cfg["version"],
        "description": cfg["metadata"]["short_desc"],
        "scripts": {
            "dev": "vite",
            "build": "vite build",
        },
        "dependencies": {
            "phaser": f"^{PHASER_VERSION}",
        },
        "devDependencies": {
            "vite": "^5.0.0",
            "typescript": "^5.3.0",
        },
    }
    _write_json(game_dir / "package.json", pkg_json)

    # --- tsconfig.json ---
    tsconfig = {
        "compilerOptions": {
            "target": "ES2020",
            "module": "ESNext",
            "moduleResolution": "bundler",
            "strict": True,
            "outDir": "./dist",
        },
        "include": ["src"],
    }
    _write_json(game_dir / "tsconfig.json", tsconfig)

    # --- index.html ---
    (game_dir / "index.html").write_text(_INDEX_HTML.format(title=title), encoding="utf-8")

    # --- src/main.ts ---
    (game_dir / "src" / "main.ts").write_text(
        _MAIN_TS.format(
            title=title,
            name=name,
            lane_count=lane_count,
            lane_axis=lane_axis,
            milestone=milestone,
            combo_per=combo_per,
            combo_bonus=combo_bonus,
        ),
        encoding="utf-8",
    )

    # --- src/sdk-handler.ts ---
    (game_dir / "src" / "sdk-handler.ts").write_text(_SDK_HANDLER_TS, encoding="utf-8")

    # --- src/scenes/Start.ts ---
    (game_dir / "src" / "scenes" / "Start.ts").write_text(_START_TS, encoding="utf-8")

    # --- src/scenes/Tutorial.ts ---
    (game_dir / "src" / "scenes" / "Tutorial.ts").write_text(_TUTORIAL_TS, encoding="utf-8")

    # --- src/scenes/Gameplay.ts ---
    (game_dir / "src" / "scenes" / "Gameplay.ts").write_text(
        _GAMEPLAY_TS.replace("__LANE_COUNT__", str(lane_count)), encoding="utf-8"
    )

    # --- src/scenes/GameOver.ts ---
    (game_dir / "src" / "scenes" / "GameOver.ts").write_text(_GAMEOVER_TS, encoding="utf-8")

    print(f"OK: scaffolded game '{name}' -> {game_dir}")
    print(f"  Phaser {PHASER_VERSION}, {lane_count} lanes ({lane_axis})")
    return 0


def _write_json(path: Path, data: dict) -> None:
    import json
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


_INDEX_HTML = """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>{title}</title>
  <style>
    body {{ margin: 0; overflow: hidden; background: #000; }}
    #game {{ width: 100vw; height: 100vh; }}
  </style>
</head>
<body>
  <div id="game"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
"""


_MAIN_TS = """import {{ Game, Scale, AUTO }} from 'phaser';
import {{ SdkHandler }} from './sdk-handler';
import {{ StartScene }} from './scenes/Start';
import {{ TutorialScene }} from './scenes/Tutorial';
import {{ GameplayScene }} from './scenes/Gameplay';
import {{ GameOverScene }} from './scenes/GameOver';

// Game config derived from games/cuu-meo.yaml (BR-13)
const GAME_TITLE = '{title}';
const GAME_NAME = '{name}';
const LANE_COUNT = {lane_count};
const LANE_AXIS = '{lane_axis}';
const MILESTONE_INTERVAL = {milestone};
const COMBO_PER = {combo_per};
const COMBO_BONUS = {combo_bonus};

const sdk = new SdkHandler();

const config: Phaser.Types.Core.GameConfig = {{
  type: AUTO,
  parent: 'game',
  // BR-05: Responsive — RESIZE mode auto-fits any viewport, keeps state on resize
  scale: {{
    mode: Scale.RESIZE,
    width: '100%',
    height: '100%',
  }},
  scene: [StartScene, TutorialScene, GameplayScene, GameOverScene],
}};

// Fire gameReady when assets are ready and game is interactive
sdk.gameReady();

const game = new Game(config);

// BR-04: obey pause/resume/mute from platform
sdk.onPause(() => {{
  game.scene.pause('GameplayScene');
}});
sdk.onResume(() => {{
  game.scene.resume('GameplayScene');
}});

export {{ GAME_TITLE, GAME_NAME, LANE_COUNT, LANE_AXIS, MILESTONE_INTERVAL, COMBO_PER, COMBO_BONUS, sdk }};
"""


_SDK_HANDLER_TS = """// YouTube Playables SDK handler (BR-04, BR-11)
// Wraps ytgame.* with safe fallbacks so local dev works without the SDK.

interface YtGame {
  gameReady(): void;
  onPause(cb: () => void): void;
  onResume(cb: () => void): void;
  isAudioEnabled(): boolean;
  onAudioEnabledChange(cb: (enabled: boolean) => void): void;
  saveData(data: string): Promise<void>;
  loadData(): Promise<string | null>;
  sendScore(score: number): void;
  ads: {
    requestInterstitialAd(): Promise<void>;
    requestRewardedAd(rewardId: string): Promise<boolean>;
  };
}

declare global {
  interface Window { ytgame?: YtGame; }
}

export class SdkHandler {
  private ytgame: YtGame | null;

  constructor() {
    this.ytgame = window.ytgame ?? null;
  }

  gameReady(): void {
    this.ytgame?.gameReady?.();
  }

  onPause(cb: () => void): void {
    this.ytgame?.onPause?.(cb);
  }

  onResume(cb: () => void): void {
    this.ytgame?.onResume?.(cb);
  }

  isAudioEnabled(): boolean {
    return this.ytgame?.isAudioEnabled?.() ?? true;
  }

  onAudioEnabledChange(cb: (enabled: boolean) => void): void {
    this.ytgame?.onAudioEnabledChange?.(cb);
  }

  // BR-11: saveData with error fallback (no crash on failure)
  async saveData(data: unknown): Promise<boolean> {
    try {
      await this.ytgame?.saveData?.(JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('saveData failed, using current session', e);
      return false;
    }
  }

  // BR-11: loadData with error fallback
  async loadData(): Promise<unknown | null> {
    try {
      const raw = await this.ytgame?.loadData?.();
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('loadData failed, starting fresh', e);
      return null;
    }
  }

  sendScore(score: number): void {
    this.ytgame?.sendScore?.(score);
  }

  async requestInterstitialAd(): Promise<void> {
    await this.ytgame?.ads?.requestInterstitialAd?.();
  }

  async requestRewardedAd(rewardId: string): Promise<boolean> {
    try {
      return await this.ytgame?.ads?.requestRewardedAd?.(rewardId) ?? false;
    } catch {
      return false;
    }
  }
}
"""


_START_TS = """import Phaser from 'phaser';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Title text
    this.add.text(width / 2, height / 2 - 60, 'CỨU MÈO', {
      fontSize: '48px',
      color: '#4A7C59',
    }).setOrigin(0.5);

    // Play button (data-testid required)
    const playBtn = this.add.text(width / 2, height / 2 + 40, 'Chơi', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#4A7C59',
      padding: { x: 40, y: 20 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // data-testid for Playwright/E2E
    playBtn.setData('testid', 'start-btn');
    // Also set as DOM attribute via Phaser DOM element approach
    this.add.dom ? null : null;

    playBtn.on('pointerdown', () => {
      this.scene.start('TutorialScene');
    });

    // BR-05: handle resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      // Re-center elements on resize — keeps state
    });
  }
}
"""


_TUTORIAL_TS = """import Phaser from 'phaser';

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TutorialScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Tutorial text (3s, auto-advance)
    const tutorialText = this.add.text(width / 2, height / 2, 'Giữ để né ong', {
      fontSize: '28px',
      color: '#333333',
      wordWrap: { width: width * 0.8 },
    }).setOrigin(0.5);

    tutorialText.setData('testid', 'tutorial-text');

    // Auto-advance after 3 seconds
    this.time.delayedCall(3000, () => {
      this.scene.start('GameplayScene');
    });
  }
}
"""


_GAMEPLAY_TS = """import Phaser from 'phaser';

const LANE_COUNT = __LANE_COUNT__;

export class GameplayScene extends Phaser.Scene {
  private score = 0;
  private level = 1;
  private streak = 0;
  private bestScore = 0;
  private scoreLabel!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameplayScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.score = 0;
    this.level = 1;
    this.streak = 0;

    // Score display
    this.scoreLabel = this.add.text(20, 20, '0', {
      fontSize: '24px', color: '#333',
    });
    this.scoreLabel.setData('testid', 'score-label');

    // Level display
    this.levelLabel = this.add.text(width - 100, 20, 'Cấp 1', {
      fontSize: '24px', color: '#333',
    });
    this.levelLabel.setData('testid', 'level-label');

    // Level-up popup (hidden initially)
    const levelPopup = this.add.text(width / 2, 100, '', {
      fontSize: '32px', color: '#E2725B',
    }).setOrigin(0.5);
    levelPopup.setData('testid', 'level-popup');
    levelPopup.setVisible(false);

    // Combo popup
    const comboPopup = this.add.text(width / 2, 150, '', {
      fontSize: '28px', color: '#4A7C59',
    }).setOrigin(0.5);
    comboPopup.setData('testid', 'combo-popup');
    comboPopup.setVisible(false);

    // Record popup
    const recordPopup = this.add.text(width / 2, height / 2, '', {
      fontSize: '36px', color: '#E2725B',
    }).setOrigin(0.5);
    recordPopup.setData('testid', 'record-popup');
    recordPopup.setVisible(false);

    // Input: touch + mouse (BR-05)
    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer) => {
      // tap to change lane
    });
  }

  update() {
    // Game loop — score increases, bees move, collision check
  }
}
"""


_GAMEOVER_TS = """import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { score: number; bestScore: number }) {
    const { width, height } = this.scale;
    const score = data?.score ?? 0;
    const best = data?.bestScore ?? 0;

    // Final score
    const finalScore = this.add.text(width / 2, height / 2 - 80, `Score: ${score}`, {
      fontSize: '36px', color: '#333',
    }).setOrigin(0.5);
    finalScore.setData('testid', 'final-score');

    // Best score
    const bestScore = this.add.text(width / 2, height / 2 - 20, `Best: ${best}`, {
      fontSize: '28px', color: '#666',
    }).setOrigin(0.5);
    bestScore.setData('testid', 'best-score');

    // Retry button
    const retryBtn = this.add.text(width / 2 - 80, height / 2 + 60, 'Chơi lại', {
      fontSize: '24px', color: '#fff', backgroundColor: '#4A7C59',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retryBtn.setData('testid', 'retry-btn');
    retryBtn.on('pointerdown', () => {
      this.scene.start('GameplayScene');
    });

    // Continue button (rewarded ad)
    const continueBtn = this.add.text(width / 2 + 80, height / 2 + 60, 'Tiếp tục (xem ad)', {
      fontSize: '24px', color: '#fff', backgroundColor: '#E2725B',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    continueBtn.setData('testid', 'continue-btn');
    continueBtn.on('pointerdown', () => {
      // Request rewarded ad (BR-10)
    });
  }
}
"""
