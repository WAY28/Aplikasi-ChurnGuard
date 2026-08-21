import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Filter, PackageOpen, Search as SearchIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import CustomerRow from "../components/CustomerRow";
import EmptyState from "../components/EmptyState";
import DashboardSkeleton from "../components/DashboardSkeleton";
import Pagination from "../components/Pagination";
import { listCustomers } from "../api/endpoints";
import { loadCache, saveCache } from "../utils/offlineCache";
import { exportCustomersToCsv } from "../utils/csvExport";
import { CONTACT_STATUS_LABELS } from "../utils/format";
import { useOnlineStatus } from "../utils/useOnlineStatus";
import "./Dashboard.css";

const MODEL_ACCURACY_LABEL = "98%";
const PAGE_SIZE = 20;
const EMPTY_RESULT = { items: [], total: 0, total_pages: 0, high_risk_total: 0 };

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const uploadSessionId = searchParams.get("upload_session_id");
  const offline = !useOnlineStatus();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Debounce input pencarian 300ms supaya tidak nembak API tiap ketukan tombol.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Balik ke halaman 1 setiap kali pencarian/filter/sesi upload berubah.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, riskFilter, contactStatusFilter, uploadSessionId]);

  const filters = useMemo(
    () => ({
      uploadSessionId: uploadSessionId || undefined,
      search: debouncedSearch || undefined,
      risk: riskFilter !== "" ? riskFilter : undefined,
      contactStatus: contactStatusFilter || undefined,
    }),
    [uploadSessionId, debouncedSearch, riskFilter, contactStatusFilter],
  );

  const cacheKey = `customers:${JSON.stringify(filters)}:page${page}`;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    setFromCache(false);
    try {
      const data = await listCustomers({ ...filters, page, limit: PAGE_SIZE });
      setResult(data);
      saveCache(cacheKey, data);
    } catch (err) {
      const cached = loadCache(cacheKey);
      if (cached) {
        setResult(cached.data);
        setFromCache(true);
      } else {
        setError(err.message || "Gagal memuat data pelanggan. Muat ulang halaman untuk mencoba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }, [filters, page, cacheKey]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  async function handleExport() {
    setExporting(true);
    setExportError("");
    try {
      const count = await exportCustomersToCsv(filters);
      if (count === 0) {
        setExportError("Tidak ada data untuk diekspor sesuai pencarian/filter saat ini.");
      }
    } catch (err) {
      setExportError(err.message || "Gagal mengekspor data. Coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  const hasActiveFilters = Boolean(debouncedSearch || riskFilter !== "" || contactStatusFilter);

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Dashboard</h1>
          <p>Ringkasan hasil analisis risiko churn pelanggan Anda.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleExport}
          disabled={exporting || offline || result.total === 0}
        >
          {exporting ? <span className="spinner spinner-dark" /> : <Download size={18} />}
          <span>Export CSV</span>
        </button>
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
      {exportError && <div className="error-banner">{exportError}</div>}

      <div className="dashboard-filters">
        <div className="dashboard-search">
          <SearchIcon size={18} />
          <input
            type="text"
            placeholder="Cari nama atau nomor telepon..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Cari pelanggan berdasarkan nama atau telepon"
          />
        </div>
        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} aria-label="Filter status risiko">
          <option value="">Semua Risiko</option>
          <option value="1">Risiko Tinggi</option>
          <option value="0">Aman</option>
        </select>
        <select
          value={contactStatusFilter}
          onChange={(e) => setContactStatusFilter(e.target.value)}
          aria-label="Filter status kontak"
        >
          <option value="">Semua Status Kontak</option>
          {Object.entries(CONTACT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="dashboard-metrics">
            <MetricCard label="Total Pelanggan" value={result.total} tone="primary" index={0} />
            <MetricCard label="Risiko Tinggi" value={result.high_risk_total} tone="danger" index={1} />
            <MetricCard label="Akurasi Model" value={MODEL_ACCURACY_LABEL} tone="info" index={2} />
          </div>

          {result.items.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                icon={SearchIcon}
                title="Tidak ada pelanggan yang cocok"
                description="Coba ubah kata kunci pencarian atau filter yang dipakai."
              />
            ) : (
              <EmptyState
                title="Belum ada pelanggan"
                description="Unggah data pelanggan untuk mulai melihat analisis risiko churn."
                action={
                  <Link to="/upload" className="btn btn-primary">
                    Upload Data
                  </Link>
                }
              />
            )
          ) : (
            <>
              <div className="stack">
                {result.items.map((c, i) => (
                  <CustomerRow key={c.id} customer={c} index={i} />
                ))}
              </div>
              <Pagination page={page} totalPages={result.total_pages} onChange={setPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}
