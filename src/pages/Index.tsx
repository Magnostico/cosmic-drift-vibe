import { useState } from 'react';
import SolarSystem from '@/components/SolarSystem';
import UIOverlay from '@/components/UIOverlay';
import { type PlanetData } from '@/data/planets';

const Index = () => {
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showInfo, setShowInfo] = useState(true);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <SolarSystem
        timeSpeed={timeSpeed}
        paused={paused}
        showOrbits={showOrbits}
        onPlanetClick={setSelectedPlanet}
      />
      <UIOverlay
        selectedPlanet={selectedPlanet}
        timeSpeed={timeSpeed}
        paused={paused}
        showOrbits={showOrbits}
        showInfo={showInfo}
        setTimeSpeed={setTimeSpeed}
        setPaused={setPaused}
        setShowOrbits={setShowOrbits}
        setShowInfo={setShowInfo}
      />
    </div>
  );
};

export default Index;
