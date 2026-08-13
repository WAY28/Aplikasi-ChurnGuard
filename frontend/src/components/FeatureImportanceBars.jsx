import { useEffect, useState } from "react";
import { featureLabel } from "../utils/format";
import "./FeatureImportanceBars.css";

export default function FeatureImportanceBars({ factors }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    // Render dulu di 0%, baru isi di frame berikutnya supaya transisinya kepakai
    // (kalau langsung diset di render pertama, browser tidak sempat animasikan).
    const raf = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!factors || factors.length === 0) return null;
  const maxImportance = Math.max(...factors.map((f) => f.importance));

  return (
    <div className="feature-bars">
      {factors.map((f, i) => (
        <div className="feature-bar-item" key={f.feature}>
          <div className="feature-bar-label">
            <span>{featureLabel(f.feature)}</span>
            <span className="feature-bar-value">{Math.round(f.importance * 100)}%</span>
          </div>
          <div className="feature-bar-track">
            <div
              className={filled ? "feature-bar-fill is-filled" : "feature-bar-fill"}
              style={{
                "--fill-ratio": f.importance / maxImportance,
                transitionDelay: `${Math.min(i, 6) * 60}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
