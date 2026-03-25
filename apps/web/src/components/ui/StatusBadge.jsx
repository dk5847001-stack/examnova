export function StatusBadge({ children, tone = "neutral" }) {
  const icons = {
    success: "bi-check2-circle",
    warning: "bi-exclamation-triangle",
    danger: "bi-x-octagon",
    neutral: "bi-stars",
  };

  return (
    <span className={`status-badge ${tone}`}>
      <i aria-hidden="true" className={`bi ${icons[tone] || icons.neutral}`} />
      <span>{children}</span>
    </span>
  );
}
