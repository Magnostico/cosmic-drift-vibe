import { describe, expect, it } from 'vitest';
import { dampingFactor, explosionScale, FLIGHT_GEARS, FLIGHT_TUNING, gearForThrust } from '../lib/flightTuning';
import { Group, Tween, Easing } from '@tweenjs/tween.js';

describe('flight tuning', () => {
  it('reports all four gears correctly', () => {
    expect(FLIGHT_GEARS.map(gearForThrust)).toEqual([1, 2, 3, 4]);
  });
  it('has equivalent steering response at 30, 60 and 144 fps', () => {
    const results = [30, 60, 144].map(fps => {
      let value = 0;
      for (let i = 0; i < fps; i++) value += (1 - value) * dampingFactor(FLIGHT_TUNING.steeringResponse, 1 / fps);
      return value;
    });
    expect(results[0]).toBeCloseTo(results[1], 10);
    expect(results[1]).toBeCloseTo(results[2], 10);
  });
  it('scales every explosion dimension with vessel length', () => {
    const small = explosionScale(0.045);
    const large = explosionScale(0.09);
    for (const key of Object.keys(small) as Array<keyof typeof small>) {
      expect(large[key]).toBeCloseTo(small[key] * 2);
    }
    expect(small.ringEnd * 0.8).toBeLessThan(0.045 * 2);
  });
  it('runs and cleans up scene-owned Tween.js animations', () => {
    const group = new Group();
    const state = { progress: 0 };
    new Tween(state, group).to({ progress: 1 }, 1000).easing(Easing.Cubic.InOut).start(0);
    group.update(500);
    expect(state.progress).toBeCloseTo(0.5);
    group.update(1000);
    expect(state.progress).toBe(1);
    group.removeAll();
    expect(group.getAll()).toHaveLength(0);
  });
});