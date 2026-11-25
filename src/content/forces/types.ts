import type { gsap } from 'gsap';

export type Material = 'image' | 'paper' | 'solid';

export interface ForceContext {
  timeline: gsap.core.Timeline;
  target: HTMLElement;
  rect: DOMRectReadOnly;
  viewport: { width: number; height: number };
  intensity: number;
  material: Material;
}

export type Force = (context: ForceContext) => void;

export const random = (min: number, max: number) => min + Math.random() * (max - min);
export const direction = () => Math.random() < 0.5 ? -1 : 1;
