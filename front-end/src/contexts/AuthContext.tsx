import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { loginAPI, logoutAPI } from "@/services/api";

export type UserRole = "employee" | "admin" | "owner";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  position: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("restaurant_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("restaurant_user");
    localStorage.removeItem("authToken");
    logoutAPI();
    window.dispatchEvent(new Event("authTokenChanged"));
  }, []);

  // Escuta o evento "auth:unauthorized" emitido por api.ts quando recebe 401.
  // Garante logout automático e redirecionamento para /login.
  useEffect(() => {
    const handle401 = () => {
      logout();
      window.location.replace("/login");
    };
    window.addEventListener("auth:unauthorized", handle401);
    return () => window.removeEventListener("auth:unauthorized", handle401);
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      // Verifica se conta está bloqueada
      if (lockedUntil && Date.now() < lockedUntil) {
        const mins = Math.ceil((lockedUntil - Date.now()) / 60000);
        return {
          success: false,
          message: `Conta bloqueada. Tente novamente em ${mins} minutos.`,
        };
      }
      if (lockedUntil && Date.now() >= lockedUntil) {
        setLockedUntil(null);
        setFailedAttempts(0);
      }

      try {
        // Faz login via API real: POST /api/autenticacao/login com campos email e password
        const response = await loginAPI(email, password);

        const token =
          response.dados?.token ||
          response.Dados?.token ||
          response.token;

        if (token) {
          localStorage.setItem("authToken", token);

          const dados = response.dados || response.Dados || response;
          // Armazena apenas dados não sensíveis — sem senha
          const userData: User = {
            id: String(dados.id || email),
            name: dados.nomeUsuario || dados.name || email,
            email: email,
            role: dados.role || "employee",
            position: dados.position || "Funcionário",
          };

          localStorage.setItem("restaurant_user", JSON.stringify(userData));
          setUser(userData);
          setFailedAttempts(0);
          window.dispatchEvent(new Event("authTokenChanged"));
          return { success: true, message: "Login realizado com sucesso!" };
        }

        // API respondeu com 2xx mas sem token — credenciais rejeitadas
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 5) {
          const lockTime = Date.now() + 15 * 60 * 1000;
          setLockedUntil(lockTime);
          return {
            success: false,
            message: "Muitas tentativas. Conta bloqueada por 15 minutos.",
          };
        }
        return {
          success: false,
          message: `Credenciais inválidas. ${5 - newAttempts} tentativas restantes.`,
        };
      } catch (error: any) {
        const msg: string = error?.message ?? "";

        // Erro de rede (fetch falhou antes de receber resposta)
        if (error instanceof TypeError || msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          return {
            success: false,
            message: "Servidor indisponível. Verifique sua conexão e tente novamente.",
          };
        }

        // 401 ou outras respostas de erro HTTP reportadas pela API
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 5) {
          const lockTime = Date.now() + 15 * 60 * 1000;
          setLockedUntil(lockTime);
          return {
            success: false,
            message: "Muitas tentativas. Conta bloqueada por 15 minutos.",
          };
        }

        // Exibe a mensagem vinda da API, removendo o prefixo interno "[API] ..."
        const apiMsg = msg.replace(/^\[API\][^:]*:\s*/, "").trim();
        return {
          success: false,
          message: apiMsg || `Credenciais inválidas. ${5 - newAttempts} tentativas restantes.`,
        };
      }
    },
    [failedAttempts, lockedUntil],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        failedAttempts,
        lockedUntil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
