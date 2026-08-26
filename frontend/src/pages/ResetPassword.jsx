import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import * as endpoints from "../api/endpoints";
import { ApiError } from "../api/client";
import Logo from "../components/Logo";
import { PASSWORD_HINT, passwordError } from "../utils/password";
import "./AuthForm.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama dengan password.");
      return;
    }
    const pwError = passwordError(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);
    try {
      await endpoints.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message || "Link reset password tidak valid atau sudah kedaluwarsa. Minta link baru.");
      } else {
        setError(err.message || "Gagal mengubah password. Periksa koneksi internet Anda, lalu coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="page auth-shell">
        <div className="container auth-page">
          <Link to="/" className="auth-logo">
            <Logo size="md" />
          </Link>
          <h1 className="auth-title">Link Tidak Valid</h1>
          <div className="card stack text-center">
            <p>Link reset password tidak lengkap. Minta link baru dari halaman lupa password.</p>
            <Link to="/forgot-password" className="btn btn-primary btn-block">
              Minta Link Baru
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page auth-shell">
      <div className="container auth-page">
        <Link to="/" className="auth-logo">
          <Logo size="md" />
        </Link>
        <h1 className="auth-title">Buat Password Baru</h1>
        <p className="auth-subtitle">Masukkan password baru untuk akun Anda</p>

        {error && <div className="error-banner">{error}</div>}

        {done ? (
          <div className="card stack text-center">
            <div className="auth-success-banner">Password berhasil diubah. Mengarahkan ke halaman masuk...</div>
            <Link to="/login" className="btn btn-primary btn-block">
              Masuk Sekarang
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card">
            <div className="field">
              <label htmlFor="password">Password Baru</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="field-hint">{PASSWORD_HINT}</div>
            </div>
            <div className="field">
              <label htmlFor="confirm_password">Konfirmasi Password Baru</label>
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="spinner" /> : "Simpan Password Baru"}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/login">Kembali ke Halaman Masuk</Link>
        </p>
      </div>
    </main>
  );
}
