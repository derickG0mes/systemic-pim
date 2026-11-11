import { ActivityIndicator, Text, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="progressbar" style={{ alignItems: "center", paddingVertical: 24 }}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 10 }}>{label}</Text>
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 16 }}>
      {text}
    </Text>
  );
}
