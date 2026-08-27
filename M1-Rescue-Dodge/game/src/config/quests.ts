// M1 Rescue Dodge — Quests Config
// Initial quests and rewards for meta progression.

import type { Quest } from '../logic/types';

export const INITIAL_QUESTS: Quest[] = [
  { id: 'dodge_30', title: 'Dodge 30 Bees', desc: 'Successfully dodge 30 incoming bees', target: 30, rewardFish: 15, progress: 0, claimed: false },
  { id: 'collect_8_fish', title: 'Goldfish Hunter', desc: 'Collect 8 golden fish across runs', target: 8, rewardFish: 20, progress: 0, claimed: false },
  { id: 'survive_swarm', title: 'Survive Swarm ⚠️', desc: 'Survive 1 dangerous bee swarm raid', target: 1, rewardFish: 25, progress: 0, claimed: false },
  { id: 'score_100', title: 'Dodge Master', desc: 'Reach a record score of 100 points', target: 100, rewardFish: 40, progress: 0, claimed: false },
];
