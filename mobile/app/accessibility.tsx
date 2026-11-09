import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Accessibility, Eye, Type } from "lucide-react-native";
import {
  AccessibilityInfo,
  Alert,
  Linking,
  Platform,
  Text,
  View,
} from "react-native";
import { ActionButton } from "../src/components/ActionButton";
import { AppScreen } from "../src/components/AppScreen";
import { AuthGate } from "../src/components/AuthGate";
import { Message } from "../src/components/Message";
import { Panel } from "../src/components/Panel";
import { colors } from "../src/theme/colors";
import { styles } from "../src/theme/styles";

function AccessibilityContent() {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState<boolean | null>(null);
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        if (active) setScreenReaderEnabled(enabled);
      })
      .catch((error: unknown) => {
        console.error("Não foi possível verificar o leitor de tela.", error);
      });

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderEnabled,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const openDeviceAccessibilitySettings = async () => {
    setSettingsError("");
    if (Platform.OS === "ios") {
      Alert.alert(
        "Ativar o VoiceOver",
        "No iPhone, abra Ajustes > Acessibilidade > VoiceOver e ative o recurso. O iOS não permite que um app altere essa configuração diretamente.",
      );
      return;
    }

    if (Platform.OS === "android") {
      try {
        await Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS");
      } catch (error) {
        console.error("Não foi possível abrir os ajustes de acessibilidade.", error);
        setSettingsError("Não foi possível abrir os ajustes. No aparelho, vá para Configurações > Acessibilidade.");
      }
      return;
    }

    Alert.alert(
      "Acessibilidade do dispositivo",
      "Ative o leitor de tela nas configurações de Acessibilidade do seu dispositivo.",
    );
  };

  return (
    <AppScreen
      title="Acessibilidade"
      subtitle="Opções para facilitar o uso do app com os recursos do seu celular."
      safeArea
    >
      <ActionButton
        title="Voltar"
        variant="secondary"
        onPress={() => router.back()}
        style={{ marginBottom: 12 }}
      />
      <FeaturePanel
        title="Leitores de tela"
        description="Os controles do app têm rótulos acessíveis e funcionam com o TalkBack no Android e o VoiceOver no iPhone."
        icon={<Eye color={colors.primary} size={22} />}
      />
      <FeaturePanel
        title="Tamanho do texto"
        description="O app respeita o tamanho de fonte configurado nos ajustes de acessibilidade do seu dispositivo."
        icon={<Type color={colors.primary} size={22} />}
      />
      <Panel>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <Accessibility color={colors.primary} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Leitor de tela do dispositivo</Text>
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: colors.foreground,
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                marginBottom: 6,
              }}
            >
              {screenReaderEnabled === null
                ? "Verificando status..."
                : screenReaderEnabled
                  ? "Leitor de tela ativado"
                  : "Leitor de tela desativado"}
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {Platform.OS === "ios"
                ? "No iPhone, ative o VoiceOver em Ajustes > Acessibilidade > VoiceOver."
                : "No Android, abra as configurações de Acessibilidade e ative o TalkBack ou o leitor de tela disponível no aparelho."}
            </Text>
          </View>
        </View>
        <ActionButton
          title={Platform.OS === "android" ? "Abrir ajustes de acessibilidade" : "Como ativar o VoiceOver"}
          variant="secondary"
          onPress={() => void openDeviceAccessibilitySettings()}
          style={{ marginTop: 16 }}
        />
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            lineHeight: 19,
            marginTop: 10,
          }}
        >
          O celular exige que você confirme a ativação nas configurações do
          sistema. Você pode voltar a esta tela para consultar estas instruções
          quando precisar.
        </Text>
        {settingsError ? <Message kind="error" text={settingsError} /> : null}
      </Panel>
    </AppScreen>
  );
}

function FeaturePanel({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Panel>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View accessibilityElementsHidden importantForAccessibility="no">
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            {description}
          </Text>
        </View>
      </View>
    </Panel>
  );
}

export default function AccessibilityScreen() {
  return (
    <AuthGate>
      <AccessibilityContent />
    </AuthGate>
  );
}
