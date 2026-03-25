export function LoadingCard({ message = "Loading..." }) {
  return (
    <div className="route-loader" aria-live="polite" role="status">
      <div className="loading-head">
        <div className="loading-pulse" aria-hidden="true" />
        <div className="loading-copy">
          <strong>Synchronizing workspace</strong>
          <span className="support-copy">{message}</span>
        </div>
      </div>
      <div className="loading-bar-track" aria-hidden="true">
        <div className="loading-bar" />
      </div>
    </div>
  );
}
