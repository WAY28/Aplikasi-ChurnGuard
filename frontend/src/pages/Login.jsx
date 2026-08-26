import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import Logo from "../components/Logo";
import "./AuthForm.css";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={location.state?.from ?? "/upload"} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/upload");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Email atau password salah. Periksa kembali lalu coba lagi.");
      } else {
        setError(err.message || "Gagal masuk. Periksa koneksi internet Anda, lalu coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-shell">
      <div className="container auth-page">
        <Link to="/" className="auth-logo">
          <Logo size="md" />
        </Link>
        <h1 className="auth-title">Masuk</h1>
        <p className="auth-subtitle">Masuk ke akun ChurnGuard Anda</p>

        {error && <div className="error-banner">{error}</div>}

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
          <div className="field">
            <div className="row-between">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="auth-inline-link">
                Lupa password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : "Masuk"}
          </button>
        </form>

        <p className="auth-footer">
          Belum punya akun? <Link to="/register">Daftar di sini</Link>
        </p>
      </div>
    </main>
  );
}
