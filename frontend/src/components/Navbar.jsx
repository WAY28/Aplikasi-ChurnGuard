import { LogOut, Settings } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <div className="navbar-inner container">
        <NavLink to="/upload" className="navbar-brand">
          <Logo size="sm" />
          <span>ChurnGuard</span>
        </NavLink>
        <nav className="navbar-links">
          <NavLink to="/upload" className={({ isActive }) => (isActive ? "navbar-link active" : "navbar-link")}>
            Upload
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "navbar-link active" : "navbar-link")}>
            Dashboard
          </NavLink>
          <NavLink to="/riwayat" className={({ isActive }) => (isActive ? "navbar-link active" : "navbar-link")}>
            Riwayat
          </NavLink>
          {user?.is_admin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "navbar-link active" : "navbar-link")}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="navbar-user">
          <span className="navbar-business">{user?.business_name}</span>
          <NavLink to="/account" className="navbar-icon-btn" aria-label="Pengaturan akun" title="Pengaturan akun">
            <Settings size={16} />
          </NavLink>
          <button type="button" className="navbar-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
