import { direction, random } from './types';
import type { Force } from './types';

export const explosion: Force = ({ timeline, target, rect, viewport, intensity, material }) => {
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const dx = x - viewport.width / 2;
  const dy = y - viewport.height / 2;
  const angle = (Math.hypot(dx, dy) < 12 ? random(0, 2 * Math.PI) : Math.atan2(dy, dx)) + random(-0.29, 0.29);
  const vx = Math.cos(angle);
  const vy = Math.sin(angle);
  const radius = Math.hypot(rect.width, rect.height) / 2 + 40;
  const exitX = Math.abs(vx) < 0.001 ? Infinity : ((vx > 0 ? viewport.width - x : x) + radius) / Math.abs(vx);
  const exitY = Math.abs(vy) < 0.001 ? Infinity : ((vy > 0 ? viewport.height - y : y) + radius) / Math.abs(vy);
  const distance = Math.min(exitX, exitY) + random(24, 140) * intensity;
  const strength = 0.4 + intensity;
  const kick = random(7, 20) * strength;
  const weight = material === 'solid' ? 1.2 : material === 'paper' ? 0.83 : 1;

  timeline
    .to(target, { x: -vx * kick, y: -vy * kick, scale: 0.95, duration: random(0.08, 0.19), ease: 'sine.in' })
    .to(target, {
      x: vx * distance,
      y: vy * distance,
      scale: random(0.88, 1.12),
      rotation: direction() * random(85, 370) * strength / weight,
      duration: random(0.6, 1.25) * weight / strength,
      ease: 'power2.out',
    });
};
