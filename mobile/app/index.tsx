import { useEffect } from "react";
import { ActivityIndicator, Text } from "react-native";
import { router } from "expo-router";
import { ActionButton } from "../src/components/ActionButton";
import { useAuth } from "../src/contexts/AuthContext";
import { useTheme } from "../src/contexts/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function IndexRoute() {
  const { user, ready, startupError, retryStartup } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!ready || startupError) return;
    router.replace(
      user ? (user.role === "employee" ? "/(tabs)/tables" : "/(tabs)/dashboard") : "/login",
    );
  }, [ready, startupError, user]);

  if (startupError) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background }}>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: colors.foreground, marginBottom: 8 }}>
          Não foi possível validar a sessão
        </Text>
        <Text accessibilityRole="alert" style={{ fontFamily: "Inter_400Regular", fontSize: 16, color: colors.mutedForeground, marginBottom: 20 }}>
          {startupError}
        </Text>
        <ActionButton title="Tentar novamente" onPress={() => void retryStartup()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
        Validando sessão...
      </Text>
    </SafeAreaView>
  );
}
