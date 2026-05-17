import React, {
  createContext,
  useContext,
  useState,
  useCallback,
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
  registeredUsers: (User & { password: string })[];
}

const AuthContext = createContext<AuthContextType | null>(null);

// Usuários de teste (fallback se a API não estiver disponível)
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: "1",
    name: "Carlos Silva",
    email: "admin@restaurante.com",
    password: "admin123",
    role: "admin",
    position: "Gerente",
  },
  {
    id: "2",
    name: "Maria Santos",
    email: "owner@restaurante.com",
    password: "owner123",
    role: "owner",
    position: "Proprietário",
  },
  {
    id: "3",
    name: "João Oliveira",
    email: "garcom@restaurante.com",
    password: "garcom123",
    role: "employee",
    position: "Garçom",
  },
  {
    id: "4",
    name: "Ana Costa",
    email: "cozinha@restaurante.com",
    password: "cozinha123",
    role: "employee",
    position: "Cozinheiro",
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("restaurant_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<
    (User & { password: string })[]
  >(() => {
    const storedUsers = localStorage.getItem("registered_users");
    let additionalUsers: (User & { password: string })[] = [];

    if (storedUsers) {
      try {
        additionalUsers = JSON.parse(storedUsers);
      } catch (e) {
        additionalUsers = [];
      }
    }

    const combined = [...MOCK_USERS];
    additionalUsers.forEach((newUser) => {
      if (!combined.find((u) => u.email === newUser.email)) {
        combined.push(newUser);
      }
    });

    return combined;
  });

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
        // Tenta fazer login com a API do backend
        const response = await loginAPI(email, password);

        // Backend retorna { sucesso: bool, dados: { token, nomeUsuario } }
        if (response.sucesso || response.dados?.token || response.token) {
          const dados = response.dados || response;
          const userData: User = {
            id: String(dados.id || email),
            name: dados.nomeUsuario || dados.name || email,
            email: email,
            role: dados.role || "employee",
            position: dados.position || "Funcionário",
          };

          setUser(userData);
          localStorage.setItem("restaurant_user", JSON.stringify(userData));
          setFailedAttempts(0);
          return { success: true, message: "Login realizado com sucesso!" };
        }
      } catch (error) {
        console.warn("API não disponível, usando fallback local", error);
      }

      // FALLBACK: se a API não responder, usa usuários mock (para desenvolvimento)
      let found = MOCK_USERS.find(
        (u) => u.email === email && u.password === password,
      );

      if (!found) {
        const storedUsers = localStorage.getItem("registered_users");
        if (storedUsers) {
          try {
            const additionalUsers = JSON.parse(storedUsers);
            found = additionalUsers.find(
              (u) => u.email === email && u.password === password,
            );
          } catch (e) {
            // Ignorar erro
          }
        }
      }

      if (found) {
        const { password: _, ...userData } = found;
        setUser(userData);
        localStorage.setItem("restaurant_user", JSON.stringify(userData));
        setFailedAttempts(0);
        return {
          success: true,
          message: "Login realizado com sucesso! (Modo offline)",
        };
      }

      // Credenciais inválidas
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
    },
    [failedAttempts, lockedUntil],
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("restaurant_user");
    localStorage.removeItem("authToken");
    logoutAPI();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        failedAttempts,
        lockedUntil,
        registeredUsers,
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
