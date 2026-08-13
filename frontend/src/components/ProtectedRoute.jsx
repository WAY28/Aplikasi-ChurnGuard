import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import OfflineBanner from "./OfflineBanner";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

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
