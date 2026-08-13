import { api } from "./client";

// ---- Auth ----
export const registerAccount = (payload) => api.post("/auth/register", payload, { auth: false });
export const login = (payload) => api.post("/auth/login", payload, { auth: false });

// ---- Customers ----
export const createCustomer = (payload) => api.post("/customers", payload);

export function uploadCustomers(file) {
  const formData = new FormData();
  formData.append("file", file);
  return api.postForm("/customers/upload", formData);
}

export function listCustomers(uploadSessionId) {
  const query = uploadSessionId ? `?upload_session_id=${uploadSessionId}` : "";
  return api.get(`/customers${query}`);
}

export const getCustomer = (id) => api.get(`/customers/${id}`);

export const updateContactStatus = (id, contactStatus) =>
  api.patch(`/customers/${id}/contact`, { contact_status: contactStatus });

// ---- Upload sessions ----
export const listUploadSessions = () => api.get("/upload-sessions");

// ---- Trial tanpa akun (publik, tidak disimpan ke database) ----
export const trialPredict = (payload) => api.post("/trial/predict", payload, { auth: false });

export function trialUpload(file) {
  const formData = new FormData();
  formData.append("file", file);
  return api.postForm("/trial/upload", formData, { auth: false });
}
