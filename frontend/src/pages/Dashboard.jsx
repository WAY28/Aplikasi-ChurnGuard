import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, PackageOpen } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import CustomerRow from "../components/CustomerRow";
import EmptyState from "../components/EmptyState";
import DashboardSkeleton from "../components/DashboardSkeleton";
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
        setError(err.message || "Gagal memuat data pelanggan. Muat ulang halaman untuk mencoba lagi.");
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

  // Risiko tertinggi tampil paling atas by default, supaya pemilik UMKM
  // langsung lihat pelanggan yang paling perlu ditindaklanjuti.
  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => (b.churn_probability ?? 0) - (a.churn_probability ?? 0)),
    [customers],
  );

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

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="dashboard-metrics">
            <MetricCard label="Total Pelanggan" value={totalCustomers} tone="primary" index={0} />
            <MetricCard label="Risiko Tinggi" value={highRiskCount} tone="danger" index={1} />
            <MetricCard label="Akurasi Model" value={MODEL_ACCURACY_LABEL} tone="info" index={2} />
          </div>

          {sortedCustomers.length === 0 ? (
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
              {sortedCustomers.map((c, i) => (
                <CustomerRow key={c.id} customer={c} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
