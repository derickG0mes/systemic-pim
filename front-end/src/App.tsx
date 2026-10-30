import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import AppLayout from "@/components/AppLayout";
import VLibrasWidget from "@/components/VLibrasWidget";
import { hasPermission } from "@/lib/rbac";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage"));
const TabsPage = lazy(() => import("@/pages/TabsPage"));
const InventoryPage = lazy(() => import("@/pages/InventoryPage"));
const ReservationsPage = lazy(() => import("@/pages/ReservationsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const AuditPage = lazy(() => import("@/pages/AuditPage"));
const BackupPage = lazy(() => import("@/pages/BackupPage"));
const AccessibilityPage = lazy(() => import("@/pages/AccessibilityPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const defaultRoute =
    user && hasPermission(user.role, "dashboard") ? "/dashboard" : "/orders";

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={defaultRoute} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? defaultRoute : "/login"} replace />
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute permission="dashboard">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute permission="orders">
            <OrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tabs"
        element={
          <ProtectedRoute permission="tabs">
            <TabsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute permission="inventory">
            <InventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservations"
        element={
          <ProtectedRoute permission="reservations">
            <ReservationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute permission="reports">
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute permission="users">
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute permission="audit">
            <AuditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backup"
        element={
          <ProtectedRoute permission="backup">
            <BackupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accessibility"
        element={
          <ProtectedRoute permission="accessibility">
            <AccessibilityPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <RestaurantProvider>
            <AccessibilityProvider>
              <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando página...</div>}>
                <AppRoutes />
              </Suspense>
              <VLibrasWidget />
            </AccessibilityProvider>
          </RestaurantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
