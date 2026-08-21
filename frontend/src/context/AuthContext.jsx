import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onUnauthorized } from "../api/client";
import * as endpoints from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Token sekarang di cookie httpOnly -- JS tidak bisa membacanya sama sekali,
  // jadi satu-satunya cara tahu "sedang login atau tidak" adalah menanyakan
  // ke server (GET /auth/me). `loading` menahan render rute terproteksi
  // sampai jawabannya diketahui, supaya tidak sempat "kelihatan" redirect ke
  // /login padahal sebenarnya sesi masih valid.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    endpoints
      .getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Dipanggil client.js saat access token kedaluwarsa DAN refresh-nya juga
    // gagal (refresh token habis/direvoke) -- satu-satunya jalan keluar saat
    // itu ya logout di sisi UI (cookie di server sudah tidak valid lagi).
    onUnauthorized(() => {
      setUser(null);
    });
  }, []);

  const login = useCallback(async (email, password) => {
    const me = await endpoints.login({ email, password });
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (businessName, email, password) => {
    const result = await endpoints.registerAccount({
      business_name: businessName,
      email,
      password,
    });
    // api.md: register tidak set cookie, jadi langsung login pakai kredensial yang sama
    const me = await endpoints.login({ email, password });
    setUser(me);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await endpoints.logout(); // revoke refresh token di server, bukan cuma bersih-bersih di sini
    } finally {
      setUser(null);
    }
  }, []);

  // Dipanggil setelah PATCH /account sukses, supaya business_name/email yang
  // ditampilkan (mis. di Navbar) langsung ter-update tanpa perlu reload.
  const updateUser = useCallback((patch) => {
    setUser((prevUser) => ({ ...prevUser, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: !!user, login, register, logout, updateUser }),
    [user, loading, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
