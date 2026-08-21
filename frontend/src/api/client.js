const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// Dipanggil dari luar (lihat AuthContext) saat sesi benar-benar tidak bisa
// dipulihkan lagi (access token kedaluwarsa DAN refresh gagal), supaya
// seluruh aplikasi ter-logout serentak, bukan cuma request yang gagal.
let unauthorizedHandler = null;
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

function rawFetch(path, { method, body, isForm, headers }) {
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    // WAJIB: token sekarang di cookie httpOnly (bukan localStorage), jadi
    // fetch harus eksplisit ikut kirim/terima cookie lintas origin.
    credentials: "include",
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
}

// Dedupe: kalau beberapa request gagal 401 bersamaan, semuanya nunggu SATU
// panggilan /auth/refresh yang sama, bukan masing-masing refresh sendiri-sendiri.
let refreshPromise = null;
function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = rawFetch("/auth/refresh", { method: "POST" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request(path, { method = "GET", body, isForm = false, auth = true } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await rawFetch(path, { method, body, isForm, headers });
  } catch {
    throw new ApiError("Tidak bisa terhubung ke server. Periksa koneksi internet Anda.", 0, null);
  }

  // `auth: false` dipakai endpoint publik (login/register/forgot-password/trial)
  // -- 401 di situ artinya "kredensial salah", BUKAN "sesi kedaluwarsa", jadi
  // tidak boleh memicu coba-refresh atau auto-logout.
  if (response.status === 401 && auth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      try {
        response = await rawFetch(path, { method, body, isForm, headers }); // retry sekali
      } catch {
        throw new ApiError("Tidak bisa terhubung ke server. Periksa koneksi internet Anda.", 0, null);
      }
    }
    if (response.status === 401) {
      unauthorizedHandler?.();
    }
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
  del: (path, body, opts) => request(path, { ...opts, method: "DELETE", body }),
  postForm: (path, formData, opts) => request(path, { ...opts, method: "POST", body: formData, isForm: true }),
};
