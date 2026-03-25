import { StatusBadge } from "./StatusBadge.jsx";

export function QuestionReviewCard({ question, onToggle }) {
  return (
    <article className={`question-card ${question.selectedForGeneration ? "selected" : ""}`}>
      <div className="question-card-header">
        <label className="question-select">
          <input
            checked={question.selectedForGeneration}
            onChange={() => onToggle(question)}
            type="checkbox"
          />
          <strong>{question.questionNumber || "Detected question"}</strong>
        </label>
        <div className="topbar-chip-group">
          <StatusBadge tone={question.importanceFlag === "high" ? "warning" : "neutral"}>
            {question.importanceFlag}
          </StatusBadge>
          <StatusBadge tone="success">{question.inferredQuestionType}</StatusBadge>
        </div>
      </div>
      <p className="support-copy">{question.questionText}</p>
      <div className="document-meta-row">
        <span>{question.inferredUnit || "No unit inferred"}</span>
        <span>{question.inferredTopic || "Topic pending"}</span>
        <span>Confidence {Math.round((question.confidenceScore || 0) * 100)}%</span>
      </div>
    </article>
  );
}
