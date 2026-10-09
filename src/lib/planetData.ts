export interface PlanetInfo {
  name: string;
  alternateName?: string;
  classification: string;
  tagline: string;
  color: string;
  secondaryColor: string;
  overview: string;
  mass: string;
  radius: string;
  semiMajorAxis: string;
  orbitalPeriod: string;
  rotationPeriod: string;
  surfaceTemp: string;
  gravity: string;
  moons: string;
  atmosphere: string;
  highlights: string[];
  tags: string[];
}

export const CELESTIAL_DATABASE: Record<string, PlanetInfo> = {
  'The Sun': {
    name: 'The Sun',
    alternateName: 'Sol · G2V',
    classification: 'Yellow Dwarf Star',
    tagline: 'Heart of the Solar System · 99.86% of Total System Mass',
    color: '#ffb300',
    secondaryColor: '#ff5722',
    overview:
      'The Sun is the stellar gravitational anchor and powerhouse of our solar system. A nearly perfect sphere of incandescent plasma, its core undergoes nuclear fusion, converting approximately 600 million tons of hydrogen into helium every second.',
    mass: '1.989 × 10³⁰ kg (333,000 M⊕)',
    radius: '696,340 km (109.2 R⊕)',
    semiMajorAxis: '0.00 AU (Galactic Orbit ~26,000 ly)',
    orbitalPeriod: '230 Million Years (Cosmic Year)',
    rotationPeriod: '25–35 Days (Differential)',
    surfaceTemp: '5,500°C (Core: 15,000,000°C)',
    gravity: '274.0 m/s² (27.9 g)',
    moons: '8 Planets · 5 Dwarf Planets',
    atmosphere: '73.5% Hydrogen, 24.9% Helium, 0.8% Oxygen',
    highlights: [
      'Accounts for 99.86% of all mass in the entire solar system.',
      'Surface temperature reaches 5,500°C, while the outer corona mysteriously exceeds 1–3 million °C.',
      'Produces the solar wind, creating the protective heliosphere cavity against interstellar radiation.'
    ],
    tags: ['G-Type Main Sequence', 'Thermonuclear Core', 'Solar Wind Engine']
  },
  'Mercury': {
    name: 'Mercury',
    alternateName: 'Hermes',
    classification: 'Terrestrial Planet',
    tagline: 'The Scorched Courier · Closest Planet to the Sun',
    color: '#b0bec5',
    secondaryColor: '#78909c',
    overview:
      'Mercury is the smallest planet and closest to the Sun. With virtually no atmosphere to trap heat, it experiences the most extreme temperature swings in the solar system, from scorching daytime heat to frigid polar nights where water ice lurks in permanently shadowed craters.',
    mass: '3.301 × 10²³ kg (0.055 M⊕)',
    radius: '2,439.7 km (0.383 R⊕)',
    semiMajorAxis: '0.387 AU (57.9M km)',
    orbitalPeriod: '87.97 Days',
    rotationPeriod: '58.65 Days (3:2 Spin-Orbit Resonance)',
    surfaceTemp: '-180°C to +430°C',
    gravity: '3.70 m/s² (0.38 g)',
    moons: '0 Moons · 0 Rings',
    atmosphere: 'Trace Exosphere (Oxygen, Sodium, Hydrogen, Helium)',
    highlights: [
      'Possesses a massive metallic iron core making up roughly 85% of its total planetary radius.',
      'A year is only 88 Earth days, but one solar day (noon to noon) lasts 176 Earth days.',
      'Despite daytime temperatures reaching 430°C, water ice survives in deep polar craters.'
    ],
    tags: ['Extreme Temperatures', 'Iron Core', 'Caloris Basin']
  },
  'Venus': {
    name: 'Venus',
    alternateName: 'Aphrodite · Morning Star',
    classification: 'Terrestrial Planet',
    tagline: 'The Runaway Greenhouse · Earth\'s Volcanic Twin',
    color: '#ffb74d',
    secondaryColor: '#f57c00',
    overview:
      'Venus is often called Earth’s sister planet due to similar size and mass, but it is a hellish inferno. Enveloped in an opaque blanket of sulfuric acid clouds, runaway greenhouse effects generate crushing pressures and surface temperatures hot enough to melt lead.',
    mass: '4.867 × 10²⁴ kg (0.815 M⊕)',
    radius: '6,051.8 km (0.949 R⊕)',
    semiMajorAxis: '0.723 AU (108.2M km)',
    orbitalPeriod: '224.70 Days',
    rotationPeriod: '243.02 Days (Retrograde)',
    surfaceTemp: '464°C avg (Uniform surface)',
    gravity: '8.87 m/s² (0.90 g)',
    moons: '0 Moons · 0 Rings',
    atmosphere: '96.5% Carbon Dioxide, 3.5% Nitrogen, Sulfuric Acid clouds',
    highlights: [
      'Hottest planet in the solar system, hotter even than Mercury despite being twice as far from the Sun.',
      'Rotates backwards (clockwise/retrograde); the Sun rises in the west and sets in the east.',
      'Surface atmospheric pressure is 92 times that of Earth, equivalent to 900 meters deep underwater.'
    ],
    tags: ['Runaway Greenhouse', 'Sulfuric Clouds', 'Retrograde Rotation']
  },
  'Earth': {
    name: 'Earth',
    alternateName: 'Terra · The Blue Marble',
    classification: 'Terrestrial Planet',
    tagline: 'The Oasis of Life · Liquid Oceans & Active Geodynamics',
    color: '#4fc3f7',
    secondaryColor: '#29b6f6',
    overview:
      'Earth is the third planet from the Sun and the only astronomical object known to harbor life. It features vast oceans of liquid water covering 71% of its surface, active plate tectonics, and a protective magnetic dynamo shielding a nitrogen-oxygen atmosphere.',
    mass: '5.972 × 10²⁴ kg (1.00 M⊕)',
    radius: '6,371.0 km (1.00 R⊕)',
    semiMajorAxis: '1.000 AU (149.6M km)',
    orbitalPeriod: '365.25 Days',
    rotationPeriod: '23h 56m 04s (1 Sidereal Day)',
    surfaceTemp: '-89.2°C to +56.7°C (15°C avg)',
    gravity: '9.807 m/s² (1.00 g)',
    moons: '1 Natural Satellite (The Moon)',
    atmosphere: '78.08% Nitrogen, 20.95% Oxygen, 0.93% Argon, 0.04% CO₂',
    highlights: [
      'Only celestial body known with stable bodies of liquid water on its crust and conscious life.',
      'Protected by a dynamic geomagnetic field produced by a churning outer liquid iron core.',
      'Tilted at 23.5 degrees, driving temperate annual seasons and diverse climate biomes.'
    ],
    tags: ['Biosphere', 'Liquid Hydrosphere', 'Plate Tectonics']
  },
  'The Moon': {
    name: 'The Moon',
    alternateName: 'Luna · Earth I',
    classification: 'Natural Satellite',
    tagline: 'Tidal Anchor · Ancient Regolith & Impact Basins',
    color: '#e0e0e0',
    secondaryColor: '#9e9e9e',
    overview:
      'The Moon is Earth’s sole natural satellite and the fifth-largest moon in the solar system. Formed roughly 4.5 billion years ago likely from a giant protoplanet collision (Theia), its gravitational pull stabilizes Earth’s axial wobble and generates maritime tides.',
    mass: '7.342 × 10²² kg (0.0123 M⊕)',
    radius: '1,737.4 km (0.272 R⊕)',
    semiMajorAxis: '384,400 km from Earth',
    orbitalPeriod: '27.32 Days (Tidally Locked)',
    rotationPeriod: '27.32 Days (Synchronous)',
    surfaceTemp: '-173°C to +127°C',
    gravity: '1.62 m/s² (0.166 g)',
    moons: '0 Moons · Orbiting Earth',
    atmosphere: 'Tenuous Exosphere (Helium, Neon, Hydrogen)',
    highlights: [
      'Tidally locked to Earth, meaning the exact same face always points toward our planet.',
      'Stabilizes Earth’s rotational tilt, preventing wild climate disruptions over geologic epochs.',
      'Only extraterrestrial world where humans have set foot, starting with Apollo 11 in 1969.'
    ],
    tags: ['Tidal Lock', 'Apollo Landings', 'Lunar Regolith']
  },
  'Mars': {
    name: 'Mars',
    alternateName: 'Ares · The Red Planet',
    classification: 'Terrestrial Planet',
    tagline: 'The Iron Rust World · Canyons, Volcanoes & Ancient Waters',
    color: '#ff7043',
    secondaryColor: '#d84315',
    overview:
      'Mars is the fourth planet from the Sun, named for the Roman god of war. Its distinctive reddish hue originates from ubiquitous iron oxide (rust) on its surface. It hosts the tallest volcano in the solar system (Olympus Mons) and vast dried river channels indicating a wetter ancient past.',
    mass: '6.417 × 10²³ kg (0.107 M⊕)',
    radius: '3,389.5 km (0.532 R⊕)',
    semiMajorAxis: '1.524 AU (227.9M km)',
    orbitalPeriod: '686.98 Days (1.88 Years)',
    rotationPeriod: '24h 37m 22s (1 Sol)',
    surfaceTemp: '-140°C to +20°C (-63°C avg)',
    gravity: '3.72 m/s² (0.38 g)',
    moons: '2 Moons (Phobos & Deimos)',
    atmosphere: '95.3% Carbon Dioxide, 2.6% Nitrogen, 1.9% Argon',
    highlights: [
      'Home to Olympus Mons, an extinct shield volcano standing 21.9 km high—over 2.5 times Mount Everest.',
      'Valles Marineris stretches over 4,000 km, dwarfing Earth’s Grand Canyon by an order of magnitude.',
      'Liquid brine water and subsurface ice sheets have been detected beneath the Martian polar caps.'
    ],
    tags: ['Olympus Mons', 'Valles Marineris', 'Ancient Riverbeds']
  },
  'Jupiter': {
    name: 'Jupiter',
    alternateName: 'Jove · King of Planets',
    classification: 'Gas Giant',
    tagline: 'The Planetary Titan · Cosmic Shield & Great Red Spot',
    color: '#ffa726',
    secondaryColor: '#e65100',
    overview:
      'Jupiter is the undisputed king of the planets, packing 2.5 times the mass of all other planets combined. Made primarily of hydrogen and helium, its turbulent atmosphere churns with banded jet streams, ammonia clouds, and cyclonic megastorms like the centuries-old Great Red Spot.',
    mass: '1.898 × 10²⁷ kg (317.8 M⊕)',
    radius: '69,911 km (10.97 R⊕)',
    semiMajorAxis: '5.204 AU (778.5M km)',
    orbitalPeriod: '11.86 Earth Years',
    rotationPeriod: '9h 55m 30s (Shortest in Solar System)',
    surfaceTemp: '-110°C (Cloud deck level)',
    gravity: '24.79 m/s² (2.53 g)',
    moons: '95 Confirmed Moons · Faint Ring System',
    atmosphere: '89.8% Hydrogen, 10.2% Helium, Methane, Ammonia',
    highlights: [
      'The Great Red Spot is an anticyclonic storm larger than planet Earth that has raged for over 350 years.',
      'Spins faster than any other planet, bulging noticeably at its equator with a 9 hour 55 minute day.',
      'Strongest magnetic field among planets, creating an enormous magnetosphere extending past Saturn.'
    ],
    tags: ['Great Red Spot', 'Strong Magnetosphere', 'Mini Solar System']
  },
  'Io': {
    name: 'Io',
    alternateName: 'Jupiter I',
    classification: 'Galilean Moon',
    tagline: 'The Volcanic Crucible · Tidal Inferno of Jupiter',
    color: '#ffee58',
    secondaryColor: '#fbc02d',
    overview:
      'Io is the innermost of the four Galilean moons of Jupiter. Trapped in a gravitational tug-of-war between Jupiter, Europa, and Ganymede, tidal friction incessantly flexes its crust, making it the most volcanically active body in the entire solar system with over 400 active volcanoes.',
    mass: '8.93 × 10²² kg (0.015 M⊕)',
    radius: '1,821.6 km (0.286 R⊕)',
    semiMajorAxis: '421,700 km from Jupiter',
    orbitalPeriod: '1.77 Earth Days',
    rotationPeriod: '1.77 Days (Tidally Locked)',
    surfaceTemp: '-143°C avg (Lava lakes: 1,300°C)',
    gravity: '1.796 m/s² (0.183 g)',
    moons: '0 Moons · Orbiting Jupiter',
    atmosphere: 'Sulfur Dioxide plume exosphere',
    highlights: [
      'Over 400 active volcanoes regularly spew sulfur plumes hundreds of kilometers into space.',
      'Tidal flexing generates enormous internal heat, creating underground oceans of molten silicate magma.',
      'Surface is constantly repaved by volcanic fallout, eliminating impact craters and giving it a pizza-like palette.'
    ],
    tags: ['Supervolcanism', 'Sulfur Geysers', 'Tidal Friction']
  },
  'Europa': {
    name: 'Europa',
    alternateName: 'Jupiter II',
    classification: 'Ocean Moon / Galilean Moon',
    tagline: 'The Ice Crust Ocean · Prime Astrobiology Target',
    color: '#81d4fa',
    secondaryColor: '#0288d1',
    overview:
      'Europa is slightly smaller than Earth’s Moon, encased in an outer crust of pure water ice crisscrossed by fractured reddish lineae. Beneath this icy shell lies a global saltwater ocean containing more than twice the water volume of all Earth’s oceans combined.',
    mass: '4.80 × 10²² kg (0.008 M⊕)',
    radius: '1,560.8 km (0.245 R⊕)',
    semiMajorAxis: '670,900 km from Jupiter',
    orbitalPeriod: '3.55 Earth Days',
    rotationPeriod: '3.55 Days (Tidally Locked)',
    surfaceTemp: '-160°C to -220°C',
    gravity: '1.315 m/s² (0.134 g)',
    moons: '0 Moons · Orbiting Jupiter',
    atmosphere: 'Tenuous molecular oxygen exosphere',
    highlights: [
      'Harbors a global subsurface ocean estimated to be 60 to 150 km deep beneath its ice crust.',
      'Hydrothermal vents on its ocean seafloor might provide energy and chemical nutrients for microbial life.',
      'Smoothest solid surface in the solar system, with fractured ice plates shifting like terrestrial pack ice.'
    ],
    tags: ['Subsurface Ocean', 'Habitability Potential', 'Ice Tectonics']
  },
  'Ganymede': {
    name: 'Ganymede',
    alternateName: 'Jupiter III',
    classification: 'Galilean Moon',
    tagline: 'The Giant Moon · Larger than Mercury with Magnetic Core',
    color: '#b0bec5',
    secondaryColor: '#546e7a',
    overview:
      'Ganymede is the largest moon in the solar system, exceeding the planet Mercury in size. It is the only known moon with its own internally generated magnetic field, created by convective liquid iron circulation in its deep metallic core.',
    mass: '1.48 × 10²³ kg (0.025 M⊕)',
    radius: '2,634.1 km (0.413 R⊕)',
    semiMajorAxis: '1,070,400 km from Jupiter',
    orbitalPeriod: '7.15 Earth Days',
    rotationPeriod: '7.15 Days (Tidally Locked)',
    surfaceTemp: '-163°C avg',
    gravity: '1.428 m/s² (0.146 g)',
    moons: '0 Moons · Orbiting Jupiter',
    atmosphere: 'Tenuous oxygen exosphere',
    highlights: [
      'The largest satellite in the solar system—if it orbited the Sun directly, it would be classified as a planet.',
      'Only moon with an active magnetosphere, producing visible auroral belts near its magnetic poles.',
      'Believed to contain multiple stratified layers of high-pressure ice sandwiching saline ocean reservoirs.'
    ],
    tags: ['Largest Moon', 'Intrinsic Magnetic Field', 'Sandwich Ocean']
  },
  'Callisto': {
    name: 'Callisto',
    alternateName: 'Jupiter IV',
    classification: 'Galilean Moon',
    tagline: 'The Ancient Battered World · Oldest Crust in the System',
    color: '#90a4ae',
    secondaryColor: '#455a64',
    overview:
      'Callisto is the outermost Galilean moon and the third-largest satellite in the solar system. Its heavily cratered, ancient surface has remained geologically inactive for 4 billion years, preserving an unvarnished chronicle of the early solar system’s violent bombardment era.',
    mass: '1.08 × 10²³ kg (0.018 M⊕)',
    radius: '2,410.3 km (0.378 R⊕)',
    semiMajorAxis: '1,882,700 km from Jupiter',
    orbitalPeriod: '16.69 Earth Days',
    rotationPeriod: '16.69 Days (Tidally Locked)',
    surfaceTemp: '-139°C avg',
    gravity: '1.235 m/s² (0.126 g)',
    moons: '0 Moons · Orbiting Jupiter',
    atmosphere: 'Tenuous Carbon Dioxide exosphere',
    highlights: [
      'Has the most heavily cratered surface of any object in the solar system, with no signs of plate tectonics.',
      'Experiences the lowest radiation flux from Jupiter among the Galilean moons, making it a viable future outpost.',
      'Features Valhalla, a colossal multiring impact basin spreading over 3,800 kilometers.'
    ],
    tags: ['Valhalla Basin', 'Low Radiation', 'Ancient Surface']
  },
  'Saturn': {
    name: 'Saturn',
    alternateName: 'Cronus · The Jewel of the System',
    classification: 'Gas Giant',
    tagline: 'The Ringed Sovereign · Magnificent Ice Architecture',
    color: '#ffe082',
    secondaryColor: '#ffb300',
    overview:
      'Saturn is the second-largest planet, distinguished by its magnificent, intricate planetary ring system. Composed predominantly of trillions of water ice shards ranging in size from dust motes to mountain boulders, Saturn also boasts the lowest density of any planet, light enough to float on water.',
    mass: '5.683 × 10²⁶ kg (95.16 M⊕)',
    radius: '58,232 km (9.14 R⊕)',
    semiMajorAxis: '9.582 AU (1.433B km)',
    orbitalPeriod: '29.45 Earth Years',
    rotationPeriod: '10h 33m 38s',
    surfaceTemp: '-139°C (Upper atmosphere)',
    gravity: '10.44 m/s² (1.06 g)',
    moons: '146 Confirmed Moons · Complex Rings',
    atmosphere: '96.3% Hydrogen, 3.25% Helium, Methane, Ammonia',
    highlights: [
      'Ring system extends up to 282,000 km across, yet is astonishingly thin—averaging only 10 to 30 meters thick.',
      'Has the lowest density of all planets (0.687 g/cm³)—it is less dense than liquid water and would float in a giant ocean.',
      'Features a bizarre, persistent hexagonal jet stream cloud pattern circling its north pole.'
    ],
    tags: ['Ring System', 'Hexagonal Jet Stream', 'Low Density']
  },
  'Titan': {
    name: 'Titan',
    alternateName: 'Saturn VI',
    classification: 'Moon / Hydrocarbon World',
    tagline: 'The Methane World · Dense Nitrogen Atmosphere & Lakes',
    color: '#ffb74d',
    secondaryColor: '#e65100',
    overview:
      'Titan is Saturn’s largest moon and the only satellite in the solar system with a dense, cloudy atmosphere. It is also the only celestial body besides Earth known to possess stable surface liquids, featuring vast lakes, rivers, and seas of liquid methane and ethane.',
    mass: '1.345 × 10²³ kg (0.0225 M⊕)',
    radius: '2,574.7 km (0.404 R⊕)',
    semiMajorAxis: '1,221,870 km from Saturn',
    orbitalPeriod: '15.95 Earth Days',
    rotationPeriod: '15.95 Days (Tidally Locked)',
    surfaceTemp: '-179.2°C (-290.6°F)',
    gravity: '1.352 m/s² (0.138 g)',
    moons: '0 Moons · Orbiting Saturn',
    atmosphere: '95% Nitrogen, 4.9% Methane, Trace Hydrocarbons',
    highlights: [
      'Dense atmosphere creates surface pressure 50% higher than Earth’s, with thick orange hydrocarbon haze.',
      'Experiences a complete hydrological cycle, but rain, rivers, and seas are liquid methane and ethane rather than water.',
      'ESA’s Huygens probe touched down on Titan in 2005, capturing pebbles of rounded water ice on a frozen shoreline.'
    ],
    tags: ['Methane Lakes', 'Dense Atmosphere', 'Huygens Landing']
  },
  'Uranus': {
    name: 'Uranus',
    alternateName: 'Ouranos · The Tilted Ice Giant',
    classification: 'Ice Giant',
    tagline: 'The Sideways Planet · Aquamarine Skies & Extreme Tilt',
    color: '#80deea',
    secondaryColor: '#00acc1',
    overview:
      'Uranus is an aquamarine ice giant with an extraordinary 97.8-degree axial tilt, meaning it essentially rotates on its side. Its atmospheric methane absorbs red light, giving it a calm cyan hue, while its mantle consists of a slushy supercritical fluid of water, ammonia, and methane ice.',
    mass: '8.681 × 10²⁵ kg (14.54 M⊕)',
    radius: '25,362 km (3.98 R⊕)',
    semiMajorAxis: '19.22 AU (2.875B km)',
    orbitalPeriod: '84.02 Earth Years',
    rotationPeriod: '17h 14m 24s (Retrograde)',
    surfaceTemp: '-224°C min (-195°C avg)',
    gravity: '8.87 m/s² (0.90 g)',
    moons: '28 Confirmed Moons · 13 Thin Dark Rings',
    atmosphere: '82.5% Hydrogen, 15.2% Helium, 2.3% Methane',
    highlights: [
      'Rotates nearly completely on its side (97.8° tilt), resulting in 42 years of continuous sunlight followed by 42 years of night at the poles.',
      'Recorded the lowest atmospheric temperature of any solar system planet, dropping to a frigid -224°C.',
      'Surrounded by 13 faint, dark rings composed of boulder-sized organic and ice compounds.'
    ],
    tags: ['Sideways Rotation', 'Coldest Atmosphere', 'Ice Giant']
  },
  'Neptune': {
    name: 'Neptune',
    alternateName: 'Poseidon · The Windy Giant',
    classification: 'Ice Giant',
    tagline: 'The Azure Tempest · Supersonic Winds at the Edge',
    color: '#448aff',
    secondaryColor: '#1565c0',
    overview:
      'Neptune is the eighth and most distant major planet from the Sun. An intense deep-cobalt ice giant, it is home to the most violent winds in the solar system, with atmospheric storms accelerating supersonic gusts beyond 2,100 km/h across white methane cirrus cloud streaks.',
    mass: '1.024 × 10²⁶ kg (17.15 M⊕)',
    radius: '24,622 km (3.86 R⊕)',
    semiMajorAxis: '30.07 AU (4.498B km)',
    orbitalPeriod: '164.79 Earth Years',
    rotationPeriod: '16h 06m 36s',
    surfaceTemp: '-201°C avg',
    gravity: '11.15 m/s² (1.14 g)',
    moons: '16 Confirmed Moons · 5 Dark Ring Arcs',
    atmosphere: '80.0% Hydrogen, 19.0% Helium, 1.5% Methane',
    highlights: [
      'Features the fastest planetary winds in the solar system, topping 2,160 km/h (1,340 mph)—surpassing the speed of sound.',
      'Takes almost 165 Earth years to complete a single orbit around the Sun; completed its first tracked orbit since discovery in 2011.',
      'Hosts Triton, a retrograde captured Kuiper Belt moon with active cryogeysers blasting nitrogen gas.'
    ],
    tags: ['Supersonic Winds', 'Deep Cobalt Blue', 'Triton Satellite']
  },
  'Pluto': {
    name: 'Pluto',
    alternateName: 'Hades · 134340 Pluto',
    classification: 'Dwarf Planet / Kuiper Belt World',
    tagline: 'The Icy Pioneer · Nitrogen Glaciers of Tombaugh Regio',
    color: '#d7ccc8',
    secondaryColor: '#8d6e63',
    overview:
      'Pluto is a complex dwarf planet located in the Kuiper Belt beyond Neptune. Revealed in breathtaking detail by NASA\'s New Horizons spacecraft in 2015, Pluto boasts rugged water ice mountains, blue atmospheric hazes, and Sputnik Planitia—a vast beating heart-shaped nitrogen ice glacier.',
    mass: '1.303 × 10²² kg (0.0022 M⊕)',
    radius: '1,188.3 km (0.187 R⊕)',
    semiMajorAxis: '39.48 AU (5.906B km)',
    orbitalPeriod: '247.94 Earth Years',
    rotationPeriod: '153.3 Hours (6.39 Days, Retrograde)',
    surfaceTemp: '-232°C to -223°C',
    gravity: '0.62 m/s² (0.063 g)',
    moons: '5 Moons (Charon, Styx, Nix, Kerberos, Hydra)',
    atmosphere: 'Thin Nitrogen, Methane, Carbon Monoxide haze',
    highlights: [
      'Features Sputnik Planitia, a 1,000-km-wide glacier of nitrogen and carbon monoxide ice in the shape of a giant heart.',
      'Forms a binary system with its giant moon Charon; they are mutually tidally locked and orbit a shared barycenter in open space.',
      'Has a surprising layered blue atmospheric haze extending tens of kilometers into the dark void.'
    ],
    tags: ['Sputnik Planitia', 'Binary System with Charon', 'Kuiper Belt']
  },
  'Ceres': {
    name: 'Ceres',
    alternateName: '1 Ceres',
    classification: 'Dwarf Planet / Main Belt Object',
    tagline: 'Empress of the Asteroid Belt · Occator Crater Faculae',
    color: '#a8a29e',
    secondaryColor: '#78716c',
    overview:
      'Ceres is the largest object in the main asteroid belt between Mars and Jupiter and the only dwarf planet in the inner solar system. Comprising roughly one-third of the asteroid belt\'s total mass, Ceres contains a rocky core beneath an icy mantle, with distinctive bright reflective sodium carbonate salt deposits inside Occator Crater.',
    mass: '9.39 × 10²⁰ kg (0.00015 M⊕)',
    radius: '469.7 km (0.074 R⊕)',
    semiMajorAxis: '2.77 AU (414M km)',
    orbitalPeriod: '4.60 Earth Years (1,682 Days)',
    rotationPeriod: '9.07 Hours',
    surfaceTemp: '-105°C avg (-38°C max)',
    gravity: '0.28 m/s² (0.029 g)',
    moons: '0 Moons',
    atmosphere: 'Transient Water Vapor Exosphere',
    highlights: [
      'Accounts for approximately 33% of the entire mass of the asteroid belt.',
      'Discovered on New Year\'s Day 1801 by Giuseppe Piazzi and initially classified as the 8th planet.',
      'Hosts the famous bright spots (Cerealia and Vinalia Faculae) in Occator Crater, formed by cryovolcanic brine eruptions.'
    ],
    tags: ['Asteroid Belt Giant', 'Occator Crater Faculae', 'Cryovolcanic Brine']
  },
  'Asteroid Belt': {
    name: 'Asteroid Belt',
    alternateName: 'Main Belt',
    classification: 'Circumstellar Debris Ring',
    tagline: 'The Rubble of Planetary Creation · Between Mars and Jupiter',
    color: '#94a3b8',
    secondaryColor: '#64748b',
    overview:
      'The asteroid belt is a torus-shaped circumstellar disc located between the orbits of Mars and Jupiter. Occupied by millions of irregularly shaped rocky, carbonaceous, and metallic planetesimals, the belt represents ancient remnants from the solar system\'s accretion disc that were prevented by Jupiter\'s immense gravitational perturbations from coalescing into a planet.',
    mass: '~2.4 × 10²¹ kg (approx. 3% of the Moon)',
    radius: 'Width: 2.2 to 3.2 AU (150M km span)',
    semiMajorAxis: '2.7 AU avg',
    orbitalPeriod: '3 to 6 Earth Years',
    rotationPeriod: 'Variable (hours to days)',
    surfaceTemp: '-73°C to -108°C avg',
    gravity: 'Negligible (Microgravity field)',
    moons: 'Contains numerous binary asteroid pairs (e.g., Ida & Dactyl)',
    atmosphere: 'None (Hard Vacuum)',
    highlights: [
      'Contains over 1 million asteroids larger than 1 km in diameter, yet total combined mass is only 3% of Earth\'s Moon.',
      'Shaped by Kirkwood gaps—orbital zones cleared by orbital resonances with massive Jupiter.',
      'Spectral diversity includes dark carbonaceous C-type asteroids, silicate S-types, and metallic M-types.'
    ],
    tags: ['Kirkwood Gaps', 'Planetesimal Remnants', 'Protoplanetary Disc']
  }
};

