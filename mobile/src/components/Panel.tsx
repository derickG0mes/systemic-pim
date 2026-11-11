import { View, type ViewProps } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export function Panel(props: ViewProps) {
  const { styles } = useTheme();
  return <View {...props} style={[styles.panel, props.style]} />;
}
