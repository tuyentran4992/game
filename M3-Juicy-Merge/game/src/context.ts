// Context chia sẻ — chứa engine logic thuần (tách testable) + SDK
import { sdk } from './sdk-instance';
import { MergeEngine } from './logic/merge-engine';

// placeholder engine — logic thật do Claude code theo SPEC (bước tiếp)
export const ctx = {
  engine: new MergeEngine(),
  sdk,
};