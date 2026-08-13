import Skeleton from "./Skeleton";

export default function CustomerDetailSkeleton() {
  return (
    <div className="stack" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Memuat detail pelanggan…</span>
      <div aria-hidden="true" className="stack">
        <div className="card customer-detail-header">
          <div className="stack" style={{ gap: "var(--space-2)", flex: 1 }}>
            <Skeleton width="60%" height="1.5rem" />
            <div className="row">
              <Skeleton width="90px" height="1.5rem" radius="var(--radius-full)" />
              <Skeleton width="110px" height="1.5rem" radius="var(--radius-full)" />
            </div>
          </div>
          <div className="stack text-center" style={{ gap: "var(--space-2)" }}>
            <Skeleton width="70px" height="2.5rem" />
            <Skeleton width="90px" height="0.85rem" />
          </div>
        </div>

        <div className="card stack">
          <Skeleton width="45%" height="1.1rem" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height="2.2rem" />
          ))}
        </div>

        <div className="card stack">
          <Skeleton width="30%" height="1.1rem" />
          <div className="row">
            <Skeleton width="100%" height="44px" />
            <Skeleton width="100%" height="44px" />
          </div>
        </div>
      </div>
    </div>
  );
}
