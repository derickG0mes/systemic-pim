import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
} from "react-native";

type ScreenKeyboardAwareProps = Pick<
  ScrollViewProps,
  "contentContainerStyle" | "refreshControl" | "style"
> & {
  children: ReactNode;
};

export function ScreenKeyboardAware({
  children,
  contentContainerStyle,
  refreshControl,
  style,
}: ScreenKeyboardAwareProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
