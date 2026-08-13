import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import Logo from "../components/Logo";
import "./AuthForm.css";

export default function Register() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/upload" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama dengan password.");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    try {
      await register(businessName, email, password);
      navigate("/upload");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message || "Email sudah terdaftar.");
      } else {
        setError(err.message || "Gagal mendaftar, coba lagi.");
      }
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
        <h1 className="auth-title">Daftar</h1>
        <p className="auth-subtitle">Buat akun ChurnGuard untuk UMKM Anda</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="card">
          <div className="field">
            <label htmlFor="business_name">Nama UMKM</label>
            <input
              id="business_name"
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Toko Barokah"
            />
          </div>
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
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="field-hint">Minimal 6 karakter</div>
          </div>
          <div className="field">
            <label htmlFor="confirm_password">Konfirmasi Password</label>
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
            {loading ? <span className="spinner" /> : "Daftar"}
          </button>
        </form>

        <p className="auth-footer">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </p>
      </div>
    </main>
  );
}
