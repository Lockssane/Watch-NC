import { useEffect, useRef } from "react";
import { useNavStore, type Vessel } from "../store/navigation";

const NAMES = [
  "PACIFIC STAR",
  "NICKEL TRADER",
  "CORAL QUEEN",
  "LAGOON EXPRESS",
  "KAWAI",
  "REEF PATROL",
  "DUMBEA",
  "TONTOUTA CARGO",
  "LIFOU LINK",
  "OUVEA SPIRIT",
  "NORD EXPRESS",
  "MINERAI BLEU",
];

export function useMockAIS() {
  const update = useNavStore((state) => state.updateVessel);
  const data = useRef<Map<number, Vessel>>(new Map());

  useEffect(() => {
    NAMES.forEach((name, index) => {
      const vessel: Vessel = {
        mmsi: 300000000 + index,
        name,
        lat: -22.2 + (Math.random() - 0.5) * 0.5,
        lon: 166.4 + (Math.random() - 0.5) * 0.5,
        heading: Math.random() * 360,
        speed: 5 + Math.random() * 10,
        status: "underway",
        lastUpdate: Date.now(),
      };

      data.current.set(vessel.mmsi, vessel);
      update(vessel);
    });

    const interval = window.setInterval(() => {
      data.current.forEach((vessel) => {
        const rad = vessel.heading * (Math.PI / 180);
        const latRad = vessel.lat * (Math.PI / 180);

        vessel.lat += Math.cos(rad) * 0.0002 * (vessel.speed / 10);
        vessel.lon += (Math.sin(rad) * 0.0002 * (vessel.speed / 10)) / Math.cos(latRad);
        vessel.heading = (vessel.heading + (Math.random() - 0.5) * 2 + 360) % 360;
        vessel.speed = Math.max(3, Math.min(18, vessel.speed + (Math.random() - 0.5)));
        update(vessel);
      });
    }, 2000);

    return () => window.clearInterval(interval);
  }, [update]);
}
