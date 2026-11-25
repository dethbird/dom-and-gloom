export const forces = {
  gravity: 'Gravity',
  reverse: 'Reverse Gravity',
  explosion: 'Explosion',
  zero: 'Zero Gravity',
} as const;

export type ForceId = keyof typeof forces;

export interface Preferences {
  enabled: boolean;
  force: ForceId;
  intensity: number;
  stagger: number;
}

export const commands = { activate: 'activate-force', restore: 'restore-page' } as const;

export type PageCommand =
  | { type: typeof commands.activate; preferences: Preferences }
  | { type: typeof commands.restore };
