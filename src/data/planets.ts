export interface PlanetData {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  color: string;
  hasRing?: boolean;
  ringColor?: string;
  ringInner?: number;
  ringOuter?: number;
  description: string;
  mass: string;
  radiusKm: string;
  orbitalPeriod: string;
  surfaceTemp: string;
  moons: string;
}

export const planets: PlanetData[] = [
  {
    name: "Mercury",
    radius: 0.25,
    orbitRadius: 6,
    orbitSpeed: 4.15,
    color: "#a0a0a0",
    description: "The smallest planet and closest to the Sun",
    mass: "3.30 × 10²³ kg",
    radiusKm: "2,439.7 km",
    orbitalPeriod: "88 days",
    surfaceTemp: "-180°C to 430°C",
    moons: "0",
  },
  {
    name: "Venus",
    radius: 0.5,
    orbitRadius: 9,
    orbitSpeed: 1.62,
    color: "#e8cda0",
    description: "Hottest planet with thick toxic atmosphere",
    mass: "4.87 × 10²⁴ kg",
    radiusKm: "6,051.8 km",
    orbitalPeriod: "225 days",
    surfaceTemp: "462°C",
    moons: "0",
  },
  {
    name: "Earth",
    radius: 0.52,
    orbitRadius: 12,
    orbitSpeed: 1.0,
    color: "#4a90d9",
    description: "Our home — the only known planet with life",
    mass: "5.97 × 10²⁴ kg",
    radiusKm: "6,371 km",
    orbitalPeriod: "365.25 days",
    surfaceTemp: "-89°C to 57°C",
    moons: "1",
  },
  {
    name: "Mars",
    radius: 0.35,
    orbitRadius: 16,
    orbitSpeed: 0.53,
    color: "#c1440e",
    description: "The Red Planet — target for human exploration",
    mass: "6.42 × 10²³ kg",
    radiusKm: "3,389.5 km",
    orbitalPeriod: "687 days",
    surfaceTemp: "-153°C to 20°C",
    moons: "2",
  },
  {
    name: "Jupiter",
    radius: 1.8,
    orbitRadius: 24,
    orbitSpeed: 0.084,
    color: "#c88b3a",
    description: "Largest planet — a gas giant with 95 known moons",
    mass: "1.90 × 10²⁷ kg",
    radiusKm: "69,911 km",
    orbitalPeriod: "11.86 years",
    surfaceTemp: "-110°C",
    moons: "95",
  },
  {
    name: "Saturn",
    radius: 1.4,
    orbitRadius: 34,
    orbitSpeed: 0.034,
    color: "#e8d5a3",
    hasRing: true,
    ringColor: "#c4a96a",
    ringInner: 1.8,
    ringOuter: 2.8,
    description: "Famous for its spectacular ring system",
    mass: "5.68 × 10²⁶ kg",
    radiusKm: "58,232 km",
    orbitalPeriod: "29.46 years",
    surfaceTemp: "-140°C",
    moons: "146",
  },
  {
    name: "Uranus",
    radius: 0.9,
    orbitRadius: 44,
    orbitSpeed: 0.012,
    color: "#7ec8e3",
    hasRing: true,
    ringColor: "#5a8a9a",
    ringInner: 1.3,
    ringOuter: 1.8,
    description: "An ice giant tilted on its side",
    mass: "8.68 × 10²⁵ kg",
    radiusKm: "25,362 km",
    orbitalPeriod: "84.01 years",
    surfaceTemp: "-224°C",
    moons: "28",
  },
  {
    name: "Neptune",
    radius: 0.85,
    orbitRadius: 54,
    orbitSpeed: 0.006,
    color: "#3f54ba",
    description: "The windiest planet — farthest from the Sun",
    mass: "1.02 × 10²⁶ kg",
    radiusKm: "24,622 km",
    orbitalPeriod: "164.8 years",
    surfaceTemp: "-214°C",
    moons: "16",
  },
];
