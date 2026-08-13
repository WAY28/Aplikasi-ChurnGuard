import { UploadCloud, Target, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import heroIllustration from "../assets/hero-illustration.svg";
import { getRemainingAttempts } from "../utils/trial";
import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();
  const remaining = getRemainingAttempts();

  return (
    <main className="page landing">
      <section className="landing-hero-section">
        <img src={heroIllustration} alt="" aria-hidden="true" className="landing-hero-bg" />

        <div className="container landing-hero text-center">
          <Logo size="lg" />
          <h1>ChurnGuard</h1>
          <p className="landing-tagline">
            Deteksi dini pelanggan yang berisiko berhenti bertransaksi, langsung dari data yang sudah Anda punya.
          </p>
          <p className="landing-desc">
            ChurnGuard membantu pemilik UMKM melihat siapa saja pelanggan yang berisiko churn, lengkap dengan faktor
            penyebabnya. Anda bisa langsung menindaklanjuti lewat WhatsApp atau Email, tanpa perlu tim data analyst.
          </p>

          <div className="landing-actions">
            <Link to="/register" className="btn btn-primary btn-block">
              Daftar
            </Link>
            <Link to="/login" className="btn btn-outline btn-block">
              Masuk
            </Link>
            <button type="button" className="btn btn-outline btn-block" onClick={() => navigate("/trial")}>
              Coba Sekarang
            </button>
            {remaining < 3 && (
              <p className="landing-trial-hint">
                {remaining > 0
                  ? `Sisa percobaan gratis Anda: ${remaining} dari 3.`
                  : "Percobaan gratis Anda sudah habis. Daftar akun untuk terus memakai ChurnGuard."}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="container landing-features-section">
        <div className="landing-features">
          <div className="landing-feature-item">
            <span className="landing-feature-icon">
              <UploadCloud size={22} />
            </span>
            <div>
              <strong>Upload dan Analisis Instan</strong>
              <p>Unggah data CSV atau Excel pelanggan. Sistem langsung memprediksi risiko churn tiap pelanggan.</p>
            </div>
          </div>
          <div className="landing-feature-item">
            <span className="landing-feature-icon">
              <Target size={22} />
            </span>
            <div>
              <strong>Faktor Penyebab Jelas</strong>
              <p>Lihat faktor utama yang membuat pelanggan berisiko, bukan sekadar angka.</p>
            </div>
          </div>
          <div className="landing-feature-item">
            <span className="landing-feature-icon">
              <MessageCircle size={22} />
            </span>
            <div>
              <strong>Tindak Lanjut Sekali Klik</strong>
              <p>Hubungi pelanggan berisiko langsung lewat WhatsApp atau Email dari dalam aplikasi.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
