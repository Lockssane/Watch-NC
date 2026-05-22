interface StatusPanelProps {
  localTime: string;
  activeTargets: number;
  environmentLabel: string;
}

export function StatusPanel({ localTime, activeTargets, environmentLabel }: StatusPanelProps) {
  const rows = [
    ["Statut systeme", "Operational"],
    ["Couverture radar", "92.4%"],
    ["Cibles actives", String(activeTargets)],
    ["Conditions meteo", environmentLabel],
    ["Heure locale", localTime],
  ];

  return (
    <aside className="pointer-events-auto w-full max-w-[280px] rounded-[26px] border border-radar/15 bg-slate-950/50 p-5 shadow-glass backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-radar/70">Table de quart</p>
          <h2 className="mt-2 text-sm font-medium text-white">Situation systeme</h2>
        </div>
        <span className="inline-flex h-3 w-3 rounded-full bg-phosphor shadow-[0_0_20px_rgba(0,255,159,0.6)]" />
      </div>

      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
            <p className="mt-2 text-sm text-slate-100">{value}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
