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

// Chase camera calibration: positioned closely behind and slightly above the player ship
// keeping framing independent of throttle and speed while ensuring clear line of sight.
export const FLIGHT_CAMERA_OFFSET = {
  height: 0.018,
  distance: 0.062,
  lookTargetY: 0.005,
  lookTargetLead: 0.45,
} as const;

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

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculates standard stable orbital radius around a celestial body
 * based on its radius, keeping visual proportion dramatic without colliding.
 */
export function calculateOrbitalRadius(bodyRadius: number): number {
  const r = Math.max(0.1, bodyRadius);
  return r * 2.85;
}

/**
 * Calculates the altitude above the celestial body surface.
 */
export function calculateOrbitalAltitude(distanceToCenter: number, bodyRadius: number): number {
  return Math.max(0, distanceToCenter - bodyRadius);
}

/**
 * Calculates a point along a curved 3D orbital insertion trajectory.
 * P0: Start position
 * P1: Mid-course deceleration corridor
 * P2: Tangential orbital entry point
 * P3: Final stable orbit position
 */
export function calculateOrbitalInsertionArc(
  start: Vector3D,
  targetPos: Vector3D,
  bodyRadius: number,
  t: number
): { position: Vector3D; tangent: Vector3D; fov: number } {
  const clampedT = Math.max(0, Math.min(1, t));
  const r = Math.max(0.2, bodyRadius);
  const orbRadius = calculateOrbitalRadius(r);

  // Vector from planet center to start position
  const dx = start.x - targetPos.x;
  const dy = start.y - targetPos.y;
  const dz = start.z - targetPos.z;
  const len = Math.max(0.001, Math.sqrt(dx * dx + dy * dy + dz * dz));
  const radial = { x: dx / len, y: dy / len, z: dz / len };

  // Tangent vector on the horizontal plane
  let tx = -radial.z;
  let ty = 0;
  let tz = radial.x;
  const tLen = Math.sqrt(tx * tx + tz * tz);
  if (tLen < 0.001) {
    tx = 1;
    ty = 0;
    tz = 0;
  } else {
    tx /= tLen;
    tz /= tLen;
  }

  // P0 = start
  const p0 = { ...start };

  // P1 = 65% towards planet, elevated deceleration waypoint
  const p1 = {
    x: start.x + (targetPos.x - start.x) * 0.65 + tx * orbRadius * 0.5,
    y: start.y + (targetPos.y - start.y) * 0.65 + r * 0.8,
    z: start.z + (targetPos.z - start.z) * 0.65 + tz * orbRadius * 0.5,
  };

  // P2 = Tangential injection point along the flank of the planet
  const p2 = {
    x: targetPos.x + radial.x * orbRadius * 1.35 + tx * orbRadius * 1.1,
    y: targetPos.y + r * 0.45,
    z: targetPos.z + radial.z * orbRadius * 1.35 + tz * orbRadius * 1.1,
  };

  // P3 = Final stable orbital vantage position
  const p3 = {
    x: targetPos.x + radial.x * orbRadius * 0.7 + tx * orbRadius,
    y: targetPos.y + r * 0.25,
    z: targetPos.z + radial.z * orbRadius * 0.7 + tz * orbRadius,
  };

  // Cubic Bezier interpolation: (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3
  const u = 1 - clampedT;
  const u2 = u * u;
  const u3 = u2 * u;
  const t2 = clampedT * clampedT;
  const t3 = t2 * clampedT;

  const posX = u3 * p0.x + 3 * u2 * clampedT * p1.x + 3 * u * t2 * p2.x + t3 * p3.x;
  const posY = u3 * p0.y + 3 * u2 * clampedT * p1.y + 3 * u * t2 * p2.y + t3 * p3.y;
  const posZ = u3 * p0.z + 3 * u2 * clampedT * p1.z + 3 * u * t2 * p2.z + t3 * p3.z;

  // Tangent derivative: 3(1-t)^2*(P1-P0) + 6(1-t)*t*(P2-P1) + 3*t^2*(P3-P2)
  const dX = 3 * u2 * (p1.x - p0.x) + 6 * u * clampedT * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x);
  const dY = 3 * u2 * (p1.y - p0.y) + 6 * u * clampedT * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y);
  const dZ = 3 * u2 * (p1.z - p0.z) + 6 * u * clampedT * (p2.z - p1.z) + 3 * t2 * (p3.z - p2.z);
  const dLen = Math.max(0.0001, Math.sqrt(dX * dX + dY * dY + dZ * dZ));

  // Dynamic FOV curve: 60 -> 80 (warp jump) -> 56 (retro-burn compression) -> 60 (stable orbit)
  let fov = 60;
  if (clampedT < 0.35) {
    const factor = clampedT / 0.35;
    fov = 60 + 20 * Math.sin(factor * Math.PI * 0.5);
  } else if (clampedT < 0.8) {
    const factor = (clampedT - 0.35) / 0.45;
    fov = 80 - 24 * factor;
  } else {
    const factor = (clampedT - 0.8) / 0.2;
    fov = 56 + 4 * factor;
  }

  return {
    position: { x: posX, y: posY, z: posZ },
    tangent: { x: dX / dLen, y: dY / dLen, z: dZ / dLen },
    fov,
  };
}

