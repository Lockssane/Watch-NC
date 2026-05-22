import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface CommandPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function CommandPill({ active = false, className, ...props }: CommandPillProps) {
  return (
    <button
      className={clsx(
        "rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition",
        active
          ? "border-radar/60 bg-radar/15 text-white shadow-radar"
          : "border-white/10 bg-white/5 text-slate-300 hover:border-radar/40 hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
