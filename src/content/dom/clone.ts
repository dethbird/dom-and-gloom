import type { Measurement } from './geometry';

const htmlTags = new Set('a abbr b blockquote br button caption cite code dd div dl dt em h1 h2 h3 h4 h5 h6 hr i img input kbd li mark ol p picture pre q s samp small span strong sub sup table tbody td th thead tr u ul'.split(' '));
const svgTags = new Set('svg g defs path rect circle ellipse line polyline polygon text tspan linearGradient radialGradient stop clipPath mask symbol use'.split(' '));
const svgAttributes = new Set('viewBox preserveAspectRatio d points x y x1 y1 x2 y2 cx cy r rx ry width height transform gradientUnits gradientTransform offset fill-rule clip-rule'.split(' '));
const svgNamespace = 'http://www.w3.org/2000/svg';

function copyStyles(from: CSSStyleDeclaration, to: CSSStyleDeclaration) {
  for (const property of from) {
    if (property.startsWith('--') || /^(animation|transition|scroll|view-transition)(-|$)/.test(property)) continue;
    to.setProperty(property, from.getPropertyValue(property));
  }
  to.setProperty('pointer-events', 'none');
}

interface CloneContext {
  sheet: CSSStyleSheet;
  nextPseudo: number;
  scrolled: { source: Element; clone: Element }[];
}

function copyPseudos(source: Element, clone: Element, context: CloneContext) {
  for (const pseudo of ['before', 'after']) {
    const style = getComputedStyle(source, `::${pseudo}`);
    if (!style.content || style.content === 'none' || style.content === 'normal') continue;

    if (!clone.hasAttribute('data-pseudo')) clone.setAttribute('data-pseudo', String(context.nextPseudo++));
    const id = clone.getAttribute('data-pseudo');
    const index = context.sheet.insertRule(`[data-pseudo="${id}"]::${pseudo} {}`, context.sheet.cssRules.length);
    const rule = context.sheet.cssRules[index] as CSSStyleRule;
    copyStyles(style, rule.style);
  }
}

function cloneNode(source: Element, context: CloneContext): HTMLElement | SVGElement | null {
  const tag = source.localName;
  if (/^(script|style|link|iframe|object|embed|template|source|noscript)$/.test(tag)) return null;

  const style = getComputedStyle(source);
  if (style.display === 'none') return null;
  let clone: HTMLElement | SVGElement;

  if (source instanceof SVGElement && svgTags.has(tag)) {
    clone = document.createElementNS(svgNamespace, tag);
    for (const { name, value } of source.attributes) {
      if (svgAttributes.has(name)) clone.setAttribute(name, value);
    }
  } else {
    clone = document.createElement(htmlTags.has(tag) ? tag : 'span');
  }

  if (source instanceof HTMLImageElement && clone instanceof HTMLImageElement) {
    clone.alt = source.alt;
    if (source.currentSrc) clone.src = source.currentSrc;
  }
  if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
    // Only recreate button controls. Never copy the value of a text or password field.
    if (/^(button|submit|reset|image)$/.test(source.type)) {
      clone.type = source.type;
      clone.value = source.value;
      if (source.type === 'image') {
        clone.src = source.src;
        clone.alt = source.alt;
      }
    }
  }

  copyStyles(style, clone.style);
  copyPseudos(source, clone, context);
  for (const child of source.childNodes) {
    if (child instanceof Text) clone.append(document.createTextNode(child.data));
    if (child instanceof Element) {
      const replica = cloneNode(child, context);
      if (replica) clone.append(replica);
    }
  }
  if (source.scrollTop || source.scrollLeft) context.scrolled.push({ source, clone });
  return clone;
}

export function createOverlay() {
  const host = document.createElement('div');
  host.setAttribute('data-dom-and-gloom', '');
  host.setAttribute('aria-hidden', 'true');
  host.inert = true;
  host.popover = 'manual';
  const style = host.style;
  for (const [name, value] of Object.entries({
    all: 'initial', display: 'block', position: 'fixed', inset: '0', width: '100%', height: '100%',
    margin: '0', padding: '0', overflow: 'hidden', 'pointer-events': 'none', 'z-index': '2147483647',
  })) style.setProperty(name, value, 'important');

  const root = host.attachShadow({ mode: 'closed' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(':host::backdrop { background: transparent; pointer-events: none; }');
  root.adoptedStyleSheets = [sheet];

  let nextPseudo = 0;
  return {
    host,
    mount() {
      document.documentElement.append(host);
      host.showPopover();
    },
    add(source: HTMLElement) {
      const context: CloneContext = { sheet, nextPseudo, scrolled: [] };
      const artwork = cloneNode(source, context);
      nextPseudo = context.nextPseudo;
      if (!artwork) return;
      const sprite = document.createElement('div');
      const crop = document.createElement('div');
      sprite.style.cssText = 'position:absolute;pointer-events:none;';
      crop.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
      if (artwork.style.display === 'inline') artwork.style.display = 'block';
      artwork.style.cssText += ';position:absolute;inset:0 auto auto 0;margin:0;box-sizing:border-box;' +
        'min-width:0;min-height:0;max-width:none;max-height:none;translate:none;rotate:none;scale:none;' +
        'transform-origin:0 0;transform-box:border-box;offset-path:none;zoom:1;';
      crop.append(artwork);
      sprite.append(crop);
      root.append(sprite);

      return {
        sprite,
        place({ rect, clip, width, height, transform, ancestorOpacity }: Measurement) {
          Object.assign(sprite.style, {
            left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
            opacity: String(ancestorOpacity),
          });
          Object.assign(artwork.style, { width: `${width}px`, height: `${height}px`, transform });
          if (clip.left > rect.left || clip.top > rect.top || clip.right < rect.right || clip.bottom < rect.bottom) {
            const inset = [
              Math.max(0, clip.top - rect.top), Math.max(0, rect.right - clip.right),
              Math.max(0, rect.bottom - clip.bottom), Math.max(0, clip.left - rect.left),
            ];
            crop.style.clipPath = `inset(${inset.map((value) => `${value}px`).join(' ')})`;
          } else {
            crop.style.removeProperty('clip-path');
          }
        },
        syncScroll() {
          for (const { source, clone } of context.scrolled) {
            clone.scrollLeft = source.scrollLeft;
            clone.scrollTop = source.scrollTop;
          }
        },
      };
    },
  };
}
