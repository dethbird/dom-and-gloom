import { forces } from './types';
import type { Preferences } from './types';

export const defaults: Preferences = { enabled: true, force: 'gravity', intensity: 65, stagger: 35 };

function percent(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(0, Math.min(100, value)))
    : fallback;
}

export async function readPreferences(): Promise<Preferences> {
  const { enabled, force, intensity, stagger } = await chrome.storage.local.get({ ...defaults });
  return {
    enabled: typeof enabled === 'boolean' ? enabled : defaults.enabled,
    force: typeof force === 'string' && Object.hasOwn(forces, force) ? force as Preferences['force'] : defaults.force,
    intensity: percent(intensity, defaults.intensity),
    stagger: percent(stagger, defaults.stagger),
  };
}

export function savePreferences(patch: Partial<Preferences>) {
  return chrome.storage.local.set(patch);
}
