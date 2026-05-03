import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CardPlaceholderGrid } from "../../components/ui/CardPlaceholderGrid.jsx";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { listGenerations } from "../../services/api/index.js";

export function GeneratedPdfsPage() {
  const { accessToken } = useAuth();
  const [generations, setGenerations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadGenerations() {
      setIsLoading(true);
      try {
        const response = await listGenerations(accessToken);
        if (active) {
          setGenerations(response.data.generations);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load generated answer sets.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (accessToken) {
      loadGenerations();
    }

    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <section className="stack-section">
      <SectionHeader
        eyebrow="Generated"
        title="Generated answer drafts"
        description="Review your generated answer sets, render the final PDF, and unlock private downloads securely for Rs. 4."
      />
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? (
        <CardPlaceholderGrid
          ariaLabel="Loading generated PDF cards"
          className="document-grid pdf-card-grid"
          count={6}
          variant="library"
        />
      ) : generations.length ? (
        <div className="document-grid">
          {generations.map((generation) => (
            <article className="document-card" key={generation.id}>
              <div className="document-card-header">
                <div>
                  <h3>{generation.title}</h3>
                  <p className="support-copy">
                    {generation.answerItems?.length || 0} answers - {new Date(generation.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="topbar-chip-group">
                  <StatusBadge
                    tone={
                      generation.generationStatus === "completed"
                        ? "success"
                        : generation.generationStatus === "failed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    Answers: {generation.generationStatus}
                  </StatusBadge>
                  <StatusBadge
                    tone={
                      generation.pdfGenerationStatus === "completed"
                        ? "success"
                        : generation.pdfGenerationStatus === "failed"
                          ? "danger"
                          : generation.pdfGenerationStatus === "processing"
                            ? "warning"
                            : "neutral"
                    }
                  >
                    PDF: {generation.pdfGenerationStatus}
                  </StatusBadge>
                </div>
              </div>
              <p className="support-copy">
                {generation.generationPrompt || "No prompt refinement used for this answer set."}
              </p>
              <div className="document-meta-row">
                <span>{generation.pageCount ? `${generation.pageCount} pages` : "PDF not rendered yet"}</span>
                <span>{generation.downloadUnlocked || generation.isPaid ? "Unlocked" : "Locked until payment"}</span>
              </div>
              <div className="hero-actions">
                <Link className="button secondary" to={`/app/generated-pdfs/${generation.id}`}>
                  {generation.downloadUnlocked || generation.isPaid ? "Open and download" : "Open and unlock"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title="No generated answer sets yet"
          description="Detect questions from an uploaded document, generate compact answers, and render your first final PDF."
        />
      )}
    </section>
  );
}
