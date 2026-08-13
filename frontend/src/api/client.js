const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const TOKEN_KEY = "churnguard_token";

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Dipanggil dari luar (lihat AuthContext) saat token basi/invalid (401) supaya
// seluruh aplikasi ter-logout serentak, bukan cuma request yang gagal.
let unauthorizedHandler = null;
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

async function request(path, { method = "GET", body, isForm = false, auth = true } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Tidak bisa terhubung ke server. Periksa koneksi internet Anda.", 0, null);
  }

  if (response.status === 401 && auth) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    let detail = null;
    try {
      const data = await response.json();
      detail = data.detail;
    } catch {
      /* body bukan JSON, biarkan detail null */
    }
    const message = formatErrorDetail(detail) || `Permintaan gagal (${response.status})`;
    throw new ApiError(message, response.status, detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

function formatErrorDetail(detail) {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // error validasi Pydantic (422)
    return detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
  }
  return JSON.stringify(detail);
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  postForm: (path, formData, opts) => request(path, { ...opts, method: "POST", body: formData, isForm: true }),
};
