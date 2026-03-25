export function StatCard({ label, value, icon = "bi bi-stars" }) {
  return (
    <article className="stat-card">
      <div className="stat-icon" aria-hidden="true">
        <i className={icon} />
      </div>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
