import { CATEGORY_OPTIONS, MANUAL_FORM_FIELDS } from "../utils/customerFields";

export default function CustomerFeatureForm({ form, onChange, idPrefix = "m" }) {
  return (
    <>
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${idPrefix}-name`}>Nama (opsional)</label>
          <input id={`${idPrefix}-name`} value={form.name} onChange={(e) => onChange("name", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-phone`}>Nomor telepon (opsional)</label>
          <input id={`${idPrefix}-phone`} value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-email`}>Email (opsional)</label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
        />
      </div>

      <div className="form-grid">
        {MANUAL_FORM_FIELDS.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={`${idPrefix}-${field.name}`}>{field.label}</label>
            {field.type === "select" ? (
              <select
                id={`${idPrefix}-${field.name}`}
                value={form[field.name]}
                onChange={(e) => onChange(field.name, e.target.value)}
              >
                {CATEGORY_OPTIONS[field.name].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`${idPrefix}-${field.name}`}
                type="number"
                step={field.step}
                required
                value={form[field.name]}
                onChange={(e) => onChange(field.name, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <label className="checkbox-field">
        <input type="checkbox" checked={form.complain} onChange={(e) => onChange("complain", e.target.checked)} />
        Pernah komplain sebelumnya
      </label>
    </>
  );
}
