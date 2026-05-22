import { Activity, Anchor, Globe2, Map, Radio } from "lucide-react";
import { useNavStore } from "../../store/navigation";

export default function OpsBar() {
  const { vessels, viewMode, setViewMode } = useNavStore();
  const list = Array.from(vessels.values());
  const count = list.length;
  const avgSpeed = count ? (list.reduce((total, vessel) => total + vessel.speed, 0) / count).toFixed(1) : 0;

  return (
    <div className="relative z-50 flex h-14 select-none items-center justify-between border-b border-radar bg-navy px-4">
      <div className="flex items-center gap-3">
        <Radio className="h-5 w-5 animate-pulse text-alert" />
        <span className="font-mono text-lg font-bold tracking-wider text-phosphor">COSS WATCH NC</span>
        <span className="ml-2 rounded border border-ink/30 px-2 py-0.5 font-mono text-xs text-ink/60">
          LIVE • {new Date().toLocaleTimeString()}
        </span>
      </div>

      <div className="flex items-center gap-6 font-mono text-sm">
        <div className="flex items-center gap-2 text-ink">
          <Anchor className="h-4 w-4" /> Navires: <span className="text-radar">{count}</span>
        </div>
        <div className="flex items-center gap-2 text-ink">
          <Activity className="h-4 w-4" /> Vit. Moy: <span className="text-phosphor">{avgSpeed} kts</span>
        </div>
        <div className="mx-2 h-6 w-px bg-ink/30" />
        <div className="flex overflow-hidden rounded border border-radar/50 bg-abyss">
          <button
            type="button"
            aria-label="Afficher la carte 2D"
            onClick={() => setViewMode("2d")}
            className={`p-1.5 transition hover:bg-ink/20 ${viewMode === "2d" ? "bg-ink/10 text-phosphor" : "text-ink"}`}
          >
            <Map className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Afficher la carte 3D"
            onClick={() => setViewMode("3d")}
            className={`p-1.5 transition hover:bg-ink/20 ${viewMode === "3d" ? "bg-ink/10 text-phosphor" : "text-ink"}`}
          >
            <Globe2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
