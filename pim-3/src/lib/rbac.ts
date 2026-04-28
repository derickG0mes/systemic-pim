import { UserRole } from "@/contexts/AuthContext";

type Permission = "dashboard" | "orders" | "tabs" | "inventory" | "reservations" | "reports" | "users" | "audit" | "backup";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  employee: ["orders", "tabs", "reservations"],
  admin: ["dashboard", "orders", "tabs", "inventory", "reservations", "reports", "users", "audit"],
  owner: ["dashboard", "orders", "tabs", "inventory", "reservations", "reports", "users", "audit", "backup"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
