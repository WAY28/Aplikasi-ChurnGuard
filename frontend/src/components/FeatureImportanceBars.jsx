import { featureLabel } from "../utils/format";
import "./FeatureImportanceBars.css";

export default function FeatureImportanceBars({ factors }) {
  if (!factors || factors.length === 0) return null;
  const maxImportance = Math.max(...factors.map((f) => f.importance));

  return (
    <div className="feature-bars">
      {factors.map((f) => (
        <div className="feature-bar-item" key={f.feature}>
          <div className="feature-bar-label">
            <span>{featureLabel(f.feature)}</span>
            <span className="feature-bar-value">{Math.round(f.importance * 100)}%</span>
          </div>
          <div className="feature-bar-track">
            <div
              className="feature-bar-fill"
              style={{ width: `${(f.importance / maxImportance) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
