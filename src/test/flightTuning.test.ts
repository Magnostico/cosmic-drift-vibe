import { describe, expect, it } from 'vitest';
import {
  calculateLaserProximityScale,
  calculateOrbitalAltitude,
  calculateOrbitalAssist,
  calculateOrbitalInsertionArc,
  calculateOrbitalRadius,
  calculatePlanetProximityScale,
  calculateVesselProximityScale,
  dampingFactor,
  explosionScale,
  FLIGHT_CAMERA_OFFSET,
  FLIGHT_GEARS,
  FLIGHT_TUNING,
  gearForThrust,
  VESSEL_SCALE,
} from '../lib/flightTuning';
import { Group, Tween, Easing } from '@tweenjs/tween.js';

describe('flight tuning', () => {
  it('calibrates chase camera closely behind vessel independently of throttle', () => {
    expect(FLIGHT_CAMERA_OFFSET.distance).toBeLessThan(0.1);
    expect(FLIGHT_CAMERA_OFFSET.distance).toBeGreaterThan(VESSEL_SCALE.playerLength * 2);
    expect(FLIGHT_CAMERA_OFFSET.height).toBeGreaterThan(0);
    expect(FLIGHT_CAMERA_OFFSET.height).toBeLessThan(FLIGHT_CAMERA_OFFSET.distance);
  });
  it('keeps vessels small against the smallest planet and asteroids', () => {
    expect(VESSEL_SCALE.playerLength / 0.6).toBeLessThan(0.025);
    expect(VESSEL_SCALE.enemyLength).toBeLessThan(VESSEL_SCALE.playerLength);
    expect(VESSEL_SCALE.playerLength).toBeLessThan(0.1);
  });
  it('bounds the actual fireball, shockwave and spawn spread by vessel scale', () => {
    const blast = explosionScale(VESSEL_SCALE.playerLength);
    expect(0.8 * 1.4 * blast.coreEnd).toBeLessThan(VESSEL_SCALE.playerLength * 1.5);
    expect(blast.spawnSpread).toBeLessThan(VESSEL_SCALE.playerLength / 2);
    expect(blast.lightRange).toBeLessThan(0.1);
  });
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
  it('calculates realistic orbital insertion curves and altitudes', () => {
    const r = 4;
    const orbRadius = calculateOrbitalRadius(r);
    expect(orbRadius).toBeGreaterThan(r * 2);
    expect(calculateOrbitalAltitude(orbRadius, r)).toBeCloseTo(orbRadius - r);

    const start = { x: 0, y: 0, z: 120 };
    const planet = { x: 0, y: 0, z: 0 };
    const at0 = calculateOrbitalInsertionArc(start, planet, r, 0);
    expect(at0.position.z).toBeCloseTo(120);
    expect(at0.fov).toBeCloseTo(60);

    const atMid = calculateOrbitalInsertionArc(start, planet, r, 0.35);
    expect(atMid.fov).toBeGreaterThan(70); // warp dilation

    const atEnd = calculateOrbitalInsertionArc(start, planet, r, 1);
    expect(atEnd.fov).toBeCloseTo(60);
    const endDist = Math.sqrt(atEnd.position.x ** 2 + atEnd.position.z ** 2);
    expect(endDist).toBeGreaterThan(r * 1.5);
    expect(endDist).toBeLessThan(r * 4);

    const assistDeep = calculateOrbitalAssist(100, r, 0.015);
    expect(assistDeep.factor).toBe(0);
    expect(assistDeep.status).toBe('DEEP SPACE');

    const assistOrbit = calculateOrbitalAssist(r * 2.5, r, 0.015);
    expect(assistOrbit.factor).toBeGreaterThan(0.5);
    expect(assistOrbit.status).toBe('STABLE ORBIT');
  });
  it('dynamically adapts vessel and planet scales based on proximity', () => {
    // 1. Vessel proximity scaling: exactly 1.0x at dogfight range, boosted at distance
    const closeVesselScale = calculateVesselProximityScale(0.3, 1.0);
    expect(closeVesselScale).toBe(1.0);

    const midVesselScale = calculateVesselProximityScale(5.0, 1.0);
    expect(midVesselScale).toBeGreaterThan(1.0);

    const farVesselScale = calculateVesselProximityScale(25.0, 1.0);
    expect(farVesselScale).toBeGreaterThan(midVesselScale);
    expect(farVesselScale).toBeLessThanOrEqual(3.5);

    // 2. Planet proximity scaling: exactly canonical baseRadius up close, smoothly boosted far away
    const baseRadius = 0.5; // Mercury
    const closePlanetScale = calculatePlanetProximityScale(baseRadius * 2.0, baseRadius);
    expect(closePlanetScale).toBe(baseRadius);

    const farPlanetScale = calculatePlanetProximityScale(60.0, baseRadius);
    expect(farPlanetScale).toBeGreaterThan(baseRadius);
    expect(farPlanetScale / baseRadius).toBeLessThan(2.5);

    // 3. Laser bolt visibility scaling
    expect(calculateLaserProximityScale(0.5)).toBe(1.0);
    expect(calculateLaserProximityScale(10.0)).toBeGreaterThan(1.0);
  });
});