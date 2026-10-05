import { Quaternion, Vector3, Euler } from 'three';

// Existing Earth mesh radius: 1.3 scene units. Uploaded player length: 30 m.
export const EARTH_RADIUS_METERS = 6_371_000;
export const EARTH_SCENE_RADIUS = 1.3;
export const TARGET_SHIP_SIZE = (EARTH_SCENE_RADIUS * 20) / EARTH_RADIUS_METERS;
export const PLAYER_LENGTH = TARGET_SHIP_SIZE * 1.5;
export const ENEMY_LENGTH = TARGET_SHIP_SIZE * 4.2;
export const LEGACY_EFFECT_SCALE = TARGET_SHIP_SIZE / 0.045;
export const FLIGHT = {
  turnRate: 1.15,
  turnResponse: 9,
  grip: 6,
  drag: 0.22,
  brake: 5,
  throttleResponse: 5,
  cameraResponse: 12,
  thrust: [0.0002, 0.001, 0.005, 0.02],
} as const;

export interface FlightInput {
  up: boolean; down: boolean; left: boolean; right: boolean;
  space: boolean; brake: boolean;
}

const forward = new Vector3();
const lateral = new Vector3();
const rotationDelta = new Quaternion();
const rotationEuler = new Euler(0, 0, 0, 'YXZ');

export function smoothFactor(response: number, dt: number) {
  return 1 - Math.exp(-response * dt);
}

export function steerArcade(orientation: Quaternion, angular: Vector3, input: FlightInput, dt: number) {
  const factor = smoothFactor(FLIGHT.turnResponse, dt);
  angular.x += (((Number(input.up) - Number(input.down)) * FLIGHT.turnRate) - angular.x) * factor;
  angular.y += (((Number(input.left) - Number(input.right)) * FLIGHT.turnRate) - angular.y) * factor;
  rotationEuler.set(angular.x * dt, angular.y * dt, 0, 'YXZ');
  rotationDelta.setFromEuler(rotationEuler);
  orientation.multiply(rotationDelta).normalize();
}

export function integrateArcadeVelocity(velocity: Vector3, orientation: Quaternion, input: FlightInput, thrust: number, dt: number) {
  forward.set(0, 0, -1).applyQuaternion(orientation);
  if (input.brake) velocity.multiplyScalar(Math.exp(-FLIGHT.brake * dt));
  else if (input.space) velocity.addScaledVector(forward, thrust * 60 * dt);
  const longitudinal = velocity.dot(forward);
  lateral.copy(velocity).addScaledVector(forward, -longitudinal);
  velocity.addScaledVector(lateral, -smoothFactor(FLIGHT.grip, dt));
  velocity.multiplyScalar(Math.exp(-FLIGHT.drag * dt));
  velocity.clampLength(0, thrust * 300);
}