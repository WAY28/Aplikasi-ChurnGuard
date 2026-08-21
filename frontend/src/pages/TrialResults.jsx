import { Link, Navigate, useLocation } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import Badge from "../components/Badge";
import { MAX_TRIAL_ATTEMPTS, getAttemptsUsed, hasTrialAttemptsLeft } from "../utils/trial";
import { formatPercent, riskLabel, riskTone } from "../utils/format";
import "./TrialResults.css";

const MODEL_ACCURACY_LABEL = "98,05%";

export default function TrialResults() {
  const location = useLocation();
  const result = location.state;

  if (!result) {
    return <Navigate to="/trial" replace />;
  }

  const attemptsUsed = getAttemptsUsed();
  const attemptsLeft = MAX_TRIAL_ATTEMPTS - attemptsUsed;

  return (
    <div className="stack">
      <div>
        <h1>Hasil Percobaan</h1>
        <p>Ini hasil analisis dari file yang baru saja Anda unggah. Hasilnya tidak disimpan di server kami.</p>
      </div>

      <div className="dashboard-metrics">
        <MetricCard label="Total Pelanggan" value={result.total_customers} tone="primary" index={0} />
        <MetricCard label="Risiko Tinggi" value={result.high_risk_count} tone="danger" index={1} />
        <MetricCard label="Akurasi Model" value={MODEL_ACCURACY_LABEL} tone="info" index={2} />
      </div>

      <div className="stack">
        {result.results.map((row, i) => (
          <div
            className="trial-result-row stagger-item"
            style={{ "--stagger-index": Math.min(i, 8) }}
            key={row.row}
          >
            <span className="trial-result-row-label">Baris {row.row}</span>
            <div className="row">
              <Badge tone={riskTone(row.churn_prediction)}>{riskLabel(row.churn_prediction)}</Badge>
              <span className="trial-result-row-score">{formatPercent(row.churn_probability)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card trial-cta text-center">
        <h3>Suka dengan hasilnya?</h3>
        <p>
          Daftar akun gratis supaya hasil analisis ini tersimpan, punya riwayat upload, dan bisa langsung menghubungi
          pelanggan berisiko lewat WhatsApp atau Email.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link to="/register" className="btn btn-primary">
            Daftar Akun
          </Link>
          {hasTrialAttemptsLeft() ? (
            <Link to="/trial" className="btn btn-outline">
              Coba Lagi ({attemptsLeft} tersisa)
            </Link>
          ) : (
            <Link to="/" className="btn btn-outline">
              Ke Beranda
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
