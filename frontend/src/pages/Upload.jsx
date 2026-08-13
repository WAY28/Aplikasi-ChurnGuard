import { useState } from "react";
import { Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Badge from "../components/Badge";
import Dropzone from "../components/Dropzone";
import UploadModeTabs from "../components/UploadModeTabs";
import CustomerFeatureForm from "../components/CustomerFeatureForm";
import { createCustomer, uploadCustomers } from "../api/endpoints";
import { ApiError } from "../api/client";
import { downloadTemplateCsv } from "../utils/csvTemplate";
import { buildCustomerPayload, emptyManualForm } from "../utils/customerFields";
import { formatPercent, riskLabel, riskTone } from "../utils/format";
import { useOnlineStatus } from "../utils/useOnlineStatus";

export default function Upload() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("file"); // "file" | "manual"

  // -- mode file --
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // -- mode manual --
  const [form, setForm] = useState(emptyManualForm());
  const [submitting, setSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualResult, setManualResult] = useState(null);

  const offline = !useOnlineStatus();

  async function handleAnalyze() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError("");
    try {
      const result = await uploadCustomers(selectedFile);
      navigate(`/dashboard?upload_session_id=${result.upload_session_id}`);
    } catch (err) {
      setUploadError(err.message || "File gagal diproses. Pastikan kolomnya sesuai template, lalu coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    setManualError("");
    setManualResult(null);
    setSubmitting(true);
    try {
      const payload = buildCustomerPayload(form);
      const result = await createCustomer(payload);
      setManualResult(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setManualError(err.message || "Data tidak valid. Periksa kembali isian Anda.");
      } else {
        setManualError(err.message || "Gagal memproses data pelanggan. Periksa koneksi internet Anda, lalu coba lagi.");
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
        <h1>Upload Data Pelanggan</h1>
        <p>Unggah file CSV atau Excel berisi banyak pelanggan sekaligus. Atau, input satu pelanggan secara manual.</p>
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
            <div className="manual-result stack text-center">
              <h3>Hasil Prediksi</h3>
              <Badge tone={riskTone(manualResult.churn_prediction)}>{riskLabel(manualResult.churn_prediction)}</Badge>
              <div className="big-score">{formatPercent(manualResult.churn_probability)}</div>
              <p className="muted">Skor risiko churn pelanggan ini.</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate(`/customers/${manualResult.id}`)}
                >
                  Lihat Detail
                </button>
                <button type="button" className="btn btn-outline" onClick={() => navigate("/dashboard")}>
                  Ke Dashboard
                </button>
              </div>
              <button type="button" className="link-button" onClick={resetManualForm}>
                Input pelanggan lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="stack">
              <CustomerFeatureForm form={form} onChange={updateField} />

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
