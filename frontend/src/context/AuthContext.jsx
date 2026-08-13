import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getToken, onUnauthorized, setToken as persistToken } from "../api/client";
import * as endpoints from "../api/endpoints";

const USER_KEY = "churnguard_user";
const AuthContext = createContext(null);

function decodeJwtExp(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  if (!token) return false;
  const expMs = decodeJwtExp(token);
  if (!expMs) return true; // tidak bisa dibaca, anggap valid, biar backend yang tolak kalau salah
  return Date.now() < expMs;
}

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    const stored = getToken();
    return isTokenValid(stored) ? stored : null;
  });
  const [user, setUser] = useState(() => (token ? loadStoredUser() : null));

  useEffect(() => {
    // NFR-3: token 24 jam -- kalau sesi kadaluarsa saat request lain (401), logout otomatis
    onUnauthorized(() => {
      persistToken(null);
      localStorage.removeItem(USER_KEY);
      setTokenState(null);
      setUser(null);
    });
  }, []);

  async function login(email, password) {
    const result = await endpoints.login({ email, password });
    persistToken(result.access_token);
    setTokenState(result.access_token);
    const nextUser = { email, business_name: user?.email === email ? user.business_name : null };
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return result;
  }

  async function register(businessName, email, password) {
    const result = await endpoints.registerAccount({
      business_name: businessName,
      email,
      password,
    });
    // api.md: register tidak mengembalikan token, jadi langsung login pakai kredensial yang sama
    const loginResult = await endpoints.login({ email, password });
    persistToken(loginResult.access_token);
    setTokenState(loginResult.access_token);
    const nextUser = { email: result.email, business_name: result.business_name };
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return result;
  }

  function logout() {
    persistToken(null);
    localStorage.removeItem(USER_KEY);
    setTokenState(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ token, user, isAuthenticated: !!token, login, register, logout }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
