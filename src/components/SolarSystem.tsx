import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Line } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { planets, type PlanetData } from '@/data/planets';

interface SolarSystemProps {
  timeSpeed: number;
  paused: boolean;
  showOrbits: boolean;
  onPlanetClick: (planet: PlanetData | null) => void;
}

function Sun() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    ref.current.rotation.y += 0.002;
  });
  return (
    <group>
      <pointLight intensity={2.5} color="#fff5e6" distance={300} decay={0.3} />
      <ambientLight intensity={0.08} />
      <mesh ref={ref}>
        <sphereGeometry args={[2.5, 64, 64]} />
        <meshBasicMaterial color="#ffa31a" />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshBasicMaterial color="#ff8c00" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[4.5, 32, 32]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[6, 16, 16]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.03} depthWrite={false} />
      </mesh>
    </group>
  );
}

function PlanetMesh({
  data,
  timeSpeed,
  paused,
  onClick,
}: {
  data: PlanetData;
  timeSpeed: number;
  paused: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const angle = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (!paused) angle.current += data.orbitSpeed * delta * timeSpeed * 0.3;
    groupRef.current.position.x = Math.cos(angle.current) * data.orbitRadius;
    groupRef.current.position.z = Math.sin(angle.current) * data.orbitRadius;
    meshRef.current.rotation.y += delta * 0.5;
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'crosshair';
      }}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[data.radius, 32, 32]} />
        <meshStandardMaterial
          color={data.color}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      {data.hasRing && (
        <mesh rotation={[-Math.PI / 3, 0, 0]}>
          <ringGeometry args={[data.ringInner!, data.ringOuter!, 64]} />
          <meshStandardMaterial
            color={data.ringColor!}
            side={THREE.DoubleSide}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

function OrbitRing({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]);
    }
    return pts;
  }, [radius]);
  return (
    <Line
      points={points}
      color="#4fc3f7"
      opacity={0.15}
      transparent
      lineWidth={1}
    />
  );
}

export default function SolarSystem({
  timeSpeed,
  paused,
  showOrbits,
  onPlanetClick,
}: SolarSystemProps) {
  return (
    <Canvas
      camera={{ position: [0, 40, 60], fov: 50 }}
      style={{ position: 'absolute', top: 0, left: 0 }}
      onPointerMissed={() => onPlanetClick(null)}
    >
      <Sun />
      <Stars
        radius={200}
        depth={100}
        count={8000}
        factor={4}
        fade
        speed={1}
      />
      {planets.map((p) => (
        <PlanetMesh
          key={p.name}
          data={p}
          timeSpeed={timeSpeed}
          paused={paused}
          onClick={() => onPlanetClick(p)}
        />
      ))}
      {showOrbits &&
        planets.map((p) => (
          <OrbitRing key={`orbit-${p.name}`} radius={p.orbitRadius} />
        ))}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={150}
      />
    </Canvas>
  );
}
