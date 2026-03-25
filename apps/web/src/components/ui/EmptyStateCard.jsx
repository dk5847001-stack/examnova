export function EmptyStateCard({ title, description, action = null }) {
  return (
    <article className="empty-state-card">
      <div className="empty-state-visual" aria-hidden="true">
        <i className="bi bi-stars" />
      </div>
      <p className="eyebrow">Awaiting signal</p>
      <h3>{title}</h3>
      <p className="support-copy">{description}</p>
      {action ? <div className="hero-actions">{action}</div> : null}
    </article>
  );
}
