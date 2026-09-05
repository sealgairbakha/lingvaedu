import type { ReactNode } from "react";

export function PageState({ title, description, loading = false, action }: {
  title: string;
  description?: string;
  loading?: boolean;
  action?: ReactNode;
}) {
  return <section className={`pageState ${loading ? "pageStateLoading" : ""}`} role={loading ? "status" : "region"} aria-label={title} aria-busy={loading}>
    <span className="pageStateIcon" aria-hidden="true">{loading ? <i /> : <svg viewBox="0 0 24 24"><path d="M12 8v5m0 3h.01M10.3 4.9 2.9 18a1.4 1.4 0 0 0 1.2 2h15.8a1.4 1.4 0 0 0 1.2-2L13.7 4.9a2 2 0 0 0-3.4 0Z" /></svg>}</span>
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    {action && <div className="pageStateActions">{action}</div>}
  </section>;
}
