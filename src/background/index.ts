import { handleCommand } from './commands';

chrome.commands.onCommand.addListener((command, tab) => {
  void handleCommand(command, tab?.id).catch((error: unknown) => {
    console.debug('DOM and Gloom could not run the command on this tab.', error);
  });
});
