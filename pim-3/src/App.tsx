import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import OrdersPage from "@/pages/OrdersPage";
import TabsPage from "@/pages/TabsPage";
import InventoryPage from "@/pages/InventoryPage";
import ReservationsPage from "@/pages/ReservationsPage";
import ReportsPage from "@/pages/ReportsPage";
import UsersPage from "@/pages/UsersPage";
import AuditPage from "@/pages/AuditPage";
import BackupPage from "@/pages/BackupPage";
import NotFound from "@/pages/NotFound";
import { hasPermission } from "@/lib/rbac";

const queryClient = new QueryClient();

function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (permission && user && !hasPermission(user.role, permission as any)) return <Navigate to="/orders" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const defaultRoute = user && hasPermission(user.role, "dashboard") ? "/dashboard" : "/orders";

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={defaultRoute} replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? defaultRoute : "/login"} replace />} />
      <Route path="/dashboard" element={<ProtectedRoute permission="dashboard"><DashboardPage /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute permission="orders"><OrdersPage /></ProtectedRoute>} />
      <Route path="/tabs" element={<ProtectedRoute permission="tabs"><TabsPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute permission="inventory"><InventoryPage /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute permission="reservations"><ReservationsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute permission="reports"><ReportsPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute permission="users"><UsersPage /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute permission="audit"><AuditPage /></ProtectedRoute>} />
      <Route path="/backup" element={<ProtectedRoute permission="backup"><BackupPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RestaurantProvider>
            <AppRoutes />
          </RestaurantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
