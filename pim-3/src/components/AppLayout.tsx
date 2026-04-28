import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { hasPermission } from "@/lib/rbac";
import {
  LayoutDashboard, ShoppingCart, Receipt, Package, CalendarClock,
  BarChart3, Users, FileText, Database, LogOut, UtensilsCrossed, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permission: "dashboard" as const },
  { title: "Pedidos", url: "/orders", icon: ShoppingCart, permission: "orders" as const },
  { title: "Comandas", url: "/tabs", icon: Receipt, permission: "tabs" as const },
  { title: "Estoque", url: "/inventory", icon: Package, permission: "inventory" as const },
  { title: "Reservas", url: "/reservations", icon: CalendarClock, permission: "reservations" as const },
  { title: "Relatórios", url: "/reports", icon: BarChart3, permission: "reports" as const },
  { title: "Usuários", url: "/users", icon: Users, permission: "users" as const },
  { title: "Auditoria", url: "/audit", icon: FileText, permission: "audit" as const },
  { title: "Backup", url: "/backup", icon: Database, permission: "backup" as const },
];

function AppSidebarContent() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const filteredItems = NAV_ITEMS.filter(item => user && hasPermission(user.role, item.permission));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && <span className="font-bold text-sidebar-accent-foreground text-sm">Systemic</span>}
          </div>
        </div>
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="p-3 border-t border-sidebar-border">
          {!collapsed && user && (
            <div className="mb-2 px-2">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground capitalize">{user.role === "employee" ? user.position : user.role}</p>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4 mr-2" />
            {!collapsed && "Sair"}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebarContent />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 shrink-0">
            <SidebarTrigger>
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
