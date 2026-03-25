export function InfoGridCard({ title, items }) {
  return (
    <article className="detail-card">
      <p className="eyebrow">Snapshot</p>
      <h3>{title}</h3>
      <div className="info-grid">
        {items.map((item) => (
          <div key={item.label}>
            <span className="info-label">{item.label}</span>
            <strong>{item.value || "-"}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
