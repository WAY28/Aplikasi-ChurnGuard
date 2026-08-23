import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  UploadCloud,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import PulseHero from "../components/PulseHero";
import { getRemainingAttempts } from "../utils/trial";
import { useScrollReveal } from "../utils/useScrollReveal";
import "./Landing.css";

const STEPS = [
  {
    icon: UploadCloud,
    title: "Unggah Data Pelanggan",
    desc: "Tinggal drag-and-drop file CSV/Excel yang sudah Anda punya — riwayat transaksi, kontak, apa saja.",
  },
  {
    icon: Target,
    title: "Sistem Menganalisis",
    desc: "Model Random Forest membaca pola tiap pelanggan dan memberi skor risiko churn dalam hitungan detik.",
  },
  {
    icon: MessageCircle,
    title: "Tindak Lanjuti Sekali Klik",
    desc: "Lihat siapa yang paling berisiko, lalu hubungi langsung lewat WhatsApp atau Email dari dalam aplikasi.",
  },
];

const FEATURES = [
  {
    icon: UploadCloud,
    title: "Upload & Analisis Instan",
    desc: "Unggah CSV/Excel pelanggan, sistem langsung memprediksi risiko churn tiap orang — tanpa spreadsheet manual.",
  },
  {
    icon: Target,
    title: "Faktor Penyebab Jelas",
    desc: "Bukan cuma angka. Lihat faktor utama (lama berlangganan, komplain, dll) yang membuat seorang pelanggan berisiko.",
  },
  {
    icon: MessageCircle,
    title: "Tindak Lanjut Sekali Klik",
    desc: "Hubungi pelanggan berisiko langsung lewat WhatsApp atau Email, status kontaknya otomatis tercatat.",
  },
  {
    icon: Smartphone,
    title: "Dipasang Langsung di HP",
    desc: "ChurnGuard adalah Progressive Web App — instal seperti aplikasi biasa, dan data terakhir tetap terlihat saat offline.",
  },
];

const PREVIEW_CUSTOMERS = [
  { name: "Rudi Hartono", risk: 82, tone: "danger", label: "Risiko Tinggi" },
  { name: "Siti Aminah", risk: 61, tone: "danger", label: "Risiko Tinggi" },
  { name: "Budi Santoso", risk: 14, tone: "success", label: "Aman" },
];

