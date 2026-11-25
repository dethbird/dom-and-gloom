import { commands } from '../shared/types';
import type { PageCommand } from '../shared/types';
import { AnimationSession } from './session';

// The isolated world persists across injections into the same document.
const scope = globalThis as typeof globalThis & { domAndGloomInstalled?: boolean };

if (!scope.domAndGloomInstalled) {
  scope.domAndGloomInstalled = true;
  const session = new AnimationSession();

  chrome.runtime.onMessage.addListener((message: PageCommand, sender, reply) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === commands.restore) session.restore();
    if (message.type === commands.activate && message.preferences.enabled) session.activate(message.preferences);
    reply();
  });

  window.addEventListener('pagehide', () => session.restore());
}
