import { useState } from "react";
import { Link } from "react-router-dom";
import * as endpoints from "../api/endpoints";
import Logo from "../components/Logo";
import "./AuthForm.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await endpoints.forgotPassword(email);
      // Pesan dari backend sengaja generik (sama baik email terdaftar atau
      // tidak) supaya endpoint ini tidak bisa dipakai mengecek email siapa
      // saja yang punya akun -- lihat routers/auth.py.
      setSent(true);
    } catch (err) {
      setError(err.message || "Gagal mengirim link reset. Periksa koneksi internet Anda, lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="container auth-page">
        <div className="auth-logo">
          <Logo size="md" />
        </div>
        <h1 className="auth-title">Lupa Password</h1>
        <p className="auth-subtitle">Masukkan email akun Anda, kami kirimkan link untuk membuat password baru</p>

        {error && <div className="error-banner">{error}</div>}

        {sent ? (
          <div className="card stack text-center">
            <div className="auth-success-banner">
              Jika email terdaftar, link reset password sudah dikirim. Cek inbox (dan folder spam) Anda.
            </div>
            <Link to="/login" className="btn btn-primary btn-block">
              Kembali ke Halaman Masuk
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="spinner" /> : "Kirim Link Reset"}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Ingat password Anda? <Link to="/login">Masuk di sini</Link>
        </p>
      </div>
    </main>
  );
}
