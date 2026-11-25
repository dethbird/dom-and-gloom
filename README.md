# DOM and Gloom

DOM and Gloom is a Manifest V3 Chrome extension that gives links, buttons, and images cartoon physics. Gravity drops them, Reverse Gravity launches them upward, Explosion scatters them outward, and Zero Gravity keeps them drifting. Open the toolbar popup to configure the effect. Use the keyboard to run it without on-page controls or notifications.

## Install and try it

1. Install Chrome 124 or later and Node.js 20.19+ or 22.12+.
2. From the repository root, run `npm ci` and `npm run build`.
3. Open `chrome://extensions`, turn on **Developer mode**, and choose **Load unpacked**. Select the generated `dist` folder.
4. Run `npm run dev` and open `http://127.0.0.1:5173/demo/`. The local storefront includes nested links, clipped and transformed images, responsive layouts, and products added by **Show more**.
5. Open the toolbar popup to pick a force and adjust **Intensity** and **Stagger**. At zero stagger, all pieces start together. Higher stagger spreads their starts over a longer interval.

| Action | Default shortcut |
| --- | --- |
| Activate the selected force | Alt+Shift+G |
| Restore the page | Alt+Shift+U |

Keep the webpage focused when using the shortcuts. Restore also works after switching the extension off. The popup displays Chrome’s assigned shortcuts, including unassigned commands. Use **Edit shortcuts** to change a binding or resolve a conflict. [Chrome keyboard command reference](https://developer.chrome.com/docs/extensions/reference/api/commands)

Chrome uses Alt+Shift+R for Reading Mode on Windows, Linux, and ChromeOS. The extension suggests Alt+Shift+U for restore. [Chromium shortcut change](https://chromium.googlesource.com/chromium/src/tools/+/bba5c08d4b77fcd7d3931505a2241866798d9912)

Chrome grants temporary access to the active tab when you press an extension shortcut. Try the demo over HTTP so Chrome can grant this access. Chrome restricts scripting on internal pages such as `chrome://extensions`. [Chrome activeTab documentation](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)

## Develop

| Command | What it does |
| --- | --- |
| `npm run dev` | Serves the demo storefront on loopback |
| `npm run watch` | Rebuilds the popup, service worker, and content script in `dist` as files change |
| `npm run typecheck` | Checks the TypeScript source |
| `npm run build` | Type-checks and produces a loadable extension in `dist` |

Restore the test page before reloading the extension in `chrome://extensions`. Refresh the test page after an extension reload to clear the old injected script.

## Architecture

- `src/background/` registers the keyboard command listener, checks whether activation is enabled, and serializes commands for each tab. Activation injects the locally bundled content script into the current top-level document.
- `src/shared/` defines preferences and messages and handles `chrome.storage.local`. The popup is plain HTML, CSS, and TypeScript.
- `src/content/dom/` discovers visible targets at activation, skips descendants of selected targets, measures geometry and clipping, and creates inert visual copies inside a fixed overlay.
- `src/content/session.ts` owns the per-document run. It hides originals in place, starts each piece, and releases timers, clones, and temporary styles on restore. Waiting pieces follow layout on scroll and resize. Released pieces move in viewport coordinates.
- `src/content/forces/` holds the GSAP timeline implementations. GSAP is bundled into the content script.

Each run captures the targets that are visible when triggered. Restore and trigger again to include newly rendered or newly visible elements. The visual snapshot approximates paint order and clipping for common layouts. Complex 3D transforms, multiline inline boxes, embedded frames, and shadow-root content can differ from the live page.

## Add a force

1. Add a force ID and display name to `forces` in `src/shared/types.ts`. The popup picks up this entry automatically.
2. Implement a `Force` in `src/content/forces/`. Use the provided timeline to animate the target. The context includes the element’s viewport rectangle, viewport dimensions, material, and intensity from 0 to 1.
3. Register the implementation in `forceImplementations` in `src/content/forces/index.ts`. The session handles delays and restoration. It removes each clone when its timeline completes, while looping timelines stay active until restore.

## Manual smoke check

- Open the popup and confirm the page stays still. Change preferences, reopen the popup, and check they persisted.
- Try all four forces. Press Activate twice during an effect, then press Restore midswing and confirm the page returns to the same layout.
- Activate, switch the extension off in its popup, and restore. Confirm that another activation while it’s off leaves the page untouched.
- Scroll to the catalog, select **Show more**, and trigger again. Try a narrow viewport and a second tab to check target collection and tab isolation.