export default function Landing() {
  const navigate = useNavigate();
  const remaining = getRemainingAttempts();

  const [stepsRef, stepsInView] = useScrollReveal();
  const [featuresRef, featuresInView] = useScrollReveal();
  const [proofRef, proofInView] = useScrollReveal();
  const [ctaRef, ctaInView] = useScrollReveal();

  return (
    <main className="page landing">
      {/* ---------- HERO ---------- */}
      <section className="landing-hero-section">
        <PulseHero />
        <div className="landing-hero-scrim" aria-hidden="true" />

        <div className="landing-container landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-topbar">
              <Logo size="sm" />
              <span className="landing-wordmark">ChurnGuard</span>
              <Link to="/login" className="landing-topbar-login">
                Masuk
              </Link>
            </div>

            <span className="landing-eyebrow stagger-item" style={{ "--stagger-index": 0 }}>
              <Sparkles size={14} />
              PWA gratis untuk pemilik UMKM
            </span>

            <h1 className="stagger-item" style={{ "--stagger-index": 1 }}>
              Tahu pelanggan mana yang mau <span className="landing-highlight">kabur</span>
              &nbsp;— sebelum mereka benar-benar pergi.
            </h1>

            <p className="landing-desc stagger-item" style={{ "--stagger-index": 2 }}>
              ChurnGuard membaca data pelanggan yang sudah Anda punya, lalu menandai siapa saja yang berisiko
              berhenti bertransaksi — lengkap dengan alasannya. Tinggal hubungi lewat WhatsApp, tanpa perlu tim data
              analyst.
            </p>

            <div className="landing-actions stagger-item" style={{ "--stagger-index": 3 }}>
              <Link to="/register" className="btn btn-primary">
                Daftar Gratis
                <ArrowRight size={18} />
              </Link>
              <button type="button" className="btn btn-outline" onClick={() => navigate("/trial")}>
                Coba Tanpa Akun
              </button>
            </div>

            {remaining < 3 && (
              <p className="landing-trial-hint stagger-item" style={{ "--stagger-index": 4 }}>
                {remaining > 0
                  ? `Sisa percobaan gratis Anda: ${remaining} dari 3.`
                  : "Percobaan gratis Anda sudah habis. Daftar akun untuk terus memakai ChurnGuard."}
              </p>
            )}

            <dl className="landing-stats stagger-item" style={{ "--stagger-index": 5 }}>
              <div>
                <dt>98,05%</dt>
                <dd>Akurasi model</dd>
              </div>
              <div>
                <dt>&lt;5 detik</dt>
                <dd>Waktu analisis</dd>
              </div>
              <div>
                <dt>3×</dt>
                <dd>Coba gratis tanpa akun</dd>
              </div>
            </dl>
          </div>

          <div className="landing-hero-visual" aria-hidden="true">
            <div className="landing-preview-card stagger-item" style={{ "--stagger-index": 4 }}>
              <div className="landing-preview-header">
                <span>Dashboard</span>
                <span className="landing-preview-live">
                  <span className="landing-preview-dot" />
                  Live
                </span>
              </div>
              {PREVIEW_CUSTOMERS.map((c) => (
                <div className="landing-preview-row" key={c.name}>
                  <span className="landing-preview-avatar">
                    {c.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </span>
                  <span className="landing-preview-name">{c.name}</span>
                  <span className={`badge badge-${c.tone}`}>{c.label}</span>
                </div>
              ))}
            </div>

            <div className="landing-float-card stagger-item" style={{ "--stagger-index": 6 }}>
              <div className="landing-float-header">
                <span className="landing-float-avatar">RH</span>
                <div>
                  <strong>Rudi Hartono</strong>
                  <span>Skor risiko 82%</span>
                </div>
              </div>
              <div className="landing-float-cta">
                <Send size={14} />
                Hubungi via WhatsApp
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CARA KERJA ---------- */}
      <section className={`landing-container landing-section ${stepsInView ? "in-view" : ""}`} ref={stepsRef}>
        <div className="landing-section-heading stagger-item reveal-on-scroll" style={{ "--stagger-index": 0 }}>
          <h2>Tiga langkah, tanpa ribet</h2>
          <p>Dari data mentah jadi daftar aksi nyata — semuanya di dalam satu aplikasi.</p>
        </div>

        <ol className="landing-steps">
          {STEPS.map((step, i) => (
            <li className="landing-step stagger-item reveal-on-scroll" style={{ "--stagger-index": i + 1 }} key={step.title}>
              <span className="landing-step-number">{i + 1}</span>
              <span className="landing-step-icon">
                <step.icon size={20} />
              </span>
              <strong>{step.title}</strong>
              <p>{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- FITUR ---------- */}
      <section className={`landing-features-section ${featuresInView ? "in-view" : ""}`} ref={featuresRef}>
        <div className="landing-orb landing-orb-info" aria-hidden="true" />
        <div className="landing-orb landing-orb-highlight" aria-hidden="true" />

        <div className="landing-container">
          <div className="landing-section-heading stagger-item reveal-on-scroll" style={{ "--stagger-index": 0 }}>
            <h2>Semua yang dibutuhkan, tidak lebih</h2>
            <p>Dibangun khusus untuk pemilik usaha yang sibuk jualan, bukan main data.</p>
          </div>

          <div className="landing-features-grid">
            {FEATURES.map((f, i) => (
              <div
                className="landing-feature-card stagger-item reveal-on-scroll"
                style={{ "--stagger-index": i + 1 }}
                key={f.title}
              >
                <span className="landing-feature-icon">
                  <f.icon size={22} />
                </span>
                <strong>{f.title}</strong>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- BUKTI SINGKAT ---------- */}
      <section className={`landing-container landing-proof ${proofInView ? "in-view" : ""}`} ref={proofRef}>
        <div className="landing-proof-item stagger-item reveal-on-scroll" style={{ "--stagger-index": 0 }}>
          <ShieldCheck size={22} />
          <span>Data Anda terisolasi penuh per akun — tidak pernah bocor ke pengguna lain.</span>
        </div>
        <div className="landing-proof-item stagger-item reveal-on-scroll" style={{ "--stagger-index": 1 }}>
          <Zap size={22} />
          <span>Random Forest teruji, akurasi 98,05% pada data historis pelanggan e-commerce.</span>
        </div>
        <div className="landing-proof-item stagger-item reveal-on-scroll" style={{ "--stagger-index": 2 }}>
          <CheckCircle2 size={22} />
          <span>Coba dulu 3× tanpa daftar — baru putuskan kalau memang cocok untuk usaha Anda.</span>
        </div>
      </section>

      {/* ---------- CTA PENUTUP ---------- */}
      <section className={`landing-cta-section ${ctaInView ? "in-view" : ""}`} ref={ctaRef}>
        <div className="landing-orb landing-orb-cta" aria-hidden="true" />
        <div
          className="landing-container landing-cta text-center stagger-item reveal-on-scroll"
          style={{ "--stagger-index": 0 }}
        >
          <h2>Mulai kenali pelanggan Anda hari ini</h2>
          <p>Gratis untuk dicoba, tanpa kartu kredit, tanpa instalasi rumit.</p>
          <div className="landing-cta-actions">
            <Link to="/register" className="btn btn-primary landing-btn-shimmer">
              Daftar Sekarang
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-outline">
              Sudah Punya Akun
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <Logo size="sm" />
            <span>ChurnGuard</span>
          </div>
          <p>Deteksi dini churn pelanggan untuk UMKM Indonesia.</p>
        </div>
      </footer>
    </main>
  );
}
