import { useEffect, useState } from "react";
import { History, PackageOpen } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import UploadHistorySkeleton from "../components/UploadHistorySkeleton";
import { listUploadSessions } from "../api/endpoints";
import { loadCache, saveCache } from "../utils/offlineCache";
import { formatDate } from "../utils/format";
import "./UploadHistory.css";

const CACHE_KEY = "upload_sessions";

export default function UploadHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      setFromCache(false);
      try {
        const data = await listUploadSessions();
        setSessions(data);
        saveCache(CACHE_KEY, data);
      } catch (err) {
        const cached = loadCache(CACHE_KEY);
        if (cached) {
          setSessions(cached.data);
          setFromCache(true);
        } else {
          setError(err.message || "Gagal memuat riwayat upload. Muat ulang halaman untuk mencoba lagi.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="stack">
      <div>
        <h1>Riwayat Upload</h1>
        <p>Daftar sesi upload sebelumnya. Klik salah satu untuk lihat dashboard pada sesi tersebut.</p>
      </div>

      {fromCache && (
        <div className="info-notice">
          <PackageOpen size={18} />
          <span>Menampilkan data tersimpan terakhir. Ini mode offline, jadi datanya mungkin tidak terbaru.</span>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <UploadHistorySkeleton />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={History}
          title="Belum ada riwayat upload"
          description="Upload data pelanggan pertama Anda untuk mulai melihat riwayatnya di sini."
          action={
            <Link to="/upload" className="btn btn-primary">
              Upload Data
            </Link>
          }
        />
      ) : (
        <div className="stack">
          {sessions.map((s, i) => (
            <Link
              key={s.id}
              to={`/dashboard?upload_session_id=${s.id}`}
              className="history-row stagger-item"
              style={{ "--stagger-index": Math.min(i, 8) }}
            >
              <div className="history-row-main">
                <strong>{s.filename}</strong>
                <span className="muted">{formatDate(s.uploaded_at)}</span>
              </div>
              <div className="history-row-stats">
                <span className="muted">{s.total_customers} pelanggan</span>
                <Badge tone={s.high_risk_count > 0 ? "danger" : "success"}>{s.high_risk_count} risiko tinggi</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
