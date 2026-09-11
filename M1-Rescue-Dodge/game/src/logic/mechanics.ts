// Mechanic config — re-exports from src/config and src/logic/types.
// Keeps backward compatibility for existing imports across scenes and tests.

export { type Palette, type BeeType, type MechanicsConfig, type DebutType, type DebutWindow } from './types';
export { MECHANICS } from '../config/mechanics';
