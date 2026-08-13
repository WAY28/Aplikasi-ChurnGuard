import { useCountUp } from "../utils/useCountUp";
import "./MetricCard.css";

// tone: "primary" | "danger" | "success" | "info" | "neutral"
export default function MetricCard({ label, value, tone = "neutral", index = 0 }) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(value);
  const isNumeric = Number.isFinite(numericValue);
  const suffix = isNumeric && typeof value === "string" ? value.replace(/^[\d.,\s]+/, "") : "";
  const animatedValue = useCountUp(isNumeric ? numericValue : 0);
  const displayValue = isNumeric ? `${animatedValue}${suffix}` : value;

  return (
    <div className={`metric-card metric-card-${tone} stagger-item`} style={{ "--stagger-index": Math.min(index, 8) }}>
      <div className="metric-card-value">{displayValue}</div>
      <div className="metric-card-label">{label}</div>
    </div>
  );
}
