import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { LockKeyhole, Mail, UtensilsCrossed } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionButton } from "../src/components/ActionButton";
import { Message } from "../src/components/Message";
import { useAuth } from "../src/contexts/AuthContext";
import { colors } from "../src/theme/colors";
import { styles } from "../src/theme/styles";

export default function LoginScreen() {
  const { login, user, ready, startupError, retryStartup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) router.replace(user.role === "employee" ? "/(tabs)/tables" : "/(tabs)/dashboard");
  }, [user]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.centeredPage}>
        <Text style={styles.bodyText}>Validando sessão...</Text>
      </SafeAreaView>
    );
  }

  if (user) return null;

  const handleLogin = async () => {
    setSubmitting(true);
    setError("");
    try {
      const profile = await login(email.trim(), password);
      router.replace(profile.role === "employee" ? "/(tabs)/tables" : "/(tabs)/dashboard");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Não foi possível entrar.";
      setError(message);
      if (message.includes("429")) {
        Alert.alert("Aguarde antes de tentar novamente", message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.muted }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.loginPage}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginCard}>
            <View style={styles.brandMark}>
              <UtensilsCrossed accessibilityLabel="Ícone de talheres" color={colors.white} size={32} />
            </View>
            <Text style={styles.brandTitle}>Systemic</Text>
            <Text style={styles.brandSubtitle}>Sistema de Gerenciamento</Text>

            {startupError ? (
              <View style={{ marginTop: 14 }}>
                <Message kind="error" text={startupError} />
                <ActionButton title="Tentar validar novamente" onPress={() => void retryStartup()} variant="secondary" />
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>E-mail</Text>
            <View>
              <Mail
                accessibilityLabel="E-mail"
                size={16}
                color={colors.mutedForeground}
                style={{ position: "absolute", left: 12, top: 17, zIndex: 1 }}
              />
              <TextInput
                accessibilityLabel="E-mail"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="E-mail"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                editable={!submitting}
                returnKeyType="next"
                style={[styles.input, { paddingLeft: 40 }]}
              />
            </View>
            <Text style={styles.fieldLabel}>Senha</Text>
            <View>
              <LockKeyhole
                accessibilityLabel="Senha"
                size={16}
                color={colors.mutedForeground}
                style={{ position: "absolute", left: 12, top: 17, zIndex: 1 }}
              />
              <TextInput
                accessibilityLabel="Senha"
                autoComplete="password"
                placeholder="Senha"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!submitting}
                onSubmitEditing={() => void handleLogin()}
                returnKeyType="go"
                style={[styles.input, { paddingLeft: 40 }]}
              />
            </View>
            {error ? <Message kind="error" text={error} /> : null}
            <ActionButton
              title={submitting ? "Entrando..." : "Entrar"}
              onPress={() => void handleLogin()}
              disabled={submitting || !email.trim() || !password}
              loading={submitting}
              style={{ marginTop: 8 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
