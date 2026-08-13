export default function UploadModeTabs({ mode, onChange }) {
  return (
    <div className="upload-tabs">
      <button type="button" className={mode === "file" ? "upload-tab active" : "upload-tab"} onClick={() => onChange("file")}>
        Upload File
      </button>
      <button
        type="button"
        className={mode === "manual" ? "upload-tab active" : "upload-tab"}
        onClick={() => onChange("manual")}
      >
        Input Manual
      </button>
    </div>
  );
}
