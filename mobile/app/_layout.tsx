import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/contexts/AuthContext";
import { ThemeProvider, useTheme } from "../src/contexts/ThemeContext";
import { StartupAccessibilityNotice } from "../src/components/StartupAccessibilityNotice";
import { View } from "react-native";

function AppShell() {
  const { colors, theme, ready } = useTheme();

  if (!ready) return null;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={theme === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
        }}
      />
      <StartupAccessibilityNotice />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
