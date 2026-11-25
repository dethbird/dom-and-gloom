import { direction, random } from './types';
import type { Force, ForceContext } from './types';

const materials = {
  image: { weight: 0.85, drift: 92, spin: 290, ease: 'power2.in' },
  paper: { weight: 0.58, drift: 170, spin: 95, ease: 'power1.in' },
  solid: { weight: 1.35, drift: 38, spin: 105, ease: 'power3.in' },
};

function fall({ timeline, target, rect, viewport, intensity, material }: ForceContext, sign: number) {
  const model = materials[material];
  const weight = model.weight * random(0.82, 1.18);
  const strength = 0.35 + intensity * 0.9;
  const radius = Math.hypot(rect.width, rect.height) / 2;
  const center = rect.top + rect.height / 2;
  const landing = sign * ((sign > 0 ? viewport.height - center : center) + radius + 56);
  const velocity = (650 + intensity * 550) * weight * (sign < 0 ? 1.25 : 1);
  const duration = Math.max(0.48, Math.sqrt(2 * Math.abs(landing) / velocity));
  const drift = direction() * model.drift * strength * random(0.45, 1.35);
  const spin = direction() * model.spin * strength * random(0.55, 1.4) * (sign < 0 ? 1.65 : 1);
  const hesitation = Math.random() < 0.42 ? random(0.07, 0.23) : 0;
  const ease = sign > 0 ? model.ease : 'power3.in';

  if (hesitation) {
    timeline.to(target, {
      y: -sign * random(3, 13) * strength,
      rotation: -Math.sign(spin) * random(3, 11) * strength,
      duration: hesitation,
      ease: 'sine.out',
    });
  }

  const release = timeline.duration();
  timeline.to(target, { y: landing, duration, ease }, release);

  if (material === 'paper') {
    timeline
      .to(target, { x: drift * 0.48, rotation: spin * 0.45, duration: duration * 0.31, ease: 'sine.inOut' }, release)
      .to(target, { x: -drift * 0.15, rotation: -spin * 0.35, duration: duration * 0.24, ease: 'sine.inOut' })
      .to(target, { x: drift, rotation: spin, duration: duration * 0.45, ease: 'sine.inOut' });
  } else {
    timeline.to(target, { x: drift, rotation: spin, duration, ease: material === 'image' ? 'power1.in' : ease }, release);
  }
}

export const gravity: Force = (context) => fall(context, 1);
export const reverseGravity: Force = (context) => fall(context, -1);
