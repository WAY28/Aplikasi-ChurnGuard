export function buildWaLink(phone, message) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoLink(email, subject, body) {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function defaultWaMessage(customerName, businessName) {
  const greeting = customerName ? `Halo ${customerName}` : "Halo";
  const sender = businessName || "kami";
  return `${greeting}, kami dari ${sender} kangen nih! Yuk mampir lagi, ada promo menarik menanti Anda 😊`;
}

export function defaultEmailSubject(businessName) {
  return `Kabar dari ${businessName || "kami"} untuk Anda`;
}

export function defaultEmailBody(customerName, businessName) {
  const greeting = customerName ? `Halo ${customerName},` : "Halo,";
  const sender = businessName || "kami";
  return `${greeting}\n\nSudah lama kami tidak melihat Anda bertransaksi. Kami dari ${sender} ingin menawarkan promo khusus untuk Anda. Yuk belanja lagi!\n\nSalam hangat,\n${sender}`;
}
