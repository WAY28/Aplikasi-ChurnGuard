import { useEffect, useRef, useState } from "react";

// Trigger sekali saat elemen masuk viewport (bukan tiap scroll bolak-balik --
// disconnect setelah kelihatan sekali, supaya tidak "berkedip" kalau user
// scroll naik-turun). Dipakai buat reveal section di bawah hero yang lipat
// layar pertama, yang sebelumnya cuma animasi sekali pas mount (jadi statis
// begitu di-scroll ke situ).
export function useScrollReveal(options) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px", ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}
