import clsx from "clsx";
import type { Ping, PresenceCursor, ShipTrack, ViewMode } from "../types";
import { CommandPill } from "./CommandPill";

interface SceneOverlayProps {
  viewMode: ViewMode;
  onSelectView: (mode: ViewMode) => void;
  pings: Ping[];
  others: PresenceCursor[];
  highlightedTarget: string | null;
  selectedShip: ShipTrack | null;
}

const viewPills: Array<{ id: ViewMode; label: string }> = [
  { id: "global", label: "Radar" },
  { id: "maps", label: "Carte" },
  { id: "ocean", label: "Vue 3D Ocean" },
  { id: "control", label: "Salle de controle" },
  { id: "ais", label: "AIS" },
];

export function SceneOverlay({
  viewMode,
  onSelectView,
  pings,
  others,
  highlightedTarget,
  selectedShip,
}: SceneOverlayProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
        <div className="absolute inset-0 bg-radar-grid bg-[length:90px_90px] opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-radar/60 to-transparent" />

        {pings.map((ping) => (
          <span
            key={ping.id}
            className="absolute h-5 w-5 animate-pulseRing rounded-full border border-radar/60 bg-radar/10"
            style={{ left: ping.x - 10, top: ping.y - 10 }}
          />
        ))}

        {others.map((operator) => (
          <div
            key={operator.id}
            className="absolute"
            style={{ left: operator.x, top: operator.y, color: operator.color }}
          >
            <div className="absolute -left-16 top-0 h-px w-16 bg-current opacity-40" />
            <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
            <span className="absolute left-3 -top-2 rounded-full border border-current/30 bg-black/40 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-white">
              {operator.label}
            </span>
          </div>
        ))}
      </div>

      <div className="absolute left-5 right-5 top-5 flex flex-wrap gap-2">
        {viewPills.map((view) => (
          <CommandPill
            key={view.id}
            active={viewMode === view.id}
            onClick={() => onSelectView(view.id)}
          >
            {view.label}
          </CommandPill>
        ))}
      </div>

      <div className="absolute left-5 top-24 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-slate-300 backdrop-blur-xl">
        {highlightedTarget ? `Cible suivie: ${highlightedTarget}` : "Theatre en veille nominale"}
      </div>

      <div
        className={clsx(
          "absolute bottom-5 left-5 max-w-[300px] rounded-[24px] border bg-black/40 px-5 py-4 backdrop-blur-xl transition",
          selectedShip ? "border-radar/20 opacity-100" : "border-white/8 opacity-80",
        )}
      >
        <p className="text-[10px] uppercase tracking-[0.22em] text-radar/70">Piste sous curseur</p>
        {selectedShip ? (
          <>
            <h3 className="mt-2 text-base font-medium text-white">{selectedShip.name}</h3>
            <p className="mt-2 text-sm text-slate-300">
              {selectedShip.type} • {selectedShip.status}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Cap {selectedShip.heading}° • {selectedShip.speed} nd • {selectedShip.zone}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            Survolez un navire pour lire sa route, sa vitesse et sa priorite de veille.
          </p>
        )}
      </div>
    </>
  );
}
