import { useCountUp } from "../utils/useCountUp";
import "./MetricCard.css";

// tone: "primary" | "danger" | "success" | "info" | "neutral"
export default function MetricCard({ label, value, tone = "neutral", index = 0 }) {
  // Angka berformat koma (mis. "98,05%") sengaja TIDAK dianimasikan -- parseFloat
  // tidak paham koma sebagai desimal ("98,05" jadi cuma 98) dan animasi count-up
  // membulatkan ke integer, jadi keduanya akan menghilangkan ",05" kalau dipaksakan.
  const isCommaFormatted = typeof value === "string" && value.includes(",");
  const numericValue = typeof value === "number" ? value : Number.parseFloat(value);
  const isNumeric = !isCommaFormatted && Number.isFinite(numericValue);
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
