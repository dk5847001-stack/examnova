import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { DocumentCard } from "../../components/ui/DocumentCard.jsx";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { archiveDocument, listDocuments, retryParsing, uploadDocument } from "../../services/api/index.js";

export function UploadGeneratePage() {
  const { accessToken } = useAuth();
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceCategory, setSourceCategory] = useState("notes");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const supportedTypes = ["PDF", "DOCX", "TXT"];

  useEffect(() => {
    let active = true;

    async function loadDocuments() {
      setIsLoading(true);
      try {
        const response = await listDocuments(accessToken);
        if (active) {
          setDocuments(response.data.documents);
        }
      } catch (error) {
        if (active) {
          setFeedback({ type: "error", message: error.message || "Unable to load uploaded documents." });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (accessToken) {
      loadDocuments();
    }

    return () => {
      active = false;
    };
  }, [accessToken]);

  async function handleUpload(event) {
    event.preventDefault();

    if (!selectedFile) {
      setFeedback({ type: "error", message: "Please select a document to upload." });
      return;
    }

    setFeedback({ type: "", message: "" });
    setIsUploading(true);

    try {
      const response = await uploadDocument(accessToken, {
        file: selectedFile,
        sourceCategory,
      });
      setDocuments((current) => [response.data.document, ...current]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setFeedback({ type: "success", message: "Document uploaded and parsing completed." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Upload failed." });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(documentId) {
    try {
      await archiveDocument(accessToken, documentId);
      setDocuments((current) => current.filter((document) => document.id !== documentId));
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to archive document." });
    }
  }

  async function handleRetry(documentId) {
    try {
      const response = await retryParsing(accessToken, documentId);
      setDocuments((current) =>
        current.map((document) => (document.id === documentId ? response.data.document : document)),
      );
      setFeedback({ type: "success", message: "Parsing retried successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to retry parsing." });
    }
  }

  return (
    <section className="stack-section">
      <PageHero
        eyebrow="Upload and generate"
        title="Turn raw study material into AI-ready parsed documents."
        description="Upload question banks, notes, assignments, and study material. ExamNova AI validates, stores, and parses the content so the next phase can detect questions cleanly."
        metrics={[
          { label: "Formats", value: supportedTypes.join(" / ") },
          { label: "Pipeline", value: "Validated" },
          { label: "Output", value: "Question Ready" },
        ]}
        actions={
          <>
            <button className="button primary" onClick={() => fileInputRef.current?.click()} type="button">
              <i className="bi bi-cloud-arrow-up" />
              Choose document
            </button>
            <Link className="button secondary" to="/app/generated-pdfs">
              <i className="bi bi-file-earmark-pdf" />
              View generated PDFs
            </Link>
          </>
        }
      />

      <div className="two-column-grid">
        <form className="detail-card upload-form" onSubmit={handleUpload}>
          <SectionHeader
            eyebrow="Upload"
            title="Secure upload pipeline"
            description={`Supported file types: ${supportedTypes.join(", ")}. File validation and parsing happen on the backend.`}
          />
          <label className="upload-dropzone">
            <input
              className="hidden-input"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
            />
            <strong>{selectedFile ? selectedFile.name : "Drag or choose a document"}</strong>
            <span className="support-copy">
              PDFs, DOCX files, and text documents are supported. Parsing status will be tracked after upload.
            </span>
          </label>
          <label className="field">
            <span>Document category</span>
            <select
              className="input"
              onChange={(event) => setSourceCategory(event.target.value)}
              value={sourceCategory}
            >
              <option value="notes">Notes</option>
              <option value="assignment">Assignment</option>
              <option value="question_bank">Question bank</option>
              <option value="study_material">Study material</option>
            </select>
          </label>
          {feedback.message ? (
            <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
          ) : null}
          <button className="button primary" disabled={isUploading} type="submit">
            {isUploading ? "Uploading and parsing..." : "Upload document"}
          </button>
        </form>

        <article className="detail-card">
          <SectionHeader
            eyebrow="Pipeline"
            title="What happens after upload"
            description="The upload system is built to support the next AI phases without changing the document contract."
          />
          <div className="activity-list">
            <article className="activity-item">
              <strong>1. Validation</strong>
              <span className="support-copy">Server-side type checks, size limits, and secure file handling.</span>
            </article>
            <article className="activity-item">
              <strong>2. Storage</strong>
              <span className="support-copy">Document metadata and storage keys are linked to your account.</span>
            </article>
            <article className="activity-item">
              <strong>3. Parsing</strong>
              <span className="support-copy">Text extraction runs for PDF, DOCX, and TXT so the AI pipeline can consume normalized content later.</span>
            </article>
          </div>
        </article>
      </div>

      <section className="stack-section">
        <SectionHeader
          eyebrow="Library"
          title="Uploaded documents"
          description="Monitor parsing status, inspect extracted content, and prepare for question detection."
        />
        {isLoading ? (
          <LoadingCard message="Loading uploaded documents..." />
        ) : documents.length ? (
          <div className="document-grid">
            {documents.map((document) => (
              <DocumentCard
                document={document}
                key={document.id}
                onDelete={handleDelete}
                onRetry={handleRetry}
              />
            ))}
          </div>
        ) : (
          <EmptyStateCard
            title="No uploads yet"
            description="Upload your first study document to start building an AI-ready document library."
          />
        )}
      </section>
    </section>
  );
}
