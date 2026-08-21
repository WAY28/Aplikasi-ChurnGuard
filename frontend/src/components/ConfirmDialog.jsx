import { AlertTriangle } from "lucide-react";
import "./ConfirmDialog.css";

// Modal konfirmasi generik dipakai untuk semua aksi hapus (pelanggan, sesi
// upload, akun). `children` opsional dipakai untuk input tambahan (mis. field
// password saat hapus akun).
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  loading = false,
  error = "",
  onConfirm,
  onCancel,
  children,
}) {
  if (!open) return null;

  return (
    <div className="confirm-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </div>
        <h3 id="confirm-dialog-title">{title}</h3>
        {message && <p className="muted">{message}</p>}

        {error && <div className="error-banner">{error}</div>}

        {children}

        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <span className="spinner" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
