import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, KeyRound, Loader2, ShieldCheck, Trash2, Users } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import * as endpoints from "../api/endpoints";
import { PASSWORD_HINT, passwordError } from "../utils/password";
import { cn } from "../utils/cn";
import "../styles/admin-tailwind.css";

const PAGE_SIZE = 20;

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-admin-border bg-white p-5 shadow-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-admin-primary/10 text-admin-primary">
        <Icon size={20} />
      </span>
      <div>
        <div className="font-admin-display text-2xl font-bold text-admin-text">{value}</div>
        <div className="text-sm text-admin-text-secondary">{label}</div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="font-admin-display text-lg font-bold text-admin-text">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ResetPasswordModal({ targetUser, onClose, onDone }) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const pwError = passwordError(newPassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await endpoints.adminResetPassword(targetUser.id, newPassword);
      onDone(`Password ${targetUser.email} berhasil direset. Sampaikan password baru ini ke user secara aman.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Reset Password User" onClose={onClose}>
      <p className="mt-1 text-sm text-admin-text-secondary">
        Untuk <strong className="text-admin-text">{targetUser.email}</strong>. Ini jalur darurat -- sampaikan
        password baru ke user secara aman, lalu minta mereka menggantinya sendiri lewat halaman Akun.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="new_password" className="mb-1 block text-sm font-semibold text-admin-text">
            Password baru
          </label>
          <input
            id="new_password"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-admin-border px-3 py-2 text-sm outline-none focus:border-admin-primary"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-admin-text-secondary">{PASSWORD_HINT}</p>
        </div>
        {error && <p className="text-sm text-admin-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-admin-text-secondary hover:bg-admin-bg"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-admin-primary px-4 py-2 text-sm font-semibold text-white hover:bg-admin-primary-dark disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Reset Password
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteUserModal({ targetUser, onClose, onDone }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setError("");
    setLoading(true);
    try {
      await endpoints.adminDeleteUser(targetUser.id);
      onDone(`Akun ${targetUser.email} beserta seluruh datanya sudah dihapus.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus akun.");
      setLoading(false);
    }
  }

  return (
    <Modal title="Hapus Akun User" onClose={onClose}>
      <div className="mt-2 flex items-start gap-3 rounded-lg bg-admin-danger-bg p-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-admin-danger" />
        <p className="text-sm text-admin-text">
          Menghapus <strong>{targetUser.email}</strong> juga menghapus SEMUA data pelanggan &amp; riwayat upload
          milik akun ini secara permanen. Tindakan ini tidak bisa dibatalkan.
        </p>
      </div>
      {error && <p className="mt-3 text-sm text-admin-danger">{error}</p>}
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-admin-text-secondary hover:bg-admin-bg"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-admin-danger px-4 py-2 text-sm font-semibold text-white hover:brightness-90 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Ya, Hapus Permanen
        </button>
      </div>
    </Modal>
  );
}

export default function Admin() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [result, setResult] = useState({ items: [], total: 0, total_pages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, usersRes] = await Promise.all([
        endpoints.getAdminStats(),
        endpoints.listAdminUsers({ page, limit: PAGE_SIZE }),
      ]);
      setStats(statsRes);
      setResult(usersRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat data admin.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  // Guard di frontend cuma untuk UX (sembunyikan menu dari user biasa) --
  // penegakan sesungguhnya ada di backend (routers/admin.py balas 404 kalau
  // bukan admin), jadi tidak masalah kalau ada yang coba akses langsung.
  if (!user?.is_admin) {
    return <Navigate to="/upload" replace />;
  }

  function handleActionDone(message) {
    setNotice(message);
    setResetTarget(null);
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 font-admin-body text-admin-text">
      <h1 className="font-admin-display text-2xl font-bold">Dashboard Admin</h1>
      <p className="mt-1 text-admin-text-secondary">Lihat dan kelola user yang mendaftar di ChurnGuard.</p>

      {notice && (
        <div className="mt-4 rounded-lg bg-admin-success-bg px-4 py-3 text-sm text-admin-success">{notice}</div>
      )}
      {error && <div className="mt-4 rounded-lg bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger">{error}</div>}

      {stats && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="Total User" value={stats.total_users} />
          <StatCard icon={ShieldCheck} label="Total Pelanggan Diinput" value={stats.total_customers} />
          <StatCard icon={Users} label="Total Sesi Upload" value={stats.total_upload_sessions} />
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-admin-border bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-admin-border text-admin-text-secondary">
              <th className="px-4 py-3 font-semibold">Nama UMKM</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Daftar</th>
              <th className="px-4 py-3 font-semibold">Pelanggan</th>
              <th className="px-4 py-3 font-semibold">Upload</th>
              <th className="px-4 py-3 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-admin-text-secondary">
                  Memuat...
                </td>
              </tr>
            ) : result.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-admin-text-secondary">
                  Belum ada user terdaftar.
                </td>
              </tr>
            ) : (
              result.items.map((u) => (
                <tr key={u.id} className="border-b border-admin-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.business_name}
                      {u.is_admin && (
                        <span className="rounded-full bg-admin-highlight/20 px-2 py-0.5 text-xs font-semibold text-admin-highlight-dark">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-admin-text-secondary">{u.email}</td>
                  <td className="px-4 py-3 text-admin-text-secondary">
                    {new Date(u.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">{u.customer_count}</td>
                  <td className="px-4 py-3">{u.upload_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setResetTarget(u)}
                        title="Reset password"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-text-secondary hover:bg-admin-bg hover:text-admin-primary"
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === user.id}
                        title={u.id === user.id ? "Tidak bisa hapus akun sendiri di sini" : "Hapus akun"}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg text-admin-text-secondary hover:bg-admin-danger-bg hover:text-admin-danger",
                          u.id === user.id && "cursor-not-allowed opacity-30 hover:bg-transparent hover:text-admin-text-secondary",
                        )}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {result.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-admin-text-secondary">
          <span>
            Halaman {result.page} dari {result.total_pages} ({result.total} user)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-admin-border px-3 py-1.5 font-semibold hover:bg-admin-bg disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(result.total_pages, p + 1))}
              disabled={page >= result.total_pages}
              className="rounded-lg border border-admin-border px-3 py-1.5 font-semibold hover:bg-admin-bg disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}

      {resetTarget && (
        <ResetPasswordModal targetUser={resetTarget} onClose={() => setResetTarget(null)} onDone={handleActionDone} />
      )}
      {deleteTarget && (
        <DeleteUserModal targetUser={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={handleActionDone} />
      )}
    </div>
  );
}
