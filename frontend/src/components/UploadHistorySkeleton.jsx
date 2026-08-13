import Skeleton from "./Skeleton";

function HistoryRowSkeleton() {
  return (
    <div className="history-row">
      <div className="history-row-main">
        <Skeleton width="160px" height="0.95rem" />
        <Skeleton width="110px" height="0.8rem" />
      </div>
      <div className="history-row-stats">
        <Skeleton width="80px" height="0.85rem" />
        <Skeleton width="90px" height="1.5rem" radius="var(--radius-full)" />
      </div>
    </div>
  );
}

export default function UploadHistorySkeleton({ rows = 4 }) {
  return (
    <div className="stack" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Memuat riwayat upload…</span>
      <div className="stack" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <HistoryRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
