import { View, type ViewProps } from "react-native";
import { styles } from "../theme/styles";

export function Panel(props: ViewProps) {
  return <View {...props} style={[styles.panel, props.style]} />;
}
