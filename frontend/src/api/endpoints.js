import { api } from "./client";

// ---- Auth ----
// `login`/`registerAccount` tidak lagi mengembalikan token di body -- token
// dikirim backend lewat cookie httpOnly (Set-Cookie), tidak pernah terlihat
// oleh JS. `{ auth: false }` di sini artinya "401 di sini = kredensial salah,
// jangan coba refresh" (lihat api/client.js).
export const registerAccount = (payload) => api.post("/auth/register", payload, { auth: false });
export const login = (payload) => api.post("/auth/login", payload, { auth: false });
export const logout = () => api.post("/auth/logout", undefined, { auth: false });
export const getMe = () => api.get("/auth/me");
export const forgotPassword = (email) => api.post("/auth/forgot-password", { email }, { auth: false });
export const resetPassword = (token, newPassword) =>
  api.post("/auth/reset-password", { token, new_password: newPassword }, { auth: false });

// ---- Customers ----
export const createCustomer = (payload) => api.post("/customers", payload);

export function uploadCustomers(file) {
  const formData = new FormData();
  formData.append("file", file);
  return api.postForm("/customers/upload", formData);
}

export function listCustomers({ uploadSessionId, search, risk, contactStatus, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (uploadSessionId) params.set("upload_session_id", uploadSessionId);
  if (search) params.set("search", search);
  if (risk !== undefined && risk !== null && risk !== "") params.set("risk", risk);
  if (contactStatus) params.set("contact_status", contactStatus);
  params.set("page", page);
  params.set("limit", limit);
  return api.get(`/customers?${params.toString()}`);
}

export const getCustomer = (id) => api.get(`/customers/${id}`);

export const updateContactStatus = (id, contactStatus) =>
  api.patch(`/customers/${id}/contact`, { contact_status: contactStatus });

export const deleteCustomer = (id) => api.del(`/customers/${id}`);

// ---- Upload sessions ----
export function listUploadSessions({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api.get(`/upload-sessions?${params.toString()}`);
}

export const deleteUploadSession = (id) => api.del(`/upload-sessions/${id}`);

// ---- Account ----
export const updateAccount = (payload) => api.patch("/account", payload);
export const deleteAccount = (password) => api.del("/account", { password });

// ---- Trial tanpa akun (publik, tidak disimpan ke database) ----
export const trialPredict = (payload) => api.post("/trial/predict", payload, { auth: false });

export function trialUpload(file) {
  const formData = new FormData();
  formData.append("file", file);
  return api.postForm("/trial/upload", formData, { auth: false });
}
