import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Accessibility } from "lucide-react-native";
import { readPreference, writePreference } from "../services/cache";
import { useTheme } from "../contexts/ThemeContext";

const STARTUP_NOTICE_KEY = "accessibility.startup-notice-seen";

export function StartupAccessibilityNotice() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      readPreference<boolean>(STARTUP_NOTICE_KEY),
      AccessibilityInfo.isScreenReaderEnabled(),
    ])
      .then(([noticeSeen, screenReaderEnabled]) => {
        if (active && noticeSeen !== true && !screenReaderEnabled) {
          setVisible(true);
        }
      })
      .catch((reason: unknown) => {
        console.error("Não foi possível verificar o aviso inicial de acessibilidade.", reason);
      });

    return () => {
      active = false;
    };
  }, []);

  const closeNotice = async () => {
    setError("");
    try {
      await writePreference(STARTUP_NOTICE_KEY, true);
      setVisible(false);
    } catch (reason) {
      console.error("Não foi possível salvar a exibição do aviso inicial de acessibilidade.", reason);
      setError("Não foi possível salvar esta preferência. Tente novamente.");
    }
  };

  const openDeviceAccessibilitySettings = async () => {
    setError("");
    try {
      await writePreference(STARTUP_NOTICE_KEY, true);
    } catch (reason) {
      console.error("Não foi possível salvar a exibição do aviso inicial de acessibilidade.", reason);
      setError("Não foi possível salvar esta preferência. Tente novamente.");
      return;
    }

    setVisible(false);
    if (Platform.OS === "android") {
      try {
        await Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS");
      } catch (reason) {
        console.error("Não foi possível abrir os ajustes de acessibilidade.", reason);
        Alert.alert(
          "Acessibilidade",
          "Abra as Configurações do Android, entre em Acessibilidade e procure TalkBack ou o leitor de tela disponível no aparelho.",
        );
      }
    } else {
      Alert.alert(
        "Ativar o VoiceOver",
        "No iPhone, abra Ajustes > Acessibilidade > VoiceOver e ative o recurso.",
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => void closeNotice()}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: colors.overlay,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 440,
            alignSelf: "center",
            padding: 20,
            borderRadius: 16,
            backgroundColor: colors.card,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Accessibility color={colors.primary} size={24} />
            <Text style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 20 }}>
              Dica de acessibilidade
            </Text>
          </View>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 23 }}>
            Você pode usar o leitor de tela do celular para ouvir e navegar
            pelo app. No iPhone, procure VoiceOver em Ajustes &gt; Acessibilidade.
            No Android, abra Acessibilidade nas Configurações e procure TalkBack
            ou o leitor de tela disponível no aparelho. A ativação é feita por
            você nas configurações do sistema.
          </Text>
          {error ? (
            <Text
              accessibilityRole="alert"
              style={{ color: colors.destructive, fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 12 }}
            >
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir os ajustes para ativar o leitor de tela"
            onPress={() => void openDeviceAccessibilitySettings()}
            style={{
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 20,
              paddingHorizontal: 16,
              borderRadius: 10,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              Ativar leitor de tela
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dispensar dica de acessibilidade"
            onPress={() => void closeNotice()}
            style={{
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 4,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              Agora não
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
