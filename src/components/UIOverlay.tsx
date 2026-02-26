import { type PlanetData } from '@/data/planets';

interface UIOverlayProps {
  selectedPlanet: PlanetData | null;
  timeSpeed: number;
  paused: boolean;
  showOrbits: boolean;
  showInfo: boolean;
  setTimeSpeed: (s: number) => void;
  setPaused: (p: boolean) => void;
  setShowOrbits: (o: boolean) => void;
  setShowInfo: (i: boolean) => void;
}

export default function UIOverlay({
  selectedPlanet,
  timeSpeed,
  paused,
  showOrbits,
  showInfo,
  setTimeSpeed,
  setPaused,
  setShowOrbits,
  setShowInfo,
}: UIOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Top Nav */}
      <div className="absolute top-5 left-5 flex gap-2 flex-wrap pointer-events-auto">
        <button
          className={`glass-btn ${showOrbits ? 'glass-btn-active' : ''}`}
          onClick={() => setShowOrbits(!showOrbits)}
        >
          ◯ Orbits
        </button>
        <button
          className={`glass-btn ${showInfo ? 'glass-btn-active' : ''}`}
          onClick={() => setShowInfo(!showInfo)}
        >
          ℹ Info
        </button>
      </div>

      {/* Title */}
      <div className="absolute top-5 right-5 pointer-events-none">
        <h2 className="text-xs text-muted-foreground tracking-[3px] uppercase font-display font-semibold">
          The Universe — V3.0
        </h2>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div
          className={`absolute top-20 left-5 pointer-events-auto glass-panel max-w-[360px] transition-all duration-300 ${
            selectedPlanet ? 'opacity-100 translate-x-0' : 'opacity-100 translate-x-0'
          }`}
        >
          {selectedPlanet ? (
            <>
              <h1 className="text-2xl font-semibold tracking-[3px] uppercase font-display gradient-text-orange mb-1">
                {selectedPlanet.name}
              </h1>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedPlanet.description}
              </p>
              <div className="space-y-2">
                <Stat label="Mass" value={selectedPlanet.mass} />
                <Stat label="Radius" value={selectedPlanet.radiusKm} />
                <Stat
                  label="Orbital Period"
                  value={selectedPlanet.orbitalPeriod}
                />
                <Stat
                  label="Surface Temp"
                  value={selectedPlanet.surfaceTemp}
                />
                <Stat label="Moons" value={selectedPlanet.moons} />
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-[3px] uppercase font-display gradient-text-cyan mb-1">
                Solar System
              </h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
                Interactive 3D Environment
              </p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <FactItem>Click any planet to see its data</FactItem>
                <FactItem>Scroll to zoom in and out</FactItem>
                <FactItem>Drag to rotate the view</FactItem>
                <FactItem>Use time controls to speed up orbits</FactItem>
              </ul>
            </>
          )}
        </div>
      )}

      {/* Controls Hint */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
        <p className="glass-btn text-xs tracking-[2px] uppercase animate-pulse-glow text-muted-foreground whitespace-nowrap">
          Drag to orbit · Scroll to zoom · Click planets
        </p>
      </div>

      {/* Time Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
        <span className="text-xs text-primary font-display font-semibold tracking-widest uppercase mr-1">
          ⏱ Time:
        </span>
        <button
          className={`glass-btn text-sm ${paused ? 'glass-btn-active' : ''}`}
          onClick={() => setPaused(!paused)}
        >
          {paused ? '▶' : '⏸'}
        </button>
        <button
          className={`glass-btn text-sm ${!paused && timeSpeed === 1 ? 'glass-btn-active' : ''}`}
          onClick={() => {
            setPaused(false);
            setTimeSpeed(1);
          }}
        >
          1×
        </button>
        <button
          className={`glass-btn text-sm ${!paused && timeSpeed === 50 ? 'glass-btn-active' : ''}`}
          onClick={() => {
            setPaused(false);
            setTimeSpeed(50);
          }}
        >
          50×
        </button>
        <button
          className={`glass-btn text-sm ${!paused && timeSpeed === 200 ? 'glass-btn-active' : ''}`}
          onClick={() => {
            setPaused(false);
            setTimeSpeed(200);
          }}
        >
          200×
        </button>
      </div>
    </div>
  );
}

function FactItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="text-space-orange text-xs mt-0.5">◆</span>
      <span>{children}</span>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  );
}
