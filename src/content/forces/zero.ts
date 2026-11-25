import { random } from './types';
import type { Force } from './types';

export const zeroGravity: Force = ({ timeline, target, rect, viewport, intensity }) => {
  const angle = random(0, Math.PI * 2);
  const stride = random(22, 95) * (0.5 + intensity);
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const driftX = Math.max(-x, Math.min(viewport.width - x, Math.cos(angle) * stride));
  const driftY = Math.max(-y, Math.min(viewport.height - y, Math.sin(angle) * stride));
  const rotation = random(-28, 28) * (0.45 + intensity);
  const duration = random(2.6, 5.2);

  timeline
    .to(target, { x: driftX * 0.5, y: driftY * 0.5, rotation: rotation * 0.55, duration: duration * 0.65, ease: 'sine.out' })
    .to(target, {
      x: driftX,
      y: driftY,
      rotation,
      duration,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
};
