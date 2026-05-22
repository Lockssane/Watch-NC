import clsx from "clsx";
import type { ViewMode } from "../types";

interface ViewDockProps {
  mode: ViewMode;
  onSelect: (mode: ViewMode) => void;
  onSettings: () => void;
}

const items: Array<{ id: ViewMode; label: string; caption: string }> = [
  { id: "global", label: "Vue Globale", caption: "Theatre radar" },
  { id: "maps", label: "Cartes", caption: "Couloirs & zones" },
  { id: "ais", label: "AIS", caption: "Pistes & capteurs" },
  { id: "ocean", label: "Meteo", caption: "Mer & vent" },
  { id: "control", label: "Rapports", caption: "Console & briefs" },
];

export function ViewDock({ mode, onSelect, onSettings }: ViewDockProps) {
  return (
    <aside className="pointer-events-auto w-full max-w-[260px] rounded-[26px] border border-radar/15 bg-slate-950/50 p-4 shadow-glass backdrop-blur-xl">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-radar/70">Passerelle de vues</p>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={clsx(
              "w-full rounded-2xl border px-4 py-3 text-left transition",
              mode === item.id
                ? "border-radar/50 bg-radar/10 text-white shadow-radar"
                : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-radar/25 hover:text-white",
            )}
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em]">{item.label}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.caption}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-alert/15 bg-alert/5 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-alert/80">Alertes</p>
        <p className="mt-2 text-sm text-slate-200">1 piste SAR prioritaire maintenue en vigie.</p>
      </div>
      <button
        type="button"
        onClick={onSettings}
        className="mt-3 w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left text-slate-300 transition hover:border-radar/25 hover:text-white"
      >
        <p className="text-xs font-medium uppercase tracking-[0.16em]">Parametres</p>
        <p className="mt-1 text-[11px] text-slate-500">Calibration visuelle et couches tactiques</p>
      </button>
    </aside>
  );
}
