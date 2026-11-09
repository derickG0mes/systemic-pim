import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
}

export function ActionButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  style,
}: ActionButtonProps) {
  const backgroundColor =
    variant === "danger" ? colors.destructive : variant === "secondary" ? colors.secondary : colors.primary;
  const textColor = variant === "secondary" ? colors.foreground : colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          borderRadius: 10,
          backgroundColor: disabled ? colors.border : backgroundColor,
          opacity: pressed ? 0.84 : 1,
          flexDirection: "row",
          gap: 8,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : null}
      <Text style={{ color: textColor, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}
