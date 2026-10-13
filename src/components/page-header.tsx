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
    <header className="frontier-page-header">
      <div className="frontier-page-intro">
        <div className="frontier-kicker">{kicker}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="frontier-page-actions">{action}</div> : null}
    </header>
  );
}
