import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import "./Dropzone.css";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function Dropzone({ selectedFile, onFileSelected, onError }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  function validateAndSet(file) {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const validExt = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!validExt) {
      onError("Format file harus .csv atau .xlsx.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      onError("Ukuran file maksimal 5 MB.");
      return;
    }
    onError("");
    onFileSelected(file);
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  return (
    <div
      className={dragActive ? "dropzone dropzone-active" : "dropzone"}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        validateAndSet(e.dataTransfer.files?.[0]);
      }}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        hidden
        onChange={(e) => validateAndSet(e.target.files?.[0])}
      />
      <div className="dropzone-icon">
        <FileUp size={26} />
      </div>
      {selectedFile ? (
        <>
          <strong>{selectedFile.name}</strong>
          <span className="muted">{(selectedFile.size / 1024).toFixed(0)} KB. Klik untuk ganti file.</span>
        </>
      ) : (
        <>
          <strong>Tarik dan letakkan file di sini</strong>
          <span className="muted">Atau klik untuk memilih file. Format .csv atau .xlsx, maksimal 5 MB.</span>
        </>
      )}
    </div>
  );
}
