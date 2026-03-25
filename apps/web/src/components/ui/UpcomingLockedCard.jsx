import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge.jsx";

export function UpcomingLockedCard({ item }) {
  return (
    <article className="marketplace-card upcoming-card">
      <div className="marketplace-card-header">
        <div>
          <p className="eyebrow">Upcoming locked PDF</p>
          <h3>{item.title}</h3>
          <p className="support-copy">
            {item.taxonomy?.university} - {item.taxonomy?.branch} - {item.taxonomy?.semester}
          </p>
        </div>
        <div className="topbar-chip-group">
          <StatusBadge tone="warning">Locked</StatusBadge>
          {item.semesterMatch ? <StatusBadge tone="success">Current semester</StatusBadge> : null}
        </div>
      </div>

      <p className="support-copy">
        {item.summary || "Premium exam-focused content is being prepared for this academic category."}
      </p>

      <div className="marketplace-taxonomy">
        <span>{item.taxonomy?.year}</span>
        <span>{item.taxonomy?.semester}</span>
        <span>{item.taxonomy?.subject}</span>
      </div>

      <div className="document-meta-row">
        <span>{item.adminName || "ExamNova Admin"}</span>
        <span>
          {item.expectedReleaseAt
            ? `Expected ${new Date(item.expectedReleaseAt).toLocaleDateString()}`
            : "Coming soon"}
        </span>
      </div>

      <div className="hero-actions">
        <Link className="button secondary" to={`/upcoming/${item.slug}`}>
          <i className="bi bi-hourglass-split" />
          View locked detail
        </Link>
      </div>
    </article>
  );
}
