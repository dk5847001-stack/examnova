export function FinanceStatCard({ label, value, description, icon = "bi bi-wallet2" }) {
  return (
    <article className="detail-card finance-stat-card">
      <div className="metric-icon" aria-hidden="true">
        <i className={icon} />
      </div>
      <span className="info-label">{label}</span>
      <strong>{value}</strong>
      {description ? <p className="support-copy">{description}</p> : null}
    </article>
  );
}
