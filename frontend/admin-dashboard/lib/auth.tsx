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
import { useRouter } from "next/navigation";
import {
  apiLogin,
  decodeRole,
  restoreSession,
  setAccessToken,
  type AuthUser,
} from "./api";

const USER_KEY = "volt-admin-user-v1";

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Intentional hydration gate: localStorage is unavailable during SSR, so
    // the persisted session applies on mount to avoid a hydration mismatch.
    // The access token itself lives only in memory, so re-issue it from the
    // refresh cookie — otherwise post-reload API calls carry no bearer token.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const persisted = loadUser();
    if (!persisted) {
      setReady(true);
    } else {
      restoreSession().then((fresh) => {
        if (fresh) {
          setAccessToken(fresh);
          setUser(persisted);
        } else {
          try {
            localStorage.removeItem(USER_KEY);
          } catch {
            /* ignore */
          }
          setUser(null);
        }
        setReady(true);
      });
    }
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
    if (decodeRole(accessToken) !== "admin" && u.role !== "admin") {
      throw new Error("This account is not an admin — ops access denied.");
    }
    setAccessToken(accessToken);
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      /* ignore */
    }
  }, []);

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
    () => ({ user, ready, login, logout }),
    [user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Redirects to /login unless an admin session is ready. Returns readiness. */
export function useRequireAdmin(): { ready: boolean; user: AuthUser | null } {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      router.replace(`/login?next=${next}`);
    }
  }, [ready, user, router]);
  return { ready, user };
}
