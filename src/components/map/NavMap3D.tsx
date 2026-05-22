import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, Text } from "@react-three/drei";
import { useNavStore } from "../../store/navigation";

function Vessel3D({
  heading,
  name,
  pos,
  speed,
}: {
  pos: [number, number, number];
  name: string;
  heading: number;
  speed: number;
}) {
  return (
    <group position={pos} rotation={[0, -heading * (Math.PI / 180), 0]}>
      <mesh>
        <coneGeometry args={[0.15, 0.6, 8]} />
        <meshStandardMaterial color={speed > 14 ? "#ef4444" : "#4ade80"} />
      </mesh>
      <Text position={[0, 0.5, 0]} fontSize={0.15} color="#22d3ee" anchorX="center" anchorY="middle">
        {name}
      </Text>
    </group>
  );
}

export default function NavMap3D() {
  const vesselMap = useNavStore((state) => state.vessels);
  const vessels = Array.from(vesselMap.values());

  const toXYZ = (lat: number, lon: number): [number, number, number] => [
    (lon - 166.4) * 50,
    0,
    (lat + 22.2) * -50,
  ];

  return (
    <div className="h-full w-full bg-abyss">
      <Canvas camera={{ position: [0, 40, 40], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />
        <Grid
          infiniteGrid
          sectionSize={5}
          fadeDistance={60}
          fadeStrength={5}
          cellColor="#0f172a"
          sectionColor="#22d3ee"
        />
        {vessels.map((vessel) => (
          <Vessel3D
            key={vessel.mmsi}
            pos={toXYZ(vessel.lat, vessel.lon)}
            name={vessel.name}
            heading={vessel.heading}
            speed={vessel.speed}
          />
        ))}
        <OrbitControls maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
    </div>
  );
}
