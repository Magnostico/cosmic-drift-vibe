import { describe, expect, it } from 'vitest';
import { calculateMissionProgress, formatMissionDistance, getMissionByIndex, MISSIONS } from '../lib/missions';

describe('missions module', () => {
  it('contains the core 6 campaign missions with rewards and targets', () => {
    expect(MISSIONS).toHaveLength(6);
    expect(MISSIONS[0].targetName).toBe('The Moon');
    expect(MISSIONS[0].reward).toBe(250);
    expect(MISSIONS[5].targetName).toBe('Pluto');
  });

  it('cycles dynamic patrol missions after campaign completion', () => {
    const patrol1 = getMissionByIndex(6);
    expect(patrol1.id).toBe(7);
    expect(patrol1.title).toContain('Patrulha Estelar');
    expect(patrol1.reward).toBeGreaterThanOrEqual(500);

    const patrol2 = getMissionByIndex(7);
    expect(patrol2.id).toBe(8);
    expect(patrol2.targetName).toBeDefined();
  });

  it('calculates mission progress and formats distance', () => {
    expect(calculateMissionProgress(0.5, 0.65)).toBe(100);
    expect(calculateMissionProgress(30, 0.65, 30)).toBe(0);
    expect(calculateMissionProgress(15, 0.65, 30)).toBeGreaterThan(45);
    expect(formatMissionDistance(0.42)).toBe('420m');
    expect(formatMissionDistance(12.4)).toBe('12.4k km');
  });
});
