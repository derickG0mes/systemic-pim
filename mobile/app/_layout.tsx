import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/contexts/AuthContext";
import { StartupAccessibilityNotice } from "../src/components/StartupAccessibilityNotice";
import { colors } from "../src/theme/colors";
import { View } from "react-native";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" />
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
    </AuthProvider>
  );
}
