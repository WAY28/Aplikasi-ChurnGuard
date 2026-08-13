import { useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../components/Badge";
import Dropzone from "../components/Dropzone";
import UploadModeTabs from "../components/UploadModeTabs";
import CustomerFeatureForm from "../components/CustomerFeatureForm";
import EmptyState from "../components/EmptyState";
import FeatureImportanceBars from "../components/FeatureImportanceBars";
import { trialPredict, trialUpload } from "../api/endpoints";
import { ApiError } from "../api/client";
import { downloadTemplateCsv } from "../utils/csvTemplate";
import { buildCustomerPayload, emptyManualForm } from "../utils/customerFields";
import { formatPercent, riskLabel, riskTone } from "../utils/format";
import { useOnlineStatus } from "../utils/useOnlineStatus";
import { MAX_TRIAL_ATTEMPTS, getAttemptsUsed, hasTrialAttemptsLeft, recordTrialAttempt } from "../utils/trial";

export default function TrialUpload() {
  const navigate = useNavigate();
  const offline = !useOnlineStatus();

  const [attemptsUsed, setAttemptsUsed] = useState(getAttemptsUsed());
  const [mode, setMode] = useState("file");

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [form, setForm] = useState(emptyManualForm());
  const [submitting, setSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualResult, setManualResult] = useState(null);

  const attemptsLeft = MAX_TRIAL_ATTEMPTS - attemptsUsed;

  // Jangan tampilkan layar "habis" kalau ada hasil prediksi yang baru saja
  // didapat (percobaan terakhir) supaya hasilnya sempat terlihat dulu.
  if (!hasTrialAttemptsLeft() && attemptsUsed >= MAX_TRIAL_ATTEMPTS && !manualResult) {
    return (
      <EmptyState
        icon={Sparkles}
        tone="highlight"
        title="Percobaan gratis Anda sudah habis"
        description="Anda sudah mencoba ChurnGuard sebanyak 3 kali dari perangkat ini. Daftar akun gratis untuk terus menganalisis data pelanggan dan menyimpan riwayatnya."
        action={
          <Link to="/register" className="btn btn-primary">
            Daftar Sekarang
          </Link>
        }
      />
    );
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError("");
    try {
      const result = await trialUpload(selectedFile);
      recordTrialAttempt();
      navigate("/trial/results", { state: result });
    } catch (err) {
      setUploadError(err.message || "Gagal memproses file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    setManualError("");
    setManualResult(null);
    setSubmitting(true);
    try {
      const payload = buildCustomerPayload(form);
      const result = await trialPredict(payload);
      recordTrialAttempt();
      setAttemptsUsed(getAttemptsUsed());
      setManualResult(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setManualError(err.message || "Data tidak valid. Periksa kembali isian Anda.");
      } else {
        setManualError(err.message || "Gagal memproses data pelanggan.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetManualForm() {
    setForm(emptyManualForm());
    setManualResult(null);
    setManualError("");
  }

  return (
    <div className="stack">
      <div>
        <h1>Coba ChurnGuard</h1>
        <p>Coba analisis data pelanggan tanpa mendaftar. Hasilnya langsung tampil, tapi tidak disimpan.</p>
      </div>

      <div className="info-notice info-notice-highlight">
        <Sparkles size={18} />
        <span>
          {manualResult
            ? `Anda baru memakai percobaan ke ${attemptsUsed} dari ${MAX_TRIAL_ATTEMPTS}.`
            : `Ini percobaan ke ${attemptsUsed + 1} dari ${MAX_TRIAL_ATTEMPTS}. Sisa ${attemptsLeft - 1} kali setelah ini.`}
        </span>
      </div>

      <UploadModeTabs mode={mode} onChange={setMode} />

      {mode === "file" && (
        <div className="card stack">
          {uploadError && <div className="error-banner">{uploadError}</div>}

          <Dropzone selectedFile={selectedFile} onFileSelected={setSelectedFile} onError={setUploadError} />

          <button type="button" className="link-button" onClick={downloadTemplateCsv}>
            <Download size={16} />
            <span>Unduh template contoh (.csv)</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!selectedFile || uploading || offline}
            onClick={handleAnalyze}
          >
            {uploading ? <span className="spinner" /> : "Analisis"}
          </button>
          {offline && <p className="field-error">Tidak bisa upload saat offline. Sambungkan internet, lalu coba lagi.</p>}
        </div>
      )}

      {mode === "manual" && (
        <div className="card">
          {manualError && <div className="error-banner">{manualError}</div>}

          {manualResult ? (
            <div className="stack">
              <div className="text-center stack">
                <h3>Hasil Prediksi</h3>
                <Badge tone={riskTone(manualResult.churn_prediction)}>{riskLabel(manualResult.churn_prediction)}</Badge>
                <div className="big-score">{formatPercent(manualResult.churn_probability)}</div>
                <p className="muted">Skor risiko churn pelanggan ini.</p>
              </div>

              <div>
                <h4>Faktor Utama Penyebab</h4>
                <FeatureImportanceBars factors={manualResult.top_factors} />
              </div>

              <div className="row" style={{ justifyContent: "center" }}>
                {attemptsLeft > 0 ? (
                  <button type="button" className="btn btn-primary" onClick={resetManualForm}>
                    Coba Lagi
                  </button>
                ) : (
                  <Link to="/register" className="btn btn-primary">
                    Daftar Akun
                  </Link>
                )}
                <Link to="/" className="btn btn-outline">
                  Ke Beranda
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="stack">
              <CustomerFeatureForm form={form} onChange={updateField} idPrefix="trial" />

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting || offline}>
                {submitting ? <span className="spinner" /> : "Prediksi"}
              </button>
              {offline && <p className="field-error">Tidak bisa memprediksi saat offline.</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
