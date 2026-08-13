import Skeleton from "./Skeleton";

function MetricCardSkeleton() {
  return (
    <div className="metric-card">
      <Skeleton width="70px" height="1.875rem" />
      <div style={{ marginTop: "var(--space-1)" }}>
        <Skeleton width="90px" height="0.85rem" />
      </div>
    </div>
  );
}

function CustomerRowSkeleton() {
  return (
    <div className="customer-row">
      <Skeleton width="40px" height="40px" radius="50%" style={{ flexShrink: 0 }} />
      <div className="customer-row-main stack" style={{ gap: "var(--space-2)" }}>
        <Skeleton width="55%" height="0.95rem" />
        <Skeleton width="35%" height="0.75rem" />
      </div>
      <Skeleton width="42px" height="1.15rem" />
    </div>
  );
}

export default function DashboardSkeleton({ rows = 4 }) {
  return (
    <div className="stack" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Memuat data pelanggan…</span>
      <div className="dashboard-metrics" aria-hidden="true">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
      <div className="stack" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <CustomerRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
