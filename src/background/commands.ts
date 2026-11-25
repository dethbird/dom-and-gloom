import { readPreferences } from '../shared/storage';
import { commands } from '../shared/types';
import type { PageCommand } from '../shared/types';

const queues = new Map<number, Promise<void>>();

export async function handleCommand(command: string, commandTabId?: number) {
  if (command !== commands.activate && command !== commands.restore) return;
  const tabId = commandTabId ?? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id;
  if (tabId === undefined) return;

  const previous = queues.get(tabId) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(() => dispatch(tabId, command));
  queues.set(tabId, current);
  try {
    await current;
  } finally {
    if (queues.get(tabId) === current) queues.delete(tabId);
  }
}

async function dispatch(tabId: number, command: PageCommand['type']) {
  if (command === commands.restore) {
    await sendToExistingScript(tabId, { type: command });
    return;
  }

  const preferences = await readPreferences();
  if (!preferences.enabled) return;
  const message: PageCommand = { type: command, preferences };
  if (await sendToExistingScript(tabId, message)) return;

  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  if (!injection) return;
  await chrome.tabs.sendMessage(tabId, message, { documentId: injection.documentId });
}

async function sendToExistingScript(tabId: number, message: PageCommand) {
  try {
    await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Receiving end does not exist')) return false;
    throw error;
  }
}
