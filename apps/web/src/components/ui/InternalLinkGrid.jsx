import { Link } from "react-router-dom";

export function InternalLinkGrid({ title, links = [] }) {
  if (!links.length) {
    return null;
  }

  return (
    <article className="detail-card">
      <p className="eyebrow">Discovery path</p>
      <h3>{title}</h3>
      <div className="marketplace-taxonomy">
        {links.map((item) => (
          <Link className="inline-link-chip" key={item.href} to={item.href}>
            <i className="bi bi-arrow-up-right" />
            {item.text || item.label}
          </Link>
        ))}
      </div>
    </article>
  );
}
