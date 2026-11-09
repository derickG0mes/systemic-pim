import { Text, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export function Message({ text, kind = "info" }: { text: string; kind?: "error" | "info" | "success" }) {
  const { colors } = useTheme();
  const backgroundColor = kind === "error" ? colors.destructiveSoft : kind === "success" ? colors.successSoft : colors.secondary;
  const color =
    kind === "error"
      ? colors.destructive
      : kind === "success"
        ? colors.success
        : colors.secondaryForeground;

  return (
    <View
      accessibilityRole={kind === "error" ? "alert" : "text"}
      style={{ backgroundColor, borderRadius: 9, padding: 12, marginVertical: 8 }}
    >
      <Text style={{ color, fontFamily: "Inter_500Medium", fontSize: 14 }}>{text}</Text>
    </View>
  );
}
