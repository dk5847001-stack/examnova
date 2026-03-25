import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { getDocument, retryParsing } from "../../services/api/index.js";

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

export function DocumentDetailPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDocument() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getDocument(accessToken, id);
        if (active) {
          setDocument(response.data.document);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load document details.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (accessToken && id) {
      loadDocument();
    }

    return () => {
      active = false;
    };
  }, [accessToken, id]);

  async function handleRetry() {
    setFeedback("");
    setError("");
    try {
      const response = await retryParsing(accessToken, id);
      setDocument(response.data.document);
      setFeedback("Parsing retried successfully.");
    } catch (requestError) {
      setError(requestError.message || "Unable to retry parsing.");
    }
  }

  if (isLoading) {
    return <LoadingCard message="Loading document details..." />;
  }

  if (!document) {
    return <p className="form-error">{error || "Document not found."}</p>;
  }

  return (
    <section className="stack-section">
      <SectionHeader
        eyebrow="Document detail"
        title={document.documentTitle || document.originalName}
        description="Review parsing status, academic context, and extracted content before moving into question detection and answer generation."
        action={<StatusBadge tone={getTone(document.parsingStatus)}>{document.parsingStatus}</StatusBadge>}
      />
      {error ? <p className="form-error">{error}</p> : null}
      {feedback ? <p className="form-success">{feedback}</p> : null}
      <div className="two-column-grid">
        <article className="detail-card">
          <h3>Metadata</h3>
          <div className="info-grid">
            <div>
              <span className="info-label">Original name</span>
              <strong>{document.originalName}</strong>
            </div>
            <div>
              <span className="info-label">File type</span>
              <strong>{document.mimeType}</strong>
            </div>
            <div>
              <span className="info-label">Size</span>
              <strong>{Math.ceil((document.sizeInBytes || 0) / 1024)} KB</strong>
            </div>
            <div>
              <span className="info-label">Source category</span>
              <strong>{document.sourceCategory}</strong>
            </div>
            <div>
              <span className="info-label">University</span>
              <strong>{document.academicTaxonomy?.university || "-"}</strong>
            </div>
            <div>
              <span className="info-label">Branch</span>
              <strong>{document.academicTaxonomy?.branch || "-"}</strong>
            </div>
            <div>
              <span className="info-label">Year</span>
              <strong>{document.academicTaxonomy?.year || "-"}</strong>
            </div>
            <div>
              <span className="info-label">Semester</span>
              <strong>{document.academicTaxonomy?.semester ? `Semester ${document.academicTaxonomy.semester}` : "-"}</strong>
            </div>
            <div>
              <span className="info-label">Subject</span>
              <strong>{document.academicTaxonomy?.subject || "-"}</strong>
            </div>
          </div>
          <div className="hero-actions">
            <button className="button secondary" onClick={handleRetry} type="button">
              Retry parsing
            </button>
            <Link className="button secondary" to={`/app/documents/${document.id}/questions`}>
              Detect questions
            </Link>
            <Link className="button secondary" to={`/app/documents/${document.id}/answers`}>
              Generate answers
            </Link>
            <Link className="button ghost" to="/app/upload-generate">
              Back to uploads
            </Link>
          </div>
        </article>
        <article className="detail-card">
          <h3>Parsed summary</h3>
          <div className="info-grid">
            <div>
              <span className="info-label">Word count</span>
              <strong>{document.parsedMetadata?.wordCount ?? 0}</strong>
            </div>
            <div>
              <span className="info-label">Character count</span>
              <strong>{document.parsedMetadata?.characterCount ?? 0}</strong>
            </div>
            <div>
              <span className="info-label">Page count</span>
              <strong>{document.parsedMetadata?.pageCount ?? 0}</strong>
            </div>
            <div>
              <span className="info-label">Last parsed</span>
              <strong>{document.lastParsedAt ? new Date(document.lastParsedAt).toLocaleString() : "-"}</strong>
            </div>
            <div>
              <span className="info-label">Exam focus</span>
              <strong>{document.studyMetadata?.examFocus || "-"}</strong>
            </div>
            <div>
              <span className="info-label">Question type</span>
              <strong>{document.studyMetadata?.questionType || "-"}</strong>
            </div>
            <div>
              <span className="info-label">Difficulty</span>
              <strong>{document.studyMetadata?.difficultyLevel || "-"}</strong>
            </div>
            <div>
              <span className="info-label">Audience</span>
              <strong>{document.studyMetadata?.intendedAudience || "-"}</strong>
            </div>
          </div>
          {document.parsingError ? <p className="form-error">{document.parsingError}</p> : null}
        </article>
      </div>
      <article className="detail-card">
        <h3>Extracted text preview</h3>
        <pre className="text-preview">{document.extractedTextPreview || document.normalizedText || document.extractedText || "No parsed text available."}</pre>
      </article>
      <article className="detail-card">
        <h3>Next step</h3>
        <p className="support-copy">
          This document is now ready to feed into the next phase, where we will detect questions, review them, and prepare AI-generated answers.
        </p>
      </article>
    </section>
  );
}
