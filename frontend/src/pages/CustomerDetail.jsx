import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Mail, MessageCircle, PackageOpen } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Badge from "../components/Badge";
import FeatureImportanceBars from "../components/FeatureImportanceBars";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { getCustomer, updateContactStatus } from "../api/endpoints";
import { buildMailtoLink, buildWaLink, defaultEmailBody, defaultEmailSubject, defaultWaMessage } from "../utils/contact";
import { contactStatusLabel, contactStatusTone, formatDate, formatPercent, riskLabel, riskTone } from "../utils/format";
import { loadCache, saveCache } from "../utils/offlineCache";
import "./CustomerDetail.css";

export default function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const cacheKey = `customer:${id}`;

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [contacting, setContacting] = useState(null); // "wa" | "email" | null

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotFound(false);
    setFromCache(false);
    try {
      const data = await getCustomer(id);
      setCustomer(data);
      saveCache(cacheKey, data);
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
        return;
      }
      const cached = loadCache(cacheKey);
      if (cached) {
        setCustomer(cached.data);
        setFromCache(true);
      } else {
        setError(err.message || "Gagal memuat detail pelanggan");
      }
    } finally {
      setLoading(false);
    }
  }, [id, cacheKey]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  async function handleContact(channel) {
    setContacting(channel);
    try {
      const statusValue = channel === "wa" ? "dihubungi_wa" : "dihubungi_email";
      const updated = await updateContactStatus(id, statusValue);
      setCustomer((prev) => ({ ...prev, contact_status: updated.contact_status, contacted_at: updated.contacted_at }));

      if (channel === "wa") {
        const link = buildWaLink(customer.phone, defaultWaMessage(customer.name, user?.business_name));
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        const link = buildMailtoLink(
          customer.email,
          defaultEmailSubject(user?.business_name),
          defaultEmailBody(customer.name, user?.business_name),
        );
        window.location.href = link;
      }
    } catch (err) {
      setError(err.message || "Gagal memperbarui status kontak");
    } finally {
      setContacting(null);
    }
  }

  if (loading) return <LoadingSpinner label="Memuat detail pelanggan..." />;

  if (notFound) {
    return (
      <EmptyState
        title="Pelanggan tidak ditemukan"
        description="Data mungkin sudah dihapus atau bukan milik akun ini."
        action={
          <Link to="/dashboard" className="btn btn-primary">
            Kembali ke Dashboard
          </Link>
        }
      />
    );
  }

  if (!customer) {
    return <div className="error-banner">{error || "Terjadi kesalahan"}</div>;
  }

  return (
    <div className="stack">
      <Link to="/dashboard" className="link-button">
        <ArrowLeft size={16} />
        <span>Kembali ke Dashboard</span>
      </Link>

      {fromCache && (
        <div className="info-notice">
          <PackageOpen size={18} />
          <span>Menampilkan data tersimpan terakhir. Ini mode offline, jadi datanya mungkin tidak terbaru.</span>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="card customer-detail-header">
        <div>
          <h1>{customer.name || "Tanpa nama"}</h1>
          <div className="row">
            <Badge tone={riskTone(customer.churn_prediction)}>{riskLabel(customer.churn_prediction)}</Badge>
            <Badge tone={contactStatusTone(customer.contact_status)}>{contactStatusLabel(customer.contact_status)}</Badge>
          </div>
          {customer.contacted_at && (
            <p className="muted" style={{ marginTop: "var(--space-2)" }}>
              Terakhir dihubungi: {formatDate(customer.contacted_at)}
            </p>
          )}
        </div>
        <div className="customer-detail-score">
          <div className={`customer-detail-score-value tone-${riskTone(customer.churn_prediction)}`}>
            {formatPercent(customer.churn_probability)}
          </div>
          <div className="muted">skor risiko churn</div>
        </div>
      </div>

      <div className="card">
        <h3>Faktor Utama Penyebab</h3>
        <FeatureImportanceBars factors={customer.top_factors} />
      </div>

      <div className="card">
        <h3>Tindak Lanjut</h3>
        <p>Hubungi pelanggan ini langsung dari sini. Status kontak akan otomatis tercatat.</p>
        <div className="contact-actions">
          <button
            type="button"
            className="btn btn-success btn-block"
            disabled={!customer.phone || contacting !== null || fromCache}
            onClick={() => handleContact("wa")}
          >
            {contacting === "wa" ? (
              <span className="spinner" />
            ) : (
              <>
                <MessageCircle size={18} />
                <span>Hubungi via WhatsApp</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-info btn-block"
            disabled={!customer.email || contacting !== null || fromCache}
            onClick={() => handleContact("email")}
          >
            {contacting === "email" ? (
              <span className="spinner" />
            ) : (
              <>
                <Mail size={18} />
                <span>Kirim Email</span>
              </>
            )}
          </button>
        </div>
        {!customer.phone && !customer.email && (
          <p className="field-error">Pelanggan ini tidak punya nomor telepon maupun email.</p>
        )}
        {fromCache && <p className="field-error">Tidak bisa menghubungi pelanggan saat offline.</p>}
      </div>

      <div className="card">
        <h3>Detail Data</h3>
        <dl className="detail-grid">
          <DetailItem label="Telepon" value={customer.phone || "-"} />
          <DetailItem label="Email" value={customer.email || "-"} />
          <DetailItem label="Lama Berlangganan" value={customer.tenure ?? "-"} />
          <DetailItem label="Skor Kepuasan" value={customer.satisfaction_score ?? "-"} />
          <DetailItem label="Jumlah Order" value={customer.order_count ?? "-"} />
          <DetailItem label="Hari Sejak Order Terakhir" value={customer.day_since_last_order ?? "-"} />
          <DetailItem label="Metode Pembayaran" value={customer.preferred_payment_mode || "-"} />
          <DetailItem label="Kategori Favorit" value={customer.prefered_order_cat || "-"} />
        </dl>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
