import "./MetricCard.css";

// tone: "primary" | "danger" | "success" | "info" | "neutral"
export default function MetricCard({ label, value, tone = "neutral" }) {
  return (
    <div className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-value">{value}</div>
      <div className="metric-card-label">{label}</div>
    </div>
  );
}
