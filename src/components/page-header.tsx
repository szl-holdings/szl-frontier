import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-subtle">{kicker}</div>
        <h1 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
