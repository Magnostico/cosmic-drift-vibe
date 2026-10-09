export const FLIGHT_TUNING = {
  referenceFps: 60,
  steeringResponse: 8,
  turnRate: 1.35,
  pitchRate: 1.1,
  bankAngle: 0.42,
  lateralGrip: 4,
  drag: -Math.log(0.8),
  brakeDrag: 5,
  throttleResponse: 7,
  trailRate: 90,
} as const;

export const FLIGHT_GEARS = [0.0002, 0.001, 0.005, 0.02] as const;

// World scale is intentionally compressed for play; framing is calibrated separately.
export const VESSEL_SCALE = { playerLength: 0.012, enemyLength: 0.01 } as const;

export function dampingFactor(rate: number, dt: number) {
  return 1 - Math.exp(-rate * Math.max(0, dt));
}

export function gearForThrust(thrust: number) {
  if (thrust >= FLIGHT_GEARS[3]) return 4;
  if (thrust >= FLIGHT_GEARS[2]) return 3;
  if (thrust >= FLIGHT_GEARS[1]) return 2;
  return 1;
}

export function explosionScale(vesselLength: number) {
  const length = Math.max(vesselLength, 0.001);
  return {
    coreStart: length * 0.16,
    coreEnd: length * 1.15,
    ringStart: length * 0.2,
    ringEnd: length * 2.2,
    sphereStart: length * 0.3,
    sphereEnd: length * 2.8,
    sparkSize: length * 0.045,
    debrisScale: length * 0.09,
    sparkSpeed: length * 3.2,
    lightRange: length * 8,
    spawnSpread: length * 0.28,
    smokeEnd: length * 1.8,
  };
}