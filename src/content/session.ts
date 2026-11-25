import { gsap } from 'gsap';
import type { Preferences } from '../shared/types';
import { createOverlay } from './dom/clone';
import { collectTargets } from './dom/collect';
import { intersects, measure, viewportSize } from './dom/geometry';
import { conceal } from './dom/visibility';
import { forceImplementations } from './forces';
import { random } from './forces/types';

interface Run {
  overlay: HTMLElement;
  timelines: Set<gsap.core.Timeline>;
  reveal: Set<() => void>;
  tracking: AbortController;
  frame: number;
}

export class AnimationSession {
  private run?: Run;

  activate(preferences: Preferences) {
    if (this.run) return;
    const targets = collectTargets();
    if (!targets.length) return;

    const overlay = createOverlay();
    const pieces = targets.flatMap((target) => {
      const clone = overlay.add(target.source);
      if (!clone) return [];
      clone.place(target.measurement);
      return [{ ...target, clone }];
    });
    if (!pieces.length) return;

    const schedule = gsap.timeline({ paused: true });
    const run: Run = {
      overlay: overlay.host,
      timelines: new Set([schedule]),
      reveal: new Set(),
      tracking: new AbortController(),
      frame: 0,
    };
    this.run = run;

    try {
      overlay.mount();
      const pending = new Set(pieces);

      const followLayout = () => {
        if (run.frame) return;
        run.frame = requestAnimationFrame(() => {
          run.frame = 0;
          for (const piece of pending) {
            if (piece.source.isConnected) piece.clone.place(measure(piece.source));
          }
        });
      };

      const options = { capture: true, passive: true, signal: run.tracking.signal };
      window.addEventListener('scroll', followLayout, options);
      window.addEventListener('resize', followLayout, options);

      const intensity = preferences.intensity / 100;
      const stagger = preferences.stagger / 100;
      const force = forceImplementations[preferences.force];
      const completion = () => {
        run.timelines.delete(schedule);
        run.tracking.abort();
        cancelAnimationFrame(run.frame);
      };
      schedule.eventCallback('onComplete', completion);

      for (const piece of pieces) {
        const { source, clone, material } = piece;
        clone.syncScroll();
        const reveal = conceal(source);
        run.reveal.add(reveal);
        const delay = random(0, 1.3) * stagger * (material === 'solid' ? 1.15 : 0.9);

        schedule.call(() => {
          pending.delete(piece);
          const viewport = viewportSize();
          const measurement = measure(source);
          const { rect, clip } = measurement;
          if (!source.isConnected || !intersects(rect, { left: 0, top: 0, right: viewport.width, bottom: viewport.height }) ||
              !intersects(rect, clip)) {
            clone.sprite.remove();
            reveal();
            run.reveal.delete(reveal);
            return;
          }

          clone.place(measurement);
          clone.syncScroll();
          const timeline = gsap.timeline({
            paused: true,
            onComplete: () => {
              clone.sprite.remove();
              run.timelines.delete(timeline);
            },
          });
          run.timelines.add(timeline);
          force({ timeline, target: clone.sprite, rect, viewport, intensity, material });
          timeline.play();
        }, [], delay);
      }
      schedule.play();
    } catch (error) {
      this.restore();
      throw error;
    }
  }

  restore() {
    const run = this.run;
    if (!run) return;
    this.run = undefined;

    run.tracking.abort();
    cancelAnimationFrame(run.frame);
    for (const timeline of run.timelines) timeline.kill();
    run.overlay.remove();
    for (const reveal of run.reveal) reveal();
  }
}
