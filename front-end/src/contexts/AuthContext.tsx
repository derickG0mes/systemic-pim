import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import {
  getAuthenticatedProfileAPI,
  loginAPI,
  logoutAPI,
} from "@/services/api";

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
  authReady: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

function parseUserRole(role: unknown): UserRole | null {
  return role === "employee" || role === "admin" || role === "owner"
    ? role
    : null;
}

function getStoredUserDetails(): Pick<User, "email" | "position"> {
  try {
    const saved = localStorage.getItem("restaurant_user");
    const user = saved ? JSON.parse(saved) : null;
    return {
      email: typeof user?.email === "string" ? user.email : "",
      position:
        typeof user?.position === "string" ? user.position : "Funcionário",
    };
  } catch (error) {
    console.error("Não foi possível ler os dados locais do perfil:", error);
    localStorage.removeItem("restaurant_user");
    return { email: "", position: "Funcionário" };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const sessionVersion = useRef(0);

  useEffect(() => {
    let active = true;
    const validationVersion = sessionVersion.current;

    void getAuthenticatedProfileAPI()
      .then((profile) => {
        if (!active || validationVersion !== sessionVersion.current) return;

        if (!profile) {
          setUser(null);
          localStorage.removeItem("restaurant_user");
          window.dispatchEvent(new Event("authSessionChanged"));
          return;
        }

        const role = parseUserRole(profile.role);
        if (!role) {
          throw new Error("A API retornou um papel de usuário desconhecido.");
        }

        const userData: User = {
          id: String(profile.id),
          name: profile.nome,
          role,
          ...getStoredUserDetails(),
        };
        setUser(userData);
        localStorage.setItem("restaurant_user", JSON.stringify(userData));
        window.dispatchEvent(new Event("authSessionChanged"));
      })
      .catch((error: unknown) => {
        if (!active || validationVersion !== sessionVersion.current) return;
        console.error("Não foi possível validar a sessão no servidor:", error);
        setUser(null);
        localStorage.removeItem("restaurant_user");
        window.dispatchEvent(new Event("authSessionChanged"));
      })
      .finally(() => {
        if (active && validationVersion === sessionVersion.current) {
          setAuthReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(() => {
    sessionVersion.current += 1;
    setUser(null);
    setAuthReady(true);
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
          const role = parseUserRole(dados.role);
          if (!role) {
            const error = new Error(
              "A API não retornou um papel de usuário válido.",
            );
            console.error(error.message);
            return { success: false, message: error.message };
          }
          const userData: User = {
            id: String(dados.id || dados.idFuncionario || email),
            name: dados.nomeUsuario || dados.nomeFuncionario || dados.name || email,
            email,
            role,
            position: dados.position || "Funcionário",
          };

          sessionVersion.current += 1;
          localStorage.setItem("restaurant_user", JSON.stringify(userData));
          setUser(userData);
          setAuthReady(true);
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
        authReady,
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
