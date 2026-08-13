import { useCallback, useEffect, useState } from "react";
import { Filter, PackageOpen } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import CustomerRow from "../components/CustomerRow";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import { listCustomers } from "../api/endpoints";
import { loadCache, saveCache } from "../utils/offlineCache";

const MODEL_ACCURACY_LABEL = "98%";

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const uploadSessionId = searchParams.get("upload_session_id");
  const cacheKey = `customers:${uploadSessionId || "all"}`;

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    setFromCache(false);
    try {
      const data = await listCustomers(uploadSessionId || undefined);
      setCustomers(data);
      saveCache(cacheKey, data);
    } catch (err) {
      const cached = loadCache(cacheKey);
      if (cached) {
        setCustomers(cached.data);
        setFromCache(true);
      } else {
        setError(err.message || "Gagal memuat data pelanggan");
      }
    } finally {
      setLoading(false);
    }
  }, [uploadSessionId, cacheKey]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const totalCustomers = customers.length;
  const highRiskCount = customers.filter((c) => c.churn_prediction === 1).length;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Dashboard</h1>
          <p>Ringkasan hasil analisis risiko churn pelanggan Anda.</p>
        </div>
      </div>

      {uploadSessionId && (
        <div className="info-notice">
          <Filter size={18} />
          <span>
            Menampilkan hasil sesi upload nomor {uploadSessionId}. <Link to="/dashboard">Lihat semua pelanggan</Link>
          </span>
        </div>
      )}

      {fromCache && (
        <div className="info-notice">
          <PackageOpen size={18} />
          <span>Menampilkan data tersimpan terakhir. Ini mode offline, jadi datanya mungkin tidak terbaru.</span>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-metrics">
        <MetricCard label="Total Pelanggan" value={totalCustomers} tone="primary" />
        <MetricCard label="Risiko Tinggi" value={highRiskCount} tone="danger" />
        <MetricCard label="Akurasi Model" value={MODEL_ACCURACY_LABEL} tone="info" />
      </div>

      {loading ? (
        <LoadingSpinner label="Memuat data pelanggan..." />
      ) : customers.length === 0 ? (
        <EmptyState
          title="Belum ada pelanggan"
          description="Unggah data pelanggan untuk mulai melihat analisis risiko churn."
          action={
            <Link to="/upload" className="btn btn-primary">
              Upload Data
            </Link>
          }
        />
      ) : (
        <div className="stack">
          {customers.map((c) => (
            <CustomerRow key={c.id} customer={c} />
          ))}
        </div>
      )}
    </div>
  );
}
