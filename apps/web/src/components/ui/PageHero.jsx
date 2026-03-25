const defaultMetrics = [
  { label: "Workflow", value: "AI Orchestrated" },
  { label: "Output", value: "Premium PDF" },
  { label: "State", value: "Realtime Ready" },
];

export function PageHero({ eyebrow, title, description, actions = null, metrics = defaultMetrics }) {
  return (
    <section className="hero-card">
      <div className="hero-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p className="support-copy">{description}</p>
        {actions ? <div className="hero-actions d-flex flex-wrap align-items-center">{actions}</div> : null}
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="hero-orbit">
          <span className="hero-orbit-ring" />
          <div className="hero-orbit-core">
            <i className="bi bi-stars" />
          </div>
        </div>
        <div className="hero-stat-stack">
          {metrics.map((metric) => (
            <div className="hero-stat" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
