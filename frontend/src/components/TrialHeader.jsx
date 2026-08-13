import { Link } from "react-router-dom";
import Logo from "./Logo";
import "./TrialHeader.css";

export default function TrialHeader() {
  return (
    <header className="navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand">
          <Logo size="sm" />
          <span>ChurnGuard</span>
        </Link>
        <span className="trial-header-badge">Mode Coba</span>
        <div className="navbar-user">
          <Link to="/register" className="navbar-logout">
            Daftar Akun
          </Link>
        </div>
      </div>
    </header>
  );
}
