import { describe, expect, it } from 'vitest';
import { CELESTIAL_DATABASE, getPlanetInfo } from '../lib/planetData';

describe('planetData', () => {
  it('contains comprehensive database of planets, sun and key moons', () => {
    const requiredBodies = [
      'The Sun',
      'Mercury',
      'Venus',
      'Earth',
      'The Moon',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
      'Pluto',
      'Io',
      'Europa',
      'Ganymede',
      'Callisto',
      'Titan'
    ];

    for (const body of requiredBodies) {
      const data = CELESTIAL_DATABASE[body];
      expect(data, `Missing entry for ${body}`).toBeDefined();
      expect(data.name).toBe(body);
      expect(data.classification).toBeTruthy();
      expect(data.color.startsWith('#')).toBe(true);
      expect(data.overview.length).toBeGreaterThan(30);
      expect(data.mass).toBeTruthy();
      expect(data.radius).toBeTruthy();
      expect(data.highlights.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('retrieves planet data with case-insensitive and partial lookup', () => {
    const earth = getPlanetInfo('earth');
    expect(earth.name).toBe('Earth');
    expect(earth.color).toBe('#4fc3f7');

    const mars = getPlanetInfo('MARS');
    expect(mars.name).toBe('Mars');

    const sun = getPlanetInfo('Sun');
    expect(sun.name).toBe('The Sun');
  });

  it('provides safe fallback for unknown objects', () => {
    const unknown = getPlanetInfo('Asteroid-999');
    expect(unknown.name).toBe('Asteroid-999');
    expect(unknown.classification).toBe('Celestial Body');
    expect(unknown.overview).toBeTruthy();
  });
});
