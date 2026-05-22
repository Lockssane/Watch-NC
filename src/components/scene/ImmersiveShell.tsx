import type { PropsWithChildren } from "react";
import type { NavigationView } from "../../store/navigation";
import type { Ping, PresenceCursor } from "../../types";

export interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImmersiveShellProps extends PropsWithChildren {
  activeHotspot: string;
  activeTargets: number;
  activeView: NavigationView;
  hotspots: Hotspot[];
  others: PresenceCursor[];
  pings: Ping[];
  onHotspot: (hotspot: Hotspot) => void;
  onHotspotPreview: (label: string) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
}

const viewLabels: Record<NavigationView, string> = {
  radar: "Radar",
  map2d: "Carte 2D",
  map3d: "Vue 3D",
  ais: "AIS",
  meteo: "Meteo",
  reports: "Rapports",
  settings: "Parametres",
};

export function ImmersiveShell({
  activeHotspot,
  activeTargets,
  activeView,
  children,
  hotspots,
  others,
  pings,
  onHotspot,
  onHotspotPreview,
  onPointerMove,
}: ImmersiveShellProps) {
  return (
    <div
      aria-label="COSS WATCH NC - maquette immersive de centre de surveillance maritime"
      className="relative aspect-[1680/945] w-full max-w-[1680px] overflow-hidden bg-black shadow-[0_40px_120px_rgba(0,0,0,0.6)] md:rounded-[24px]"
      onPointerMove={onPointerMove}
    >
      <img
        src="/coss-reference.png"
        alt="Maquette de reference COSS WATCH NC"
        className="absolute inset-0 h-full w-full select-none object-cover"
        draggable={false}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(2,6,12,0.18)_74%,rgba(2,6,12,0.4)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,12,20,0.06),rgba(0,0,0,0.0)_35%,rgba(0,0,0,0.12)_100%)]" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[16%] top-[4%] h-[30%] w-[8%] bg-[radial-gradient(circle,rgba(149,209,255,0.12),transparent_68%)] blur-2xl" />
        <div className="absolute right-[15%] top-[6%] h-[34%] w-[8%] bg-[radial-gradient(circle,rgba(149,209,255,0.12),transparent_68%)] blur-2xl" />
        <div className="absolute inset-x-[28%] top-[42%] h-[24%] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.15),transparent_60%)] blur-3xl" />
      </div>

      <div className="pointer-events-none absolute bottom-[4.8%] right-[1.4%] h-[30.5%] w-[31.8%] overflow-hidden">
        <div
          className="absolute inset-0 scale-[1.18]"
          style={{
            backgroundImage: "url('/coss-reference.png')",
            backgroundPosition: "78.5% 56%",
            backgroundSize: "cover",
            filter: "brightness(0.72) saturate(0.9)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_22%,rgba(0,229,255,0.08),transparent_28%),linear-gradient(180deg,rgba(2,7,14,0.1),rgba(2,7,14,0.22)_46%,rgba(2,7,14,0.36)_100%)]" />
        <div className="absolute -inset-3 bg-[radial-gradient(circle_at_center,transparent_62%,rgba(2,6,12,0.44)_100%)] blur-xl" />
      </div>

      {children}

      <div className="pointer-events-none absolute left-[50%] top-[93.2%] flex -translate-x-1/2 items-center gap-3 rounded-full border border-cyan-400/15 bg-slate-950/35 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-cyan-200/80 backdrop-blur-md">
        <span>{activeHotspot}</span>
        <span className="h-1 w-1 rounded-full bg-cyan-300/70" />
        <span>{viewLabels[activeView]}</span>
        <span className="h-1 w-1 rounded-full bg-cyan-300/70" />
        <span>{activeTargets} cibles</span>
      </div>

      <div className="pointer-events-none absolute inset-0">
        {pings.map((ping) => (
          <span
            key={ping.id}
            className="absolute h-5 w-5 animate-pulseRing rounded-full border border-cyan-300/70 bg-cyan-300/10 shadow-[0_0_30px_rgba(0,229,255,0.35)]"
            style={{
              left: `calc(${ping.x}% - 10px)`,
              top: `calc(${ping.y}% - 10px)`,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0">
        {others.map((operator) => (
          <div
            key={operator.id}
            className="absolute"
            style={{ color: operator.color, left: `${operator.x}%`, top: `${operator.y}%` }}
          >
            <div className="absolute -left-12 top-0 h-px w-12 bg-current opacity-35" />
            <span className="absolute -left-[5px] -top-[5px] h-[10px] w-[10px] rounded-full bg-current shadow-[0_0_18px_currentColor]" />
            <span className="absolute left-3 -top-2 rounded-full border border-white/12 bg-black/45 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
              {operator.label}
            </span>
          </div>
        ))}
      </div>

      <div className="absolute inset-0">
        {hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            aria-label={hotspot.label}
            title={hotspot.label}
            onClick={() => onHotspot(hotspot)}
            onMouseEnter={() => onHotspotPreview(hotspot.label)}
            className="absolute rounded-[18px] border border-transparent bg-transparent transition duration-200 hover:border-cyan-300/28 hover:bg-cyan-300/[0.03] hover:shadow-[0_0_25px_rgba(0,229,255,0.12)] focus:border-cyan-300/32 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
            style={{
              height: `${hotspot.height}%`,
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              width: `${hotspot.width}%`,
            }}
          >
            <span className="sr-only">{hotspot.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
