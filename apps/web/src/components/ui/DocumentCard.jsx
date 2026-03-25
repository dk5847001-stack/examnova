import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge.jsx";

function getTone(parsingStatus) {
  if (parsingStatus === "completed") {
    return "success";
  }
  if (parsingStatus === "failed") {
    return "danger";
  }
  if (parsingStatus === "processing" || parsingStatus === "pending") {
    return "warning";
  }
  return "neutral";
}

export function DocumentCard({ document, onDelete, onRetry }) {
  const academicTaxonomy = document.academicTaxonomy || {};
  const studyMetadata = document.studyMetadata || {};

  return (
    <article className="document-card">
      <div className="document-card-header">
        <div>
          <p className="eyebrow">{academicTaxonomy.subject || document.sourceCategory || "Study material"}</p>
          <h3>{document.documentTitle || document.originalName}</h3>
          <p className="support-copy">
            {document.mimeType} - {new Date(document.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge tone={getTone(document.parsingStatus)}>{document.parsingStatus}</StatusBadge>
      </div>
      <p className="support-copy">{document.extractedTextPreview || "No extracted text preview available yet."}</p>
      <div className="marketplace-taxonomy">
        {academicTaxonomy.branch ? <span>{academicTaxonomy.branch}</span> : null}
        {academicTaxonomy.year ? <span>{academicTaxonomy.year}</span> : null}
        {academicTaxonomy.semester ? <span>Semester {academicTaxonomy.semester}</span> : null}
        {studyMetadata.examFocus ? <span>{studyMetadata.examFocus}</span> : null}
      </div>
      <div className="document-meta-row">
        <span>{Math.ceil((document.sizeInBytes || 0) / 1024)} KB</span>
        <span>{academicTaxonomy.university || document.sourceCategory}</span>
      </div>
      <div className="hero-actions">
        <Link className="button secondary" to={`/app/documents/${document.id}`}>
          <i className="bi bi-eye" />
          View details
        </Link>
        <Link className="button secondary" to={`/app/documents/${document.id}/questions`}>
          <i className="bi bi-search" />
          Detect questions
        </Link>
        <button className="button ghost" onClick={() => onRetry(document.id)} type="button">
          <i className="bi bi-arrow-clockwise" />
          Retry parsing
        </button>
        <button className="button ghost danger" onClick={() => onDelete(document.id)} type="button">
          <i className="bi bi-archive" />
          Archive
        </button>
      </div>
    </article>
  );
}
