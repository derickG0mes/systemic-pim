import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme/colors";

export function AuthGate({ children, managerOnly = false }: { children: ReactNode; managerOnly?: boolean }) {
  const { user, ready, startupError } = useAuth();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
    if (ready && managerOnly && user?.role === "employee") router.replace("/(tabs)/tables");
  }, [managerOnly, ready, user]);

  if (!ready || !user || (managerOnly && user.role === "employee")) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.background }}>
        {startupError ? (
          <Text accessibilityRole="alert" style={{ color: colors.destructive, fontFamily: "Inter_500Medium", fontSize: 15 }}>
            {startupError}
          </Text>
        ) : (
          <ActivityIndicator color={colors.primary} size="large" />
        )}
      </SafeAreaView>
    );
  }

  return children;
}
