"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  apiLogin,
  apiPutCartItem,
  apiRegister,
  setAccessToken,
  type AuthUser,
} from "./api";
import { productById } from "./cart";
import { skuFor } from "./productDetails";

const USER_KEY = "volt-user-v1";
const CART_KEY = "volt-cart-v1";

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// Best-effort: copy the anonymous basket to the server cart after sign-in so
// it survives across devices. Failures are swallowed (local basket is king).
async function pushLocalCartToServer(userId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { lines?: { id: string; qty: number }[] };
    const lines = Array.isArray(parsed.lines) ? parsed.lines : [];
    for (const line of lines) {
      const p = productById(line.id);
      if (!p) continue;
      await apiPutCartItem(userId, skuFor(p), Math.max(1, line.qty)).catch(
        () => undefined,
      );
    }
  } catch {
    /* keep shopping locally */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Intentional hydration gate: localStorage is unavailable during SSR, so
    // the persisted session applies on mount to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(loadUser());
    setReady(true);
    const onExpired = () => {
      setAccessToken(null);
      setUser(null);
      try {
        localStorage.removeItem(USER_KEY);
      } catch {
        /* ignore */
      }
    };
    const onRefreshed = (e: Event) => {
      setAccessToken((e as CustomEvent<string>).detail);
    };
    window.addEventListener("auth:expired", onExpired);
    window.addEventListener("auth:refreshed", onRefreshed as EventListener);
    return () => {
      window.removeEventListener("auth:expired", onExpired);
      window.removeEventListener("auth:refreshed", onRefreshed as EventListener);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user: u } = await apiLogin(email, password);
    setAccessToken(accessToken);
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      /* ignore */
    }
    void pushLocalCartToServer(u.id);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await apiRegister(email, password);
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
