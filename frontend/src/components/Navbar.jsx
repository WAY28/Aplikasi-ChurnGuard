import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { initials } from "../utils/format";
import Logo from "./Logo";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Tutup dropdown kalau klik di luar area menu, atau tekan Escape --
  // pola standar untuk menu popover supaya tidak "nyangkut" terbuka.
  useEffect(() => {
    if (!menuOpen) return undefined;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function handleEscape(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  function handleLogout() {
    setMenuOpen(false);
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

        <div className="navbar-account" ref={menuRef}>
          <button
            type="button"
            className="navbar-account-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="navbar-account-avatar">{initials(user?.business_name)}</span>
            <span className="navbar-business">{user?.business_name}</span>
            <ChevronDown size={16} className={menuOpen ? "navbar-account-chevron open" : "navbar-account-chevron"} />
          </button>

          {menuOpen && (
            <div className="navbar-account-menu" role="menu">
              <div className="navbar-account-menu-header">
                <span className="navbar-account-avatar navbar-account-avatar-lg">{initials(user?.business_name)}</span>
                <div className="navbar-account-menu-info">
                  <strong>{user?.business_name}</strong>
                  <span>{user?.email}</span>
                </div>
              </div>
              <NavLink to="/account" className="navbar-account-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                <Settings size={16} />
                Pengaturan Akun
              </NavLink>
              <button type="button" className="navbar-account-menu-item danger" role="menuitem" onClick={handleLogout}>
                <LogOut size={16} />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
