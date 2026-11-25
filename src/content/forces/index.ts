import type { ForceId } from '../../shared/types';
import { explosion } from './explosion';
import { gravity, reverseGravity } from './gravity';
import { zeroGravity } from './zero';
import type { Force } from './types';

export const forceImplementations: Record<ForceId, Force> = {
  gravity,
  reverse: reverseGravity,
  explosion,
  zero: zeroGravity,
};
