export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const viewportSize = () => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

export const parentOf = (element: Element): Element | null => {
  const root = element.getRootNode();
  return element.assignedSlot ?? element.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
};

export function intersects(a: Bounds, b: Bounds) {
  return Math.max(a.left, b.left) < Math.min(a.right, b.right) &&
    Math.max(a.top, b.top) < Math.min(a.bottom, b.bottom);
}

function localMatrix(style: CSSStyleDeclaration) {
  const matrix = new DOMMatrix();
  const rotate = style.rotate.split(' ');
  const scale = style.scale.split(' ').map(Number);

  // Match CSS's individual rotate/scale order before the transform list.
  if (rotate.length === 1 && rotate[0] !== 'none') matrix.rotateSelf(Number.parseFloat(rotate[0]));
  if (rotate.length === 2 && rotate[0] === 'z') matrix.rotateSelf(Number.parseFloat(rotate[1]));
  if (Number.isFinite(scale[0])) matrix.scaleSelf(scale[0], scale[1] ?? scale[0]);
  if (style.transform !== 'none') matrix.multiplySelf(new DOMMatrix(style.transform));
  return new DOMMatrix([matrix.a, matrix.b, matrix.c, matrix.d, 0, 0]);
}

function borderBoxSize(style: CSSStyleDeclaration, axis: 'width' | 'height', fallback: number) {
  const size = style[axis];
  if (!size.endsWith('px')) return fallback;
  const length = Number.parseFloat(size);
  if (style.boxSizing === 'border-box') return length;

  const edges = axis === 'width' ? ['left', 'right'] : ['top', 'bottom'];
  return edges.reduce((total, edge) => total +
    Number.parseFloat(style.getPropertyValue(`padding-${edge}`)) +
    Number.parseFloat(style.getPropertyValue(`border-${edge}-width`)), length);
}

export function measure(source: HTMLElement) {
  const rect = source.getBoundingClientRect();
  const style = getComputedStyle(source);
  const width = borderBoxSize(style, 'width', source.offsetWidth || rect.width);
  const height = borderBoxSize(style, 'height', source.offsetHeight || rect.height);
  let matrix = localMatrix(style);
  let ancestorOpacity = 1;
  const clip: Bounds = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };

  for (let node = parentOf(source); node; node = parentOf(node)) {
    const style = getComputedStyle(node);
    matrix = localMatrix(style).multiply(matrix);
    ancestorOpacity *= Number(style.opacity);
    if (node === document.documentElement || node === document.body) continue;
    const paintContainment = /\b(paint|strict|content)\b/.test(style.contain);
    const clipX = paintContainment || style.overflowX !== 'visible';
    const clipY = paintContainment || style.overflowY !== 'visible';
    if (!clipX && !clipY) continue;

    const box = node.getBoundingClientRect();
    const sx = box.width / ((node as HTMLElement).offsetWidth || box.width || 1);
    const sy = box.height / ((node as HTMLElement).offsetHeight || box.height || 1);
    const left = box.left + node.clientLeft * sx;
    const top = box.top + node.clientTop * sy;
    if (clipX) {
      clip.left = Math.max(clip.left, left);
      clip.right = Math.min(clip.right, left + node.clientWidth * sx);
    }
    if (clipY) {
      clip.top = Math.max(clip.top, top);
      clip.bottom = Math.min(clip.bottom, top + node.clientHeight * sy);
    }
  }

  const { a, b, c, d } = matrix;
  const projectedWidth = Math.abs(a * width) + Math.abs(c * height);
  const projectedHeight = Math.abs(b * width) + Math.abs(d * height);
  // Fit the transformed box to the browser's bounds, including zoom and rounding.
  const sx = projectedWidth ? rect.width / projectedWidth : 1;
  const sy = projectedHeight ? rect.height / projectedHeight : 1;
  const x = -(Math.min(0, a * width) + Math.min(0, c * height)) * sx;
  const y = -(Math.min(0, b * width) + Math.min(0, d * height)) * sy;

  return {
    rect, clip, width, height, ancestorOpacity,
    transform: `matrix(${a * sx}, ${b * sy}, ${c * sx}, ${d * sy}, ${x}, ${y})`,
  };
}

export type Measurement = ReturnType<typeof measure>;
