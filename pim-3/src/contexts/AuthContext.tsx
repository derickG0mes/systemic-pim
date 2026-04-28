import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

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
  login: (email: string, password: string) => { success: boolean; message: string };
  logout: () => void;
  isAuthenticated: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: (User & { password: string })[] = [
  { id: "1", name: "Carlos Silva", email: "admin@restaurante.com", password: "admin123", role: "admin", position: "Gerente" },
  { id: "2", name: "Maria Santos", email: "owner@restaurante.com", password: "owner123", role: "owner", position: "Proprietário" },
  { id: "3", name: "João Oliveira", email: "garcom@restaurante.com", password: "garcom123", role: "employee", position: "Garçom" },
  { id: "4", name: "Ana Costa", email: "cozinha@restaurante.com", password: "cozinha123", role: "employee", position: "Cozinheiro" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("restaurant_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const login = useCallback((email: string, password: string) => {
    if (lockedUntil && Date.now() < lockedUntil) {
      const mins = Math.ceil((lockedUntil - Date.now()) / 60000);
      return { success: false, message: `Conta bloqueada. Tente novamente em ${mins} minutos.` };
    }
    if (lockedUntil && Date.now() >= lockedUntil) {
      setLockedUntil(null);
      setFailedAttempts(0);
    }
    const found = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      localStorage.setItem("restaurant_user", JSON.stringify(userData));
      setFailedAttempts(0);
      return { success: true, message: "Login realizado com sucesso!" };
    }
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    if (newAttempts >= 5) {
      const lockTime = Date.now() + 15 * 60 * 1000;
      setLockedUntil(lockTime);
      return { success: false, message: "Muitas tentativas. Conta bloqueada por 15 minutos." };
    }
    return { success: false, message: `Credenciais inválidas. ${5 - newAttempts} tentativas restantes.` };
  }, [failedAttempts, lockedUntil]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("restaurant_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, failedAttempts, lockedUntil }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
