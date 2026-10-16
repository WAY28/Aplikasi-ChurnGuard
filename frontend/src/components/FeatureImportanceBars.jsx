import { useEffect, useState } from "react";
import { featureLabel } from "../utils/format";
import "./FeatureImportanceBars.css";

// `factors` = hasil local_factors() dari backend (SHAP, personal per
// pelanggan): tiap item { feature, contribution, direction }. contribution
// bisa negatif (menarik ke arah tidak churn) maupun positif (mendorong ke
// arah churn) -- beda dari skema lama (top_factors global, selalu 0..1 --
// lihat git history kalau butuh versi itu lagi).
export default function FeatureImportanceBars({ factors }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    // Render dulu di 0%, baru isi di frame berikutnya supaya transisinya kepakai
    // (kalau langsung diset di render pertama, browser tidak sempat animasikan).
    const raf = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!factors || factors.length === 0) return null;
  const maxMagnitude = Math.max(...factors.map((f) => Math.abs(f.contribution)));

  return (
    <div className="feature-bars">
      {factors.map((f, i) => {
        const increasesRisk = f.direction === "increases_risk";
        const percentPoints = Math.round(f.contribution * 100);
        return (
          <div className="feature-bar-item" key={f.feature}>
            <div className="feature-bar-label">
              <span>{featureLabel(f.feature)}</span>
              <span className={`feature-bar-value tone-${increasesRisk ? "danger" : "info"}`}>
                {percentPoints > 0 ? `+${percentPoints}%` : `${percentPoints}%`}
              </span>
            </div>
            <div className="feature-bar-track">
              <div
                className={[
                  "feature-bar-fill",
                  increasesRisk ? "is-danger" : "is-info",
                  filled ? "is-filled" : "",
                ].join(" ")}
                style={{
                  "--fill-ratio": maxMagnitude ? Math.abs(f.contribution) / maxMagnitude : 0,
                  transitionDelay: `${Math.min(i, 6) * 60}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
