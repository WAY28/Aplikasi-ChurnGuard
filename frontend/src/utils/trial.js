// Hitungan percobaan mode trial (tanpa akun) disimpan di localStorage milik
// browser ini saja, bukan di backend (lihat api.md bagian "Trial Tanpa Akun").
const STORAGE_KEY = "churnguard_trial_attempts";
export const MAX_TRIAL_ATTEMPTS = 3;

export function getAttemptsUsed() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function getRemainingAttempts() {
  return Math.max(0, MAX_TRIAL_ATTEMPTS - getAttemptsUsed());
}

export function hasTrialAttemptsLeft() {
  return getRemainingAttempts() > 0;
}

export function recordTrialAttempt() {
  const next = getAttemptsUsed() + 1;
  localStorage.setItem(STORAGE_KEY, String(next));
  return next;
}
