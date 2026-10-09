export interface Mission {
  id: number;
  title: string;
  targetName: string;
  briefing: string;
  reward: number;
  completionRadius: number; // in world space distance units
  targetOffset?: { x: number; y: number; z: number };
}

export const MISSIONS: Mission[] = [
  {
    id: 1,
    title: '1. Reconhecimento Lunar',
    targetName: 'The Moon',
    briefing: 'Aproxime-se do sinalizador orbital na Lua',
    reward: 250,
    completionRadius: 0.65,
    targetOffset: { x: 0.7, y: 0.2, z: 0.7 },
  },
  {
    id: 2,
    title: '2. Sonda de Marte',
    targetName: 'Mars',
    briefing: 'Recupere dados de telemetria da sonda em Marte',
    reward: 400,
    completionRadius: 0.9,
    targetOffset: { x: 1.4, y: 0.3, z: 1.4 },
  },
  {
    id: 3,
    title: '3. Baliza dos Asteroides',
    targetName: 'Asteroid Belt',
    briefing: 'Navegue pelo cinturão e resgate o transmissor de mineração',
    reward: 600,
    completionRadius: 1.2,
    targetOffset: { x: 43.5, y: 0.3, z: 0 },
  },
  {
    id: 4,
    title: '4. Vórtice de Júpiter',
    targetName: 'Jupiter',
    briefing: 'Aproxime-se da magnetosfera do gigante gasoso',
    reward: 800,
    completionRadius: 1.8,
    targetOffset: { x: 5.5, y: 0.8, z: 5.5 },
  },
  {
    id: 5,
    title: '5. Anéis de Saturno',
    targetName: 'Saturn',
    briefing: 'Colete amostras de gelo na borda dos anéis de Saturno',
    reward: 1000,
    completionRadius: 1.5,
    targetOffset: { x: 4.8, y: 0.5, z: 4.8 },
  },
  {
    id: 6,
    title: '6. Fronteira de Plutão',
    targetName: 'Pluto',
    briefing: 'Alcance a baliza nos confins frios do Sistema Solar',
    reward: 1500,
    completionRadius: 0.75,
    targetOffset: { x: 0.9, y: 0.2, z: 0.9 },
  },
];

export function getMissionByIndex(index: number): Mission {
  if (index < MISSIONS.length) {
    return MISSIONS[index];
  }
  // Cyclic dynamic patrol after campaign completion
  const cycle = index - MISSIONS.length + 1;
  const planetPool = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  const target = planetPool[(index) % planetPool.length];
  return {
    id: index + 1,
    title: `Patrulha Estelar #${cycle}`,
    targetName: target,
    briefing: `Patrulhe o espaço orbital de ${target} e assegure o setor`,
    reward: 500 + cycle * 50,
    completionRadius: 1.2,
    targetOffset: { x: 1.8, y: 0.4, z: 1.8 },
  };
}

export function calculateMissionProgress(currentDistance: number, completionRadius: number, referenceDistance = 30): number {
  if (currentDistance <= completionRadius) return 100;
  if (referenceDistance <= completionRadius) return 0;
  const factor = 1 - Math.max(0, currentDistance - completionRadius) / (referenceDistance - completionRadius);
  return Math.max(0, Math.min(100, Math.round(factor * 100)));
}

export function formatMissionDistance(dist: number): string {
  if (dist < 1) {
    return `${Math.round(dist * 1000)}m`;
  }
  return `${dist.toFixed(1)}k km`;
}
