import { StatusBadge } from "./StatusBadge.jsx";

export function GeneratedPdfResultCard({
  generation,
  isRendering,
  isPaying,
  onRender,
  onDownload,
  onUnlock,
}) {
  const pdfReady = generation?.pdfGenerationStatus === "completed";
  const locked = !generation?.downloadUnlocked && !generation?.isPaid;

  return (
    <article className="detail-card pdf-result-card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Final PDF</p>
          <h3>Compact exam-note render</h3>
          <p className="support-copy">
            Question text is rendered in bold 6pt, answers in 6pt, with compact spacing and mini-figures only where the answer plan requires them.
          </p>
        </div>
        <div className="topbar-chip-group">
          <StatusBadge
            tone={
              generation?.pdfGenerationStatus === "completed"
                ? "success"
                : generation?.pdfGenerationStatus === "failed"
                  ? "danger"
                  : generation?.pdfGenerationStatus === "processing"
                    ? "warning"
                    : "neutral"
            }
          >
            {generation?.pdfGenerationStatus || "idle"}
          </StatusBadge>
          <StatusBadge tone={locked ? "warning" : "success"}>
            {locked ? "Download locked" : "Download unlocked"}
          </StatusBadge>
        </div>
      </div>

      <div className="info-grid">
        <div>
          <span className="info-label">Pages</span>
          <strong>{generation?.pageCount || 0}</strong>
        </div>
        <div>
          <span className="info-label">Render version</span>
          <strong>{generation?.renderVersion || "compact-v1"}</strong>
        </div>
        <div>
          <span className="info-label">Price to unlock</span>
          <strong>Rs. {generation?.priceInr || 4}</strong>
        </div>
        <div>
          <span className="info-label">Mini-figures planned</span>
          <strong>{generation?.generationSummary?.figurePlannedCount || 0}</strong>
        </div>
      </div>

      {generation?.pdfFailureReason ? <p className="form-error">{generation.pdfFailureReason}</p> : null}

      <div className="hero-actions">
        <button className="button primary" disabled={isRendering} onClick={onRender} type="button">
          <i className="bi bi-file-earmark-richtext" />
          {isRendering
            ? "Generating final PDF..."
            : pdfReady
              ? "Regenerate final PDF"
              : "Generate final PDF"}
        </button>
        <button
          className="button secondary"
          disabled={!pdfReady || !locked || isPaying}
          onClick={onUnlock}
          type="button"
        >
          <i className="bi bi-unlock" />
          {isPaying ? "Opening checkout..." : "Unlock for Rs. 4"}
        </button>
        <button
          className="button ghost"
          disabled={!pdfReady || locked}
          onClick={onDownload}
          type="button"
        >
          <i className="bi bi-download" />
          {locked ? "Unlock required" : "Download PDF"}
        </button>
      </div>

      <p className="support-copy">
        {pdfReady
          ? locked
            ? "Your final PDF is ready and stored. Complete the secure Rs. 4 unlock payment to activate download."
            : "Your final PDF is ready to download."
          : "Generate the final PDF after reviewing answers to create the dense exam-ready layout."}
      </p>
    </article>
  );
}
