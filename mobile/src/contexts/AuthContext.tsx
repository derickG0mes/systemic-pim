import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { router } from "expo-router";
import { clearCache } from "../services/cache";
import { login as loginRequest, logout as logoutRequest, validateSession } from "../services/api";
import { unregisterPushNotificationsAsync } from "../services/pushRegistration";
import { setUnauthorizedHandler } from "../services/http";
import type { AuthenticatedProfile } from "../types/api";

interface AuthContextValue {
  user: AuthenticatedProfile | null;
  ready: boolean;
  startupError: string;
  login: (email: string, password: string) => Promise<AuthenticatedProfile>;
  logout: () => Promise<void>;
  retryStartup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function checkSession(): Promise<{ profile: AuthenticatedProfile | null; error: string }> {
  try {
    return { profile: await validateSession(), error: "" };
  } catch (error) {
    return {
      profile: null,
      error: error instanceof Error ? error.message : "Falha ao validar a sessão.",
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [startupError, setStartupError] = useState("");

  useEffect(() => {
    let active = true;
    void checkSession().then((result) => {
      if (!active) return;
      setUser(result.profile);
      setStartupError(result.error);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const retryStartup = useCallback(async () => {
    setReady(false);
    setStartupError("");
    const result = await checkSession();
    setUser(result.profile);
    setStartupError(result.error);
    setReady(true);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setStartupError("");
    router.replace("/login");
    void clearCache().catch((error: unknown) => {
      console.error("Não foi possível limpar o cache local após encerrar a sessão.", error);
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    await loginRequest(email, password);
    const profile = await validateSession();
    if (!profile) {
      throw new Error("A API não confirmou a sessão após o login. Verifique a persistência do cookie systemic_auth.");
    }
    setUser(profile);
    setStartupError("");
    setReady(true);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setStartupError("");
    // Deixa de receber push desta conta neste aparelho. Precisa ocorrer antes do logout no
    // servidor (o endpoint exige a sessão). Falhas aqui não impedem o encerramento da sessão.
    await unregisterPushNotificationsAsync().catch((error: unknown) => {
      console.warn("Não foi possível remover o registro de push deste aparelho.", error);
    });
    let logoutError: unknown;
    try {
      await logoutRequest();
    } catch (error) {
      logoutError = error;
    }
    try {
      await clearCache();
    } catch (error) {
      if (!logoutError) logoutError = error;
    }
    if (logoutError) {
      throw logoutError instanceof Error
        ? logoutError
        : new Error("Não foi possível concluir o logout no servidor ou limpar o cache local.");
    }
  }, []);

  const value = useMemo(
    () => ({ user, ready, startupError, login, logout, retryStartup }),
    [user, ready, startupError, login, logout, retryStartup],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}
