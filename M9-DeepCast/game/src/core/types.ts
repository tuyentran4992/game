// GameState types — pure data, no Phaser. See DATA-MODEL §5.
export type HookMode = 'idle' | 'descend' | 'reel' | 'hold';
export type GamePhase = 'title' | 'dive' | 'win' | 'lose';
export type LoseReason = 'OUT OF FUEL' | 'LINES BROKEN';
export type Rank = 'S' | 'A' | 'B';

export interface FishInstance {
  uid: number;
  defId: string; // 'f1'..'f10' | 'whale'
  x: number;
  y: number; // px
  vx: number; // px/s (sign = facing)
  phase: number; // pulse phase offset (s), deterministic from seed
  alive: boolean;
}

export interface PickupInstance {
  uid: number;
  defId: 'up-double' | 'up-sonar' | 'chest150';
  x: number;
  y: number;
  taken: boolean;
}

export type EventType =
  | 'dive-start'
  | 'attach'
  | 'break'
  | 'airout-drop'
  | 'surface'
  | 'pickup'
  | 'shark-hit'
  | 'whale-hook'
  | 'whale-escape'
  | 'win'
  | 'lose'
  | 'hint-control'
  | 'hint-tension'
  | 'hint-air';

export interface GameEvent {
  type: EventType;
  value?: number;
  text?: string;
}

export interface GameState {
  seed: number;
  rngState: number;

  phase: GamePhase;
  money: number;
  hearts: number;
  breaks: number;
  combo: number; // consecutive surface sells without break/escape
  usedContinue: boolean;
  loseReason: LoseReason | null;
  rank: Rank | null;
  sessionTime: number;
  deepestM: number;

  diveCount: number;
  diveTime: number; // s, current dive
  diveStartCooldown: number; // s remaining before descent begins

  hookX: number;
  hookY: number;
  hookMode: HookMode;
  tapBuffer: number; // s remaining of release grace
  holdTime: number; // s held during 'hold' mode

  air: number;
  tension: number;
  strain: number; // accumulated reel strain (pulling a taut line)

  hooked: number[]; // fish uids on the line
  attachLock: number; // s remaining (heavy fish cannot tear off / attach window)

  doubleHook: boolean;
  sonarCharges: number;
  sonarTimer: number; // s of active scan reveal

  fish: FishInstance[];
  pickups: PickupInstance[];
  nextUid: number;

  sharkX: number;
  sharkY: number;
  sharkDir: number; // +1 right, -1 left

  hintControl: boolean; // onboarding hint 1 shown
  hintTension: boolean; // hint 2 shown
  hintAir: boolean; // hint 3 shown
  struggleCd: number; // s cooldown so whale struggles count per gesture, not per frame

  whaleUid: number | null;
  whaleSpawnTimer: number; // s until next spawn attempt (8s cadence)
  whaleHooked: boolean;
  whaleTossTimer: number; // s since hooked (limit 20s)
  whaleStruggles: number; // reel-while-thrashing count (3 -> escape)

  events: GameEvent[];
}
