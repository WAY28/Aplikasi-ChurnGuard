export default function LoadingSpinner({ label = "Memuat..." }) {
  return (
    <div className="row" style={{ justifyContent: "center", padding: "var(--space-6) 0" }}>
      <span className="spinner spinner-dark" />
      <span className="muted">{label}</span>
    </div>
  );
}