export function getPlanetInfo(nameOrId: string): PlanetInfo {
  if (!nameOrId) return CELESTIAL_DATABASE['Earth'];
  
  // Exact match
  if (CELESTIAL_DATABASE[nameOrId]) {
    return CELESTIAL_DATABASE[nameOrId];
  }

  // Normalized search
  const clean = nameOrId.toLowerCase().trim();
  const foundKey = Object.keys(CELESTIAL_DATABASE).find(k => {
    const kClean = k.toLowerCase();
    return kClean === clean || kClean.includes(clean) || clean.includes(kClean);
  });

  if (foundKey && CELESTIAL_DATABASE[foundKey]) {
    return CELESTIAL_DATABASE[foundKey];
  }

  // Fallback generic info
  return {
    name: nameOrId,
    classification: 'Celestial Body',
    tagline: 'Solar System Astronomical Body',
    color: '#4fc3f7',
    secondaryColor: '#0288d1',
    overview: `Astronomical body ${nameOrId} orbiting within the solar system.`,
    mass: '—',
    radius: '—',
    semiMajorAxis: '—',
    orbitalPeriod: '—',
    rotationPeriod: '—',
    surfaceTemp: '—',
    gravity: '—',
    moons: '—',
    atmosphere: '—',
    highlights: ['Observed and tracked within the 3D solar system orrery.'],
    tags: ['Celestial Object']
  };
}
