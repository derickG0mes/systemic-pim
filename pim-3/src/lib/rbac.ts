import { UserRole } from "@/contexts/AuthContext";

type Permission =
  | "dashboard"
  | "orders"
  | "tabs"
  | "inventory"
  | "reservations"
  | "reports"
  | "users"
  | "audit"
  | "backup"
  | "accessibility";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  employee: ["orders", "tabs", "reservations", "accessibility"],
  admin: ["dashboard", "orders", "tabs", "inventory", "reservations", "reports", "users", "audit", "accessibility"],
  owner: ["dashboard", "orders", "tabs", "inventory", "reservations", "reports", "users", "audit", "backup", "accessibility"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
