import { createContext } from "react";
import type { User } from "@/contexts/AuthContext";

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | null>(null);
