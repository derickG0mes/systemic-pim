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
    void logoutAPI().catch((error: unknown) => {
      console.error("Não foi possível encerrar a sessão no servidor:", error);
    });
    window.dispatchEvent(new Event("authSessionChanged"));
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

        if (response.sucesso === true || response.success === true) {
          const dados = response.dados || response.Dados || response;
          const userData: User = {
            id: String(dados.id || dados.idFuncionario || email),
            name: dados.nomeUsuario || dados.nomeFuncionario || dados.name || email,
            email,
            role: dados.role || "employee",
            position: dados.position || "Funcionário",
          };

          localStorage.setItem("restaurant_user", JSON.stringify(userData));
          setUser(userData);
          setFailedAttempts(0);
          window.dispatchEvent(new Event("authSessionChanged"));
          return { success: true, message: "Login realizado com sucesso!" };
        }

        // A resposta bem-sucedida precisa confirmar explicitamente o login.
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
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "";

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
