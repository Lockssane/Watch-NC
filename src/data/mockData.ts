import type { ShipTrack } from "../types";

export const shipTracks: ShipTrack[] = [
  {
    id: "sentinel-01",
    name: "Sentinel 01",
    type: "Patrouille",
    status: "Nominal",
    heading: 42,
    speed: 18.4,
    zone: "Outer Approaches",
    position: [-2.8, 0.2, -1.8],
    route: [
      [-3.8, 0.2, -2.8],
      [-3.1, 0.2, -2.2],
      [-2.8, 0.2, -1.8],
      [-2.1, 0.2, -1.2],
      [-1.4, 0.2, -0.8],
    ],
  },
  {
    id: "marlin-07",
    name: "Marlin 07",
    type: "Commercial",
    status: "Surveille",
    heading: 78,
    speed: 12.7,
    zone: "Northern Lane",
    position: [2.4, 0.2, -0.9],
    route: [
      [1.2, 0.2, -1.9],
      [1.8, 0.2, -1.4],
      [2.4, 0.2, -0.9],
      [3.1, 0.2, -0.1],
      [3.8, 0.2, 0.8],
    ],
  },
  {
    id: "aurora-sar",
    name: "Aurora SAR",
    type: "Recherche & Sauvetage",
    status: "Alerte",
    heading: 135,
    speed: 22.3,
    zone: "Rescue Sector",
    position: [0.8, 0.2, 2.6],
    route: [
      [2.1, 0.2, 1.4],
      [1.6, 0.2, 1.9],
      [1.1, 0.2, 2.2],
      [0.8, 0.2, 2.6],
      [0.1, 0.2, 3.1],
    ],
  },
  {
    id: "lagoon-echo",
    name: "Lagoon Echo",
    type: "Plaisance",
    status: "Nominal",
    heading: 312,
    speed: 8.6,
    zone: "Lagoon Passage",
    position: [-1.1, 0.2, 1.4],
    route: [
      [-0.1, 0.2, 2.6],
      [-0.6, 0.2, 2.1],
      [-0.9, 0.2, 1.8],
      [-1.1, 0.2, 1.4],
      [-1.6, 0.2, 0.8],
    ],
  },
];

export const rightDockModes = [
  { id: "global", label: "Vue Globale" },
  { id: "maps", label: "Cartes" },
  { id: "ais", label: "AIS" },
  { id: "ocean", label: "Meteo" },
  { id: "control", label: "Rapports" },
  { id: "settings", label: "Parametres" },
] as const;

export const monitorCards = [
  {
    title: "Surveillance du trafic",
    copy: "Lecture dense des routes, vitesses et anomalies de cap dans la zone de responsabilite.",
  },
  {
    title: "Detection de deviation",
    copy: "Signalement des derives, coupures AIS et comportements hors corridor en temps reel.",
  },
  {
    title: "Search & Rescue",
    copy: "Mise au point rapide des secteurs SAR, priorisation des cibles et demonstration de coordination.",
  },
  {
    title: "Analyse environnementale",
    copy: "Vent, etat de mer, couverture radar et meteo locale consolides dans la meme vigie.",
  },
];
