import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import OfflineBanner from "./OfflineBanner";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  // Masih menunggu jawaban GET /auth/me -- jangan redirect dulu, supaya sesi
  // yang sebenarnya valid tidak sempat "kelihatan" ter-logout sesaat.
  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      <OfflineBanner />
      <main className="page">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </>
  );
}
