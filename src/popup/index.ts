import './style.css';
import { readPreferences, savePreferences } from '../shared/storage';
import { commands, forces } from '../shared/types';
import type { ForceId, Preferences } from '../shared/types';

const preferences = document.querySelector<HTMLFieldSetElement>('#preferences')!;
const enabled = document.querySelector<HTMLInputElement>('#enabled')!;
const enabledState = document.querySelector('#enabled-state')!;
const force = document.querySelector<HTMLSelectElement>('#force')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const ranges = (['intensity', 'stagger'] as const).map((key) => ({
  key,
  input: document.querySelector<HTMLInputElement>(`#${key}`)!,
  output: document.querySelector<HTMLOutputElement>(`#${key}-value`)!,
}));

function report(message: string) {
  status.textContent = message;
  status.hidden = !message;
}

function save(patch: Partial<Preferences>) {
  report('');
  void savePreferences(patch).catch(() => report('Couldn’t save settings.'));
}

function renderSwitch() {
  enabledState.textContent = enabled.checked ? 'On' : 'Off';
  enabledState.classList.toggle('off', !enabled.checked);
}

function renderRange(input: HTMLInputElement, output: HTMLOutputElement) {
  output.value = `${input.value}%`;
  input.style.setProperty('--fill', output.value);
}

async function renderPreferences() {
  const config = await readPreferences();
  for (const [id, label] of Object.entries(forces)) force.add(new Option(label, id));
  force.value = config.force;
  enabled.checked = config.enabled;
  renderSwitch();
  enabled.addEventListener('change', () => {
    renderSwitch();
    save({ enabled: enabled.checked });
  });
  force.addEventListener('change', () => save({ force: force.value as ForceId }));

  for (const { key, input, output } of ranges) {
    input.value = String(config[key]);
    renderRange(input, output);
    input.addEventListener('input', () => renderRange(input, output));
    input.addEventListener('change', () => save({ [key]: input.valueAsNumber }));
  }
  preferences.disabled = false;
}

function renderShortcut(id: string, shortcut?: string) {
  const destination = document.getElementById(id)!;
  destination.replaceChildren();
  if (!shortcut) {
    destination.textContent = 'Unassigned';
    return;
  }

  const parts = shortcut.includes('+') ? shortcut.split('+') : [shortcut];
  for (const part of parts) {
    const key = document.createElement('kbd');
    key.textContent = part;
    destination.append(key);
  }
}

async function renderShortcuts() {
  const assigned = await chrome.commands.getAll();
  renderShortcut('activate-keys', assigned.find(({ name }) => name === commands.activate)?.shortcut);
  renderShortcut('restore-keys', assigned.find(({ name }) => name === commands.restore)?.shortcut);
}

document.querySelector<HTMLAnchorElement>('#shortcut-settings')!.addEventListener('click', (event) => {
  event.preventDefault();
  void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }).catch(() => report('Couldn’t open shortcut settings.'));
});

void renderPreferences().catch(() => report('Couldn’t load settings.'));
void renderShortcuts().catch(() => report('Couldn’t load shortcuts.'));
