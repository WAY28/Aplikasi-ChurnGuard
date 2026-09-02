import { useState } from "react";
import { CheckCircle2, KeyRound, Mail, Settings, Store, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { deleteAccount, updateAccount } from "../api/endpoints";
import { PASSWORD_HINT, passwordError } from "../utils/password";
import "./Account.css";

// Semua submit di halaman ini lewat PATCH /account. Field yang tidak relevan
// dikirim sebagai undefined (bukan string kosong) supaya backend tidak
// menganggapnya sebagai perubahan -- lihat routers/account.py.
async function submitAccountUpdate(payload, { onSuccess, onError, setLoading }) {
  setLoading(true);
  try {
    const updated = await updateAccount(payload);
    onSuccess(updated);
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      onError(err.message);
    } else {
      onError(err.message || "Gagal menyimpan perubahan. Coba lagi.");
    }
  } finally {
    setLoading(false);
  }
}

function BusinessNameCard({ user, updateUser }) {
  const [businessName, setBusinessName] = useState(user?.business_name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!businessName.trim()) {
      setError("Nama usaha tidak boleh kosong.");
      return;
    }
    submitAccountUpdate(
      { business_name: businessName.trim() },
      {
        setLoading,
        onSuccess: (updated) => {
          updateUser({ business_name: updated.business_name });
          setSuccess(true);
        },
        onError: setError,
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="account-card-header">
        <span className="account-card-header-icon">
          <Store size={18} />
        </span>
        <h3>Nama Usaha</h3>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {success && (
        <div className="success-banner">
          <CheckCircle2 size={18} />
          <span>Nama usaha berhasil diperbarui.</span>
        </div>
      )}
      <div className="field">
        <label htmlFor="business_name">Nama Usaha</label>
        <input
          id="business_name"
          value={businessName}
          onChange={(e) => {
            setBusinessName(e.target.value);
            setSuccess(false);
          }}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? <span className="spinner" /> : "Simpan Nama Usaha"}
      </button>
    </form>
  );
}

function EmailCard({ user, updateUser }) {
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (email.trim() === user?.email) {
      setError("Email baru sama dengan email saat ini.");
      return;
    }
    if (!currentPassword) {
      setError("Masukkan password saat ini untuk konfirmasi.");
      return;
    }
    submitAccountUpdate(
      { email: email.trim(), current_password: currentPassword },
      {
        setLoading,
        onSuccess: (updated) => {
          updateUser({ email: updated.email });
          setCurrentPassword("");
          setSuccess(true);
        },
        onError: setError,
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="account-card-header">
        <span className="account-card-header-icon">
          <Mail size={18} />
        </span>
        <h3>Email</h3>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {success && (
        <div className="success-banner">
          <CheckCircle2 size={18} />
          <span>Email berhasil diperbarui.</span>
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email Baru</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="email-current-password">Password Saat Ini</label>
        <input
          id="email-current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <div className="field-hint">Diperlukan untuk konfirmasi perubahan email.</div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? <span className="spinner" /> : "Simpan Email"}
      </button>
    </form>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!currentPassword) {
      setError("Masukkan password saat ini.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak sama dengan password baru.");
      return;
    }
    const pwError = passwordError(newPassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    submitAccountUpdate(
      { new_password: newPassword, current_password: currentPassword },
      {
        setLoading,
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setSuccess(true);
        },
        onError: setError,
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="account-card-header">
        <span className="account-card-header-icon">
          <KeyRound size={18} />
        </span>
        <h3>Ubah Password</h3>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {success && (
        <div className="success-banner">
          <CheckCircle2 size={18} />
          <span>Password berhasil diubah.</span>
        </div>
      )}
      <div className="field">
        <label htmlFor="current_password">Password Saat Ini</label>
        <input
          id="current_password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="new_password">Password Baru</label>
        <input
          id="new_password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <div className="field-hint">{PASSWORD_HINT}</div>
      </div>
      <div className="field">
        <label htmlFor="confirm_new_password">Konfirmasi Password Baru</label>
        <input
          id="confirm_new_password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? <span className="spinner" /> : "Simpan Password Baru"}
      </button>
    </form>
  );
}

function DangerZoneCard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function closeDialog() {
    setConfirming(false);
    setPassword("");
    setError("");
  }

  async function handleDelete() {
    if (!password) {
      setError("Masukkan password Anda untuk konfirmasi.");
      return;
    }
    setDeleting(true);
    setError("");
    try {
      await deleteAccount(password);
      logout();
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Password salah.");
      } else {
        setError(err.message || "Gagal menghapus akun. Coba lagi.");
      }
      setDeleting(false);
    }
  }

  return (
    <div className="card account-danger-zone">
      <div className="account-card-header">
        <span className="account-card-header-icon">
          <Trash2 size={18} />
        </span>
        <h3>Hapus Akun</h3>
      </div>
      <p className="muted">
        Menghapus akun akan menghapus permanen seluruh data pelanggan dan riwayat upload Anda. Tindakan ini tidak
        bisa dibatalkan.
      </p>
      <button type="button" className="btn btn-danger-outline" onClick={() => setConfirming(true)}>
        Hapus Akun Saya
      </button>

      <ConfirmDialog
        open={confirming}
        title="Hapus akun Anda?"
        message="Semua data pelanggan dan riwayat upload akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, Hapus Akun"
        loading={deleting}
        error={error}
        onConfirm={handleDelete}
        onCancel={closeDialog}
      >
        <div className="field">
          <label htmlFor="delete-account-password">Konfirmasi password Anda</label>
          <input
            id="delete-account-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default function Account() {
  const { user, updateUser } = useAuth();

  return (
    <div className="stack">
      <div className="page-header">
        <span className="page-header-icon">
          <Settings size={22} />
        </span>
        <div>
          <h1>Pengaturan Akun</h1>
          <p>Kelola informasi dan keamanan akun Anda.</p>
        </div>
      </div>

      <div className="account-grid">
        <BusinessNameCard user={user} updateUser={updateUser} />
        <EmailCard user={user} updateUser={updateUser} />
        <PasswordCard />
        <DangerZoneCard />
      </div>
    </div>
  );
}
