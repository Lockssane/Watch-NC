import { monitorCards } from "../data/mockData";

export function FeatureGrid() {
  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-16 md:grid-cols-2 xl:grid-cols-4">
      {monitorCards.map((card) => (
        <article
          key={card.title}
          className="rounded-[28px] border border-white/8 bg-white/[0.03] p-6 shadow-glass backdrop-blur-xl"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-radar/70">Module</p>
          <h3 className="mt-4 text-xl font-medium text-white">{card.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">{card.copy}</p>
        </article>
      ))}
    </section>
  );
}
