export function AdminMetricCard({ label, value, description, icon = "bi bi-bar-chart-fill" }) {
  return (
    <article className="detail-card admin-metric-card">
      <div className="metric-icon" aria-hidden="true">
        <i className={icon} />
      </div>
      <span className="info-label metric-label">{label}</span>
      <strong>{value}</strong>
      {description ? <p className="support-copy">{description}</p> : null}
    </article>
  );
}
