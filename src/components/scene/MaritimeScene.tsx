import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, PerspectiveCamera, Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { FilterMode, ShipTrack, ViewMode } from "../../types";

interface MaritimeSceneProps {
  ships: ShipTrack[];
  highlightedTarget: string | null;
  filterMode: FilterMode;
  viewMode: ViewMode;
  onShipHover: (ship: ShipTrack | null) => void;
  onShipSelect: (ship: ShipTrack) => void;
}

function CameraRig({ viewMode }: { viewMode: ViewMode }) {
  const target = useMemo(() => {
    switch (viewMode) {
      case "maps":
        return new THREE.Vector3(0, 11.5, 0.1);
      case "ais":
        return new THREE.Vector3(7.6, 5.4, 7.2);
      case "ocean":
        return new THREE.Vector3(-7.5, 4.8, 7.8);
      case "control":
        return new THREE.Vector3(0, 4.2, 12.8);
      default:
        return new THREE.Vector3(0, 6.6, 8.6);
    }
  }, [viewMode]);

  useFrame(({ camera }) => {
    camera.position.lerp(target, 0.035);
    camera.lookAt(0, 0.4, 0);
  });

  return null;
}

function RadarDisc() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.z = state.clock.getElapsedTime() * 0.06;
  });

  return (
    <group position={[0, 0.02, 0]}>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[5.3, 96]} />
        <meshBasicMaterial color="#032D3D" transparent opacity={0.5} />
      </mesh>
      <mesh ref={meshRef} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.5, 5.3, 96]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
      {[1.2, 2.4, 3.6, 4.8].map((radius) => (
        <Line
          key={radius}
          points={Array.from({ length: 49 }, (_, index) => {
            const angle = (index / 48) * Math.PI * 2;
            return [Math.cos(angle) * radius, 0.03, Math.sin(angle) * radius] as [number, number, number];
          })}
          color="#00E5FF"
          transparent
          opacity={0.14}
          lineWidth={1}
        />
      ))}
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        return (
          <Line
            key={angle}
            points={[
              [0, 0.03, 0],
              [Math.cos(angle) * 5.3, 0.03, Math.sin(angle) * 5.3],
            ]}
            color="#00E5FF"
            transparent
            opacity={0.1}
            lineWidth={1}
          />
        );
      })}
    </group>
  );
}

function OceanSurface() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.03 - 0.18;
  });

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[0, -0.18, 0]}>
      <planeGeometry args={[18, 18, 36, 36]} />
      <meshStandardMaterial
        color="#0A1F2E"
        emissive="#06131D"
        metalness={0.8}
        roughness={0.35}
        transparent
        opacity={0.78}
      />
    </mesh>
  );
}

function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const coords = new Float32Array(450 * 3);
    for (let index = 0; index < 450; index += 1) {
      coords[index * 3] = (Math.random() - 0.5) * 15;
      coords[index * 3 + 1] = Math.random() * 6;
      coords[index * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return coords;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial transparent color="#7FEAFF" size={0.045} sizeAttenuation depthWrite={false} />
    </Points>
  );
}

function ShipMarker({
  ship,
  highlighted,
  onHover,
  onSelect,
}: {
  ship: ShipTrack;
  highlighted: boolean;
  onHover: (ship: ShipTrack | null) => void;
  onSelect: (ship: ShipTrack) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = 0.18 + Math.sin(state.clock.elapsedTime * 1.5 + ship.position[0]) * 0.04;
  });

  return (
    <group
      ref={groupRef}
      position={ship.position}
      onPointerEnter={() => onHover(ship)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onSelect(ship)}
    >
      <Line
        points={ship.route}
        color={ship.status === "Alerte" ? "#FF6B35" : "#00E5FF"}
        transparent
        opacity={highlighted ? 0.95 : 0.34}
        lineWidth={highlighted ? 2.2 : 1.2}
      />
      <mesh rotation={[0, THREE.MathUtils.degToRad(ship.heading), 0]}>
        <coneGeometry args={[0.12, 0.38, 6]} />
        <meshStandardMaterial
          color={ship.status === "Alerte" ? "#FF6B35" : highlighted ? "#00FF9F" : "#CBEFFF"}
          emissive={ship.status === "Alerte" ? "#FF6B35" : "#00E5FF"}
          emissiveIntensity={highlighted ? 2.5 : 1.4}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.12, 0]}>
        <ringGeometry args={[0.16, 0.24, 32]} />
        <meshBasicMaterial color={highlighted ? "#00FF9F" : "#00E5FF"} transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

function ConnectionMesh({ ships }: { ships: ShipTrack[] }) {
  const links = ships
    .slice(0, Math.max(0, ships.length - 1))
    .map((ship, index) => [ship, ships[index + 1]] as const)
    .filter((pair): pair is readonly [ShipTrack, ShipTrack] => Boolean(pair[0] && pair[1]));

  return (
    <>
      {links.map(([from, to]) => (
        <Line
          key={`${from.id}-${to.id}`}
          points={[from.position, to.position]}
          color="#00E5FF"
          transparent
          opacity={0.18}
          lineWidth={1}
          dashed
        />
      ))}
    </>
  );
}

function filterShips(ships: ShipTrack[], filterMode: FilterMode) {
  if (filterMode === "all") return ships;
  if (filterMode === "commercial") return ships.filter((ship) => ship.type === "Commercial");
  if (filterMode === "fishing") return ships.filter((ship) => ship.type === "Plaisance");
  if (filterMode === "sar") return ships.filter((ship) => ship.type === "Recherche & Sauvetage");
  return ships.filter((ship) => ship.status === "Alerte");
}

export function MaritimeScene({
  ships,
  highlightedTarget,
  filterMode,
  viewMode,
  onShipHover,
  onShipSelect,
}: MaritimeSceneProps) {
  const visibleShips = filterShips(ships, filterMode);

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true }} className="rounded-[32px]">
      <color attach="background" args={["#071019"]} />
      <fog attach="fog" args={["#071019", 8, 22]} />
      <PerspectiveCamera makeDefault position={[0, 6.6, 8.6]} fov={42} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 8, 6]} intensity={2.1} color="#7FEAFF" />
      <pointLight position={[-6, 3, -4]} intensity={1.4} color="#FF6B35" />
      <OrbitControls enablePan={false} maxDistance={16} minDistance={5.4} />
      <CameraRig viewMode={viewMode} />
      <OceanSurface />
      <RadarDisc />
      <FloatingParticles />
      <ConnectionMesh ships={visibleShips} />
      {visibleShips.map((ship) => (
        <ShipMarker
          key={ship.id}
          ship={ship}
          highlighted={highlightedTarget === ship.id || highlightedTarget === ship.name}
          onHover={onShipHover}
          onSelect={onShipSelect}
        />
      ))}
    </Canvas>
  );
}
