import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { hasPermission, Permission } from "@/lib/rbac";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: Permission;
}

export default function ProtectedRoute({
  children,
  permission,
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (permission && user && !hasPermission(user.role, permission))
    return <Navigate to="/orders" replace />;
  return <AppLayout>{children}</AppLayout>;
}
