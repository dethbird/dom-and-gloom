import type { Material } from '../forces/types';
import { intersects, measure, parentOf, viewportSize } from './geometry';
import type { Measurement } from './geometry';

const selector = 'img, a[href], button, [role="button" i], input:is([type="button" i], [type="reset" i], [type="submit" i], [type="image" i])';

interface Layer {
  node: Element;
  z: number;
  positioned: boolean;
}

export interface Target {
  source: HTMLElement;
  measurement: Measurement;
  material: Material;
  layers: Layer[];
}

function paintLayers(source: Element, styles: Map<Element, Layer | null>) {
  const layers: Layer[] = [];
  for (let node: Element | null = source; node; node = parentOf(node)) {
    if (!styles.has(node)) {
      const style = getComputedStyle(node);
      const positioned = style.position !== 'static';
      const stacking = style.zIndex !== 'auto' || style.position === 'fixed' || style.position === 'sticky' ||
        style.transform !== 'none' || style.rotate !== 'none' || style.scale !== 'none' || style.translate !== 'none' ||
        Number(style.opacity) < 1 || style.isolation === 'isolate' || style.filter !== 'none' ||
        style.mixBlendMode !== 'normal' || style.clipPath !== 'none' || style.perspective !== 'none' ||
        /\b(paint|layout|strict|content)\b/.test(style.contain);
      styles.set(node, stacking || positioned ? { node, z: Number(style.zIndex) || 0, positioned: true } : null);
    }
    const layer = styles.get(node);
    if (layer) layers.unshift(layer);
  }
  if (layers.at(-1)?.node !== source) layers.push({ node: source, z: 0, positioned: false });
  return layers;
}

function paintOrder(a: Target, b: Target) {
  for (let index = 0; index < Math.min(a.layers.length, b.layers.length); index++) {
    const left = a.layers[index];
    const right = b.layers[index];
    if (left.node === right.node) continue;
    return left.z - right.z || Number(left.positioned) - Number(right.positioned) ||
      (left.node.compareDocumentPosition(right.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  }
  return a.layers.length - b.layers.length;
}

function materialFor(source: HTMLElement, rect: DOMRectReadOnly): Material {
  if (source instanceof HTMLImageElement || (source instanceof HTMLInputElement && source.type === 'image')) return 'image';
  if (!source.matches('a[href]:not([role="button" i])')) return 'solid';

  // A photo link flies as a single picture frame, while a text link flutters.
  for (const image of source.querySelectorAll('img')) {
    const imageRect = image.getBoundingClientRect();
    if (imageRect.width >= 32 && imageRect.width * imageRect.height >= rect.width * rect.height * 0.4) return 'image';
  }
  return 'paper';
}

export function collectTargets(): Target[] {
  const { width, height } = viewportSize();
  const viewport = { left: 0, top: 0, right: width, bottom: height };
  const used = new Set<Element>();
  const styles = new Map<Element, Layer | null>();
  const targets: Target[] = [];

  // querySelectorAll returns ancestors before descendants.
  for (const source of document.querySelectorAll(selector)) {
    if (!(source instanceof HTMLElement)) continue;
    if (!source.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) continue;
    const rect = source.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1 || !intersects(rect, viewport)) continue;

    let nested = false;
    for (let node = parentOf(source); node; node = parentOf(node)) {
      if (used.has(node)) {
        nested = true;
        break;
      }
    }
    if (nested) continue;

    const measurement = measure(source);
    const clipped = {
      left: Math.max(rect.left, measurement.clip.left),
      top: Math.max(rect.top, measurement.clip.top),
      right: Math.min(rect.right, measurement.clip.right),
      bottom: Math.min(rect.bottom, measurement.clip.bottom),
    };
    if (!intersects(clipped, viewport)) continue;

    targets.push({ source, measurement, material: materialFor(source, rect), layers: paintLayers(source, styles) });
    used.add(source);
  }
  return targets.sort(paintOrder);
}
