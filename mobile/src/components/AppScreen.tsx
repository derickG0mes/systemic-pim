import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react-native";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenKeyboardAware } from "./ScreenKeyboardAware";
import { useTheme } from "../contexts/ThemeContext";

interface AppScreenProps {
  title: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  safeArea?: boolean;
  children: ReactNode;
}

export function AppScreen({
  title,
  subtitle,
  refreshing = false,
  onRefresh,
  safeArea = false,
  children,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, styles } = useTheme();

  return (
    <ScreenKeyboardAware
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16 + (safeArea ? insets.top : 0),
        paddingBottom: 36 + (safeArea ? insets.bottom : 0),
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : undefined
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
        </View>
        {onRefresh ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atualizar dados"
            accessibilityHint="Atualiza o conteúdo desta tela."
            accessibilityState={{ disabled: refreshing, busy: refreshing }}
            disabled={refreshing}
            onPress={onRefresh}
            style={{
              width: 48,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              backgroundColor: colors.secondary,
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw color={colors.secondaryForeground} size={20} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </ScreenKeyboardAware>
  );
}