/**
 * Calculates realistic relative orbital assist force and speed blending
 * when navigating within the sphere of influence (SOI) of a moving planet.
 */
export function calculateOrbitalAssist(
  distToCenter: number,
  bodyRadius: number,
  bodySpeed: number
) {
  const r = Math.max(0.2, bodyRadius);
  const soiRadius = r * 4.2;
  const innerRadius = r * 2.2;

  if (distToCenter > soiRadius) {
    return { factor: 0, status: 'DEEP SPACE' as const, orbitalSpeed: 0 };
  }

  const factor = Math.max(0, Math.min(1, (soiRadius - distToCenter) / (soiRadius - innerRadius)));
  const status = factor > 0.65 ? ('STABLE ORBIT' as const) : ('APPROACH CORRIDOR' as const);
  const orbitalSpeed = bodySpeed * 0.85 + 0.002;

  return { factor, status, orbitalSpeed };
}

/**
 * Calculates adaptive visual scale for vessels (enemy ships) based on distance to camera.
 * At close dogfight range (<= minDistance), scale is exactly baseScale (1.0x).
 * At far distance, scale expands smoothly so the vessel remains visible in the space void.
 * When approaching, scale contracts smoothly back to 1.0x.
 */
export function calculateVesselProximityScale(
  distanceToCamera: number,
  baseScale = 1.0,
  minDistance = 0.5,
  maxDistance = 30.0,
  maxBoost = 3.5
): number {
  const dist = Math.max(0, distanceToCamera);
  if (dist <= minDistance) return baseScale;
  const t = Math.min(1.0, (dist - minDistance) / Math.max(0.001, maxDistance - minDistance));
  const boostFactor = 1.0 + (maxBoost - 1.0) * Math.pow(t, 0.65);
  return baseScale * boostFactor;
}

/**
 * Calculates adaptive visual scale for celestial bodies (planets and moons) based on distance to camera.
 * In close proximity (<= 3.5x radius), scale is strictly baseRadius (1.0x exact physical geometry).
 * In distant solar-system overview, smaller bodies scale up smoothly to prevent sub-pixel disappearance.
 * When approaching the planet, scale smoothly decreases back to 1.0x.
 */
export function calculatePlanetProximityScale(
  distanceToCamera: number,
  baseRadius: number
): number {
  const r = Math.max(0.1, baseRadius);
  const nearThreshold = r * 3.5;
  const farThreshold = Math.max(25.0, r * 18.0);

  if (distanceToCamera <= nearThreshold) {
    return r;
  }

  const t = Math.min(1.0, (distanceToCamera - nearThreshold) / (farThreshold - nearThreshold));
  // Higher boost compensation for tiny rocky bodies (e.g. Pluto, Mercury, Moons), subtle for gas giants
  const compensation = Math.max(1.15, Math.min(2.1, 1.75 / Math.sqrt(r)));
  const factor = 1.0 + (compensation - 1.0) * Math.sin(t * Math.PI * 0.5);
  return r * factor;
}

/**
 * Calculates adaptive visual scale for laser plasma bolts so they remain
 * visible as glowing energy streaks across distance while precise up close.
 */
export function calculateLaserProximityScale(distanceToCamera: number): number {
  const dist = Math.max(0, distanceToCamera);
  if (dist <= 0.8) return 1.0;
  const t = Math.min(1.0, (dist - 0.8) / 20.0);
  return 1.0 + 1.8 * Math.sqrt(t);
}