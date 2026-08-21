export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HINT = "Minimal 8 karakter, kombinasi huruf dan angka";

// Cermin dari _validate_password_strength di backend/schemas.py -- validasi di sini
// cuma buat UX cepat (feedback tanpa round-trip), backend tetap sumber kebenaran.
export function passwordError(password) {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  if (!/[A-Za-z]/.test(password)) return "Password harus mengandung minimal satu huruf.";
  if (!/\d/.test(password)) return "Password harus mengandung minimal satu angka.";
  return null;
}
