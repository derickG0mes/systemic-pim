import { Link, Stack } from "expo-router";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/contexts/ThemeContext";

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: "Página não encontrada" }} />
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.background }}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 20 }}>
          Esta tela não existe.
        </Text>
        <Link href="/" style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", marginTop: 16 }}>
          Voltar ao início
        </Link>
      </SafeAreaView>
    </>
  );
}
