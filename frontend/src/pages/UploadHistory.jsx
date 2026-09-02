import { useCallback, useEffect, useState } from "react";
import { History, PackageOpen, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import UploadHistorySkeleton from "../components/UploadHistorySkeleton";
import { deleteUploadSession, listUploadSessions } from "../api/endpoints";
import { loadCache, saveCache } from "../utils/offlineCache";
import { formatDate } from "../utils/format";
import "./UploadHistory.css";

const PAGE_SIZE = 20;
const EMPTY_RESULT = { items: [], total: 0, total_pages: 0 };

export default function UploadHistory() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // session object | null
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const cacheKey = `upload_sessions:page${page}`;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    setFromCache(false);
    try {
      const data = await listUploadSessions({ page, limit: PAGE_SIZE });
      setResult(data);
      saveCache(cacheKey, data);
    } catch (err) {
      const cached = loadCache(cacheKey);
      if (cached) {
        setResult(cached.data);
        setFromCache(true);
      } else {
        setError(err.message || "Gagal memuat riwayat upload. Muat ulang halaman untuk mencoba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }, [page, cacheKey]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteUploadSession(pendingDelete.id);
      setPendingDelete(null);
      // Kalau ini satu-satunya item di halaman terakhir (>1), mundur satu halaman.
      if (result.items.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchSessions();
      }
    } catch (err) {
      setDeleteError(err.message || "Gagal menghapus sesi upload. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <span className="page-header-icon">
          <History size={22} />
        </span>
        <div>
          <h1>Riwayat Upload</h1>
          <p>Daftar sesi upload sebelumnya. Klik salah satu untuk lihat dashboard pada sesi tersebut.</p>
        </div>
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
      ) : result.items.length === 0 ? (
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
        <>
          <div className="stack">
            {result.items.map((s, i) => (
              <div key={s.id} className="history-row stagger-item" style={{ "--stagger-index": Math.min(i, 8) }}>
                <Link to={`/dashboard?upload_session_id=${s.id}`} className="history-row-link">
                  <div className="history-row-main">
                    <strong>{s.filename}</strong>
                    <span className="muted">{formatDate(s.uploaded_at)}</span>
                  </div>
                  <div className="history-row-stats">
                    <span className="muted">{s.total_customers} pelanggan</span>
                    <Badge tone={s.high_risk_count > 0 ? "danger" : "success"}>{s.high_risk_count} risiko tinggi</Badge>
                  </div>
                </Link>
                <button
                  type="button"
                  className="history-row-delete"
                  aria-label={`Hapus sesi upload ${s.filename}`}
                  onClick={() => {
                    setPendingDelete(s);
                    setDeleteError("");
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={result.total_pages} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus sesi upload ini?"
        message={
          pendingDelete
            ? `File "${pendingDelete.filename}" beserta ${pendingDelete.total_customers} data pelanggan di dalamnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError("");
        }}
      />
    </div>
  );
}
