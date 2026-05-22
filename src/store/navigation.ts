import { create } from "zustand";

export type VesselStatus = "underway" | "anchored" | "restricted" | "moored";

export interface Vessel {
  mmsi: number;
  name: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  status: VesselStatus;
  lastUpdate: number;
}

type NavStore = {
  vessels: Map<number, Vessel>;
  selectedMmsi: number | null;
  viewMode: "2d" | "3d";
  updateVessel: (vessel: Vessel) => void;
  selectVessel: (mmsi: number | null) => void;
  setViewMode: (mode: "2d" | "3d") => void;
};

export type NavigationView = "radar" | "map2d" | "map3d" | "ais" | "meteo" | "reports" | "settings";

interface NavigationState {
  activeView: NavigationView;
  activeHotspot: string;
  setActiveView: (view: NavigationView) => void;
  setActiveHotspot: (label: string) => void;
}

export const hotspotViewMap: Record<string, NavigationView> = {
  explore: "radar",
  chat: "ais",
  "view-global": "map3d",
  "view-maps": "map2d",
  "view-ais": "ais",
  "view-meteo": "meteo",
  "view-reports": "reports",
  "view-settings": "settings",
  "system-status": "radar",
  "map-card": "map2d",
};

export const useNavigationStore = create<NavigationState>((set) => ({
  activeView: "radar",
  activeHotspot: "Veille radar nominale",
  setActiveView: (view) => set({ activeView: view }),
  setActiveHotspot: (label) => set({ activeHotspot: label }),
}));

export const useNavStore = create<NavStore>((set) => ({
  vessels: new Map(),
  selectedMmsi: null,
  viewMode: "2d",
  updateVessel: (vessel) =>
    set((state) => {
      const next = new Map(state.vessels);
      next.set(vessel.mmsi, { ...vessel, lastUpdate: Date.now() });
      return { vessels: next };
    }),
  selectVessel: (mmsi) => set({ selectedMmsi: mmsi }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
